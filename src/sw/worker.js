// @ts-nocheck
// Service worker body. Concatenated after src/sw/shared.js and after a
// generated `const MANIFEST = …` / `const SW_VERSION = …` header — see
// src/integrations/offline.ts. Never registered from this path; the build
// emits the assembled worker at /sw.js.
//
// Caching model
//   shell  (/_astro/*, icons)   cache-first — every URL is content-hashed
//   pages  (HTML)               stale-while-revalidate, offline page as fallback
//   media  (/images, /subtitles) cache-first
// A deploy changes MANIFEST.buildId; on activate only the entries whose hash
// actually moved are dropped, so "saved for offline" survives a deploy without
// re-downloading the whole site.

const SHELL_CACHE = 'site-shell';
const PAGES_CACHE = 'site-pages';
const MEDIA_CACHE = 'site-media';
const META_CACHE = 'site-meta';
const CONTENT_CACHES = [SHELL_CACHE, PAGES_CACHE, MEDIA_CACHE];
const OWNED_CACHES = [...CONTENT_CACHES, META_CACHE];
const MANIFEST_KEY = '/__offline-manifest__';

const NAVIGATION_TIMEOUT = 4000;
const SYNC_CONCURRENCY = 6;
const PROGRESS_INTERVAL = 250;

// In `astro dev` nothing is content-hashed and Vite rewrites modules on every
// edit, so the worker only ever falls back to the cache — it never prefers it.
const DEV = MANIFEST.mode === 'dev';

let syncInFlight = false;
let syncCancelled = false;

// ------------------------------------------------------------- error reports
//
// SENTRY_CONFIG is injected next to MANIFEST by src/integrations/offline.ts and
// is null unless .env carried a SENTRY_DSN into a production build — the dev
// server never gets one. Reporting from here rather than forwarding to a page
// on purpose: install and activate usually run with no window client attached,
// and those are exactly the failures worth seeing.

const SENTRY = SENTRY_CONFIG ? parseSentryDsn(SENTRY_CONFIG.dsn) : null;

/** A broken deploy must not turn into a few hundred events per reader. */
const REPORT_LIMIT = 12;
const reported = new Set();

const eventId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, '0').slice(0, 32);

/**
 * @param {'error' | 'warning' | 'info'} level
 * @param {{ op: string, error?: unknown, message?: string, extra?: object }} what
 */
function send(level, { op, error, message, extra }) {
  if (!SENTRY || reported.size >= REPORT_LIMIT) return;

  const description = message ?? (error && error.message) ?? String(error);
  const key = `${op}:${description}`;
  if (reported.has(key)) return;
  reported.add(key);

  const event = {
    event_id: eventId(),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level,
    logger: 'service-worker',
    environment: SENTRY_CONFIG.environment,
    release: SENTRY_CONFIG.release || undefined,
    transaction: op,
    tags: { scope: 'offline', runtime: 'service-worker', op, build: MANIFEST.buildId },
    extra: { ...extra, swVersion: MANIFEST.version, online: self.navigator?.onLine },
    request: { url: self.location.href },
  };

  if (error !== undefined) {
    event.exception = sentryException(error);
  } else {
    event.message = { formatted: description };
  }

  // Cross-origin, so the fetch handler above ignores it. A failure to report is
  // swallowed — there is nowhere left to report it to.
  fetch(SENTRY.url, {
    method: 'POST',
    body: sentryEnvelope(event, SENTRY_CONFIG.dsn),
    headers: { 'content-type': 'application/x-sentry-envelope' },
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
}

/** @param {unknown} error @param {string} op @param {object} [extra] */
const captureError = (error, op, extra) => send('error', { op, error, extra });

/** @param {string} message @param {string} op @param {object} [extra] */
const captureWarning = (message, op, extra) => send('warning', { op, message, extra });

self.addEventListener('error', (event) => {
  captureError(event.error ?? new Error(event.message), 'worker.error', {
    filename: event.filename,
    lineno: event.lineno,
  });
});

self.addEventListener('unhandledrejection', (event) => {
  captureError(event.reason, 'worker.unhandledrejection');
});

const cacheNameFor = (kind) =>
  kind === 'shell' ? SHELL_CACHE : kind === 'page' ? PAGES_CACHE : MEDIA_CACHE;

// A page is stored under its normalized path, so /ru/blog/x, /ru/blog/x/ and
// /ru/podcasts/?q=name all hit the same entry.
const cacheKeyFor = (url, kind) => (kind === 'page' ? normalizePath(url.pathname) : url.pathname);

const isCacheable = (response) => response && response.ok && !response.redirected;

/**
 * A write to a cache, with the failure reported rather than swallowed —
 * QuotaExceededError above all, which is otherwise completely silent and turns
 * "saved for offline" into a lie.
 */
const cachePut = (cache, key, response, op, extra) =>
  cache.put(key, response).catch((error) => captureError(error, op, { ...extra, key }));

// ---------------------------------------------------------------- lifecycle

self.addEventListener('install', (event) => {
  event.waitUntil(precacheFallbacks());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await dropUnknownCaches();
        await adoptCurrentBuild();
      } catch (error) {
        // A worker that cannot adopt the new build serves stale pages for as
        // long as it lives — worth an event even though it still claims.
        captureError(error, 'activate', { buildId: MANIFEST.buildId });
      }
      await self.clients.claim();
    })(),
  );
});

// The offline page of every locale — the one thing that must never be the
// missing piece. Everything else arrives through runtime caching or a sync.
async function precacheFallbacks() {
  const cache = await caches.open(PAGES_CACHE);
  await Promise.all(
    MANIFEST.langs.map((lang) =>
      storeUrl(cache, offlinePagePath(lang)).catch((error) => {
        // The fallback page failing to precache is the one failure that leaves
        // a reader with a blank screen instead of a graceful offline page.
        captureError(error, 'precache', { lang, url: offlinePagePath(lang) });
      }),
    ),
  );
}

async function dropUnknownCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('site-') && !OWNED_CACHES.includes(name))
      .map((name) => caches.delete(name)),
  );
}

async function adoptCurrentBuild() {
  const meta = await caches.open(META_CACHE);
  const stored = await meta.match(MANIFEST_KEY);
  const previous = stored ? await stored.json().catch(() => null) : null;

  if (previous && previous.version !== MANIFEST.version) {
    // The worker's own caching rules changed — nothing stored under the old
    // ones can be trusted.
    await Promise.all(CONTENT_CACHES.map((name) => caches.delete(name)));
    await precacheFallbacks();
  } else if (!previous || previous.buildId !== MANIFEST.buildId) {
    const stale = staleUrls(previous, MANIFEST);
    if (stale.length > 0) {
      const opened = await Promise.all(CONTENT_CACHES.map((name) => caches.open(name)));
      await Promise.all(
        stale.flatMap((url) => opened.map((cache) => cache.delete(url, { ignoreSearch: true }))),
      );
    }
  }

  await meta.put(
    MANIFEST_KEY,
    new Response(JSON.stringify(MANIFEST), {
      headers: { 'content-type': 'application/json' },
    }),
  );
}

// -------------------------------------------------------------------- fetch

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The calculator is a separate PWA with its own worker scoped to /cc/.
  if (url.pathname.startsWith('/cc/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (DEV) return;

  const kind = classifyAsset(url.pathname);
  if (kind === 'skip') return;
  event.respondWith(handleAsset(event, url, kind));
});

async function handleNavigation(event) {
  const url = new URL(event.request.url);
  const key = normalizePath(url.pathname);

  try {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(key);

    if (cached && !DEV) {
      event.waitUntil(refresh(cache, key, event.request));
      return cached;
    }

    const response = await fetchWithTimeout(event.request, NAVIGATION_TIMEOUT);
    if (isCacheable(response)) {
      event.waitUntil(cachePut(cache, key, response.clone(), 'navigate.put'));
    }
    return response;
  } catch {
    // Not reported: a failed navigation while offline is the normal path, and
    // the fallback below is what the whole worker exists for.
    return offlineFallback(url);
  }
}

async function handleAsset(event, url, kind) {
  const cache = await caches.open(cacheNameFor(kind));
  const key = cacheKeyFor(url, kind);
  const cached = await cache.match(key);
  if (cached) return cached;

  try {
    const response = await fetch(event.request);
    if (isCacheable(response)) {
      event.waitUntil(cachePut(cache, key, response.clone(), 'asset.put', { kind }));
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function refresh(cache, key, request) {
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT);
    if (isCacheable(response)) await cachePut(cache, key, response, 'revalidate.put');
  } catch {
    // Offline, or the page vanished — the cached copy stays.
  }
}

async function offlineFallback(url) {
  const cache = await caches.open(PAGES_CACHE);
  const lang = langFromPath(url.pathname, MANIFEST.langs) ?? MANIFEST.langs[0];
  const page =
    (await cache.match(offlinePagePath(lang))) ?? (await cache.match(offlinePagePath('en')));
  if (page) return page;

  // Install precaches every locale's offline page, so getting here means one of
  // them is gone — the reader is looking at a bare "You are offline" string.
  captureWarning('offline fallback page missing from cache', 'offline-fallback', {
    lang,
    path: url.pathname,
  });

  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline.</p>',
    { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

// Raced rather than aborted on purpose: `fetch(request, init)` re-constructs
// the Request, which downgrades a navigation request's mode and redirect
// handling. Losing the race only means the cached copy wins.
function fetchWithTimeout(request, timeout) {
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('offline: network timed out')), timeout);
  });
  return Promise.race([fetch(request), expired]).finally(() => clearTimeout(timer));
}

// ----------------------------------------------------------------- messages

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;

  // Whatever a command throws would otherwise vanish into a waitUntil: the
  // button in the header would simply stop responding, with nothing logged.
  const run = (op, promise) =>
    event.waitUntil(promise.catch((error) => captureError(error, op, { lang: data.lang })));

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'OFFLINE_STATUS':
      run('status', reportStatus(data.lang));
      break;
    case 'OFFLINE_SAVE':
      run('save', sync(data.lang));
      break;
    case 'OFFLINE_CANCEL':
      syncCancelled = true;
      break;
    case 'OFFLINE_PURGE':
      run('purge', purge(data.lang));
      break;
  }
});

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) client.postMessage(message);
}

async function cachedPaths() {
  const paths = new Set();
  for (const name of CONTENT_CACHES) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) paths.add(new URL(request.url).pathname);
  }
  return paths;
}

async function reportStatus(lang) {
  const { entries, bytes } = planSync(MANIFEST, lang);
  const present = await cachedPaths();
  const savedEntries = entries.filter((entry) => present.has(entry.url));
  const savedBytes = savedEntries.reduce((total, entry) => total + entry.size, 0);

  await broadcast({
    type: 'OFFLINE_STATUS',
    lang,
    buildId: MANIFEST.buildId,
    total: entries.length,
    saved: savedEntries.length,
    totalBytes: bytes,
    savedBytes,
    complete: savedEntries.length === entries.length,
    syncing: syncInFlight,
  });
}

async function sync(lang) {
  if (syncInFlight) return;
  syncInFlight = true;
  syncCancelled = false;

  const { entries, bytes } = planSync(MANIFEST, lang);
  const present = await cachedPaths();
  const missing = entries.filter((entry) => !present.has(entry.url));

  let saved = entries.length - missing.length;
  let savedBytes = entries
    .filter((entry) => present.has(entry.url))
    .reduce((total, entry) => total + entry.size, 0);
  let failed = 0;
  let lastReport = 0;

  const report = async (phase) => {
    lastReport = Date.now();
    await broadcast({
      type: 'OFFLINE_SYNC',
      phase,
      lang,
      saved,
      total: entries.length,
      savedBytes,
      totalBytes: bytes,
      failed,
    });
  };

  await report('start');

  // One event carries the first failure with its cause; the summary below
  // carries how bad it got. Reporting every failed URL would mean hundreds of
  // identical events from a reader who went offline mid-save.
  let firstFailure = null;

  try {
    await runPool(
      missing.map((entry) => async () => {
        if (syncCancelled) return;
        const cache = await caches.open(cacheNameFor(classifyAsset(entry.url)));
        try {
          await storeUrl(cache, entry.url);
          saved += 1;
          savedBytes += entry.size;
        } catch (error) {
          failed += 1;
          if (!firstFailure) firstFailure = { error, url: entry.url };
        }
        if (Date.now() - lastReport >= PROGRESS_INTERVAL) await report('progress');
      }),
      SYNC_CONCURRENCY,
    );
  } finally {
    syncInFlight = false;
  }

  if (failed > 0 && !syncCancelled) {
    captureError(firstFailure.error, 'save.entry', { url: firstFailure.url, lang });
    captureWarning(`offline save incomplete: ${failed} of ${missing.length} failed`, 'save', {
      lang,
      failed,
      saved,
      missing: missing.length,
      total: entries.length,
      online: self.navigator?.onLine,
    });
  }

  await report(syncCancelled ? 'cancelled' : failed > 0 ? 'partial' : 'done');
  await reportStatus(lang);
}

async function purge(lang) {
  await Promise.all([caches.delete(PAGES_CACHE), caches.delete(MEDIA_CACHE)]);
  await precacheFallbacks();
  await reportStatus(lang);
}

async function storeUrl(cache, url) {
  const response = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
  if (!isCacheable(response)) throw new Error(`offline: cannot cache ${url}`);
  await cache.put(url, response);
}

async function runPool(tasks, limit) {
  let index = 0;
  const worker = async () => {
    while (index < tasks.length) {
      const task = tasks[index];
      index += 1;
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

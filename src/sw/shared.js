// Helpers shared by the service worker (src/sw/worker.js) and the Astro
// integration that generates it (src/integrations/offline.ts).
//
// IMPORTANT: this file is concatenated into `dist/sw.js` ahead of worker.js,
// with the leading `export ` of every declaration stripped. Therefore:
//   * only `export const` / `export function` declarations are allowed here —
//     no `export { … }` blocks, no `export default`, no `import`;
//   * the build asserts that, so a mistake fails `just build` immediately.
// Keep it dependency-free and side-effect-free.

/** @typedef {{ url: string, hash: string, size: number }} ManifestEntry */
/**
 * @typedef {{
 *   buildId: string,
 *   mode: 'prod' | 'dev',
 *   langs: string[],
 *   shell: ManifestEntry[],
 *   pages: ManifestEntry[],
 *   media: ManifestEntry[],
 * }} OfflineManifest
 */

/**
 * The one URL shape used as a cache key, so `/ru/blog/x`, `/ru/blog/x/` and a
 * link carrying `?q=…` all resolve to the same cached page.
 * @param {string} pathname
 * @returns {string}
 */
export const normalizePath = (pathname) => {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path.endsWith('/')) return path;
  const last = path.slice(path.lastIndexOf('/') + 1);
  return last.includes('.') ? path : `${path}/`;
};

/**
 * Locale a page belongs to, or null for the pages shared by every locale
 * (`/`, `/404.html`, `/subtitles/`, `/yaml/`).
 * @param {string} pathname
 * @param {string[]} langs
 * @returns {string | null}
 */
export const langFromPath = (pathname, langs) => {
  const segment = normalizePath(pathname).split('/')[1] ?? '';
  return langs.includes(segment) ? segment : null;
};

/**
 * Build-output path (relative to dist/, POSIX separators) → the URL it is
 * served at. `ru/blog/x/index.html` → `/ru/blog/x/`, `404.html` → `/404.html`.
 * @param {string} relativePath
 * @returns {string}
 */
export const fileToUrl = (relativePath) => {
  const url = `/${relativePath.replace(/^\/+/, '')}`;
  return url.endsWith('/index.html') ? url.slice(0, -'index.html'.length) : url;
};

/**
 * Which cache a URL belongs in — the same rules decide what the build puts in
 * the manifest and how the worker treats a runtime request.
 * @param {string} url
 * @returns {'shell' | 'page' | 'media' | 'skip'}
 */
export const classifyAsset = (url) => {
  // The calculator is a separate PWA with its own worker scoped to /cc/.
  if (url.startsWith('/cc/')) return 'skip';
  if (url === '/sw.js' || url === '/robots.txt' || url.startsWith('/sitemap')) return 'skip';
  if (url.endsWith('.DS_Store')) return 'skip';
  // Published for Sentry, never for readers — and large enough to matter to
  // someone saving the site over mobile data.
  if (url.endsWith('.map')) return 'skip';
  if (url.startsWith('/_astro/')) return 'shell';
  if (
    url === '/manifest.webmanifest' ||
    url === '/favicon.svg' ||
    url === '/favicon.ico' ||
    url === '/favicon-96x96.png' ||
    url === '/apple-touch-icon.png' ||
    url.startsWith('/icons/')
  ) {
    return 'shell';
  }
  // Checked before /subtitles/, which is both a page and a directory of files.
  if (url.endsWith('/') || url.endsWith('.html')) return 'page';
  if (url.startsWith('/images/') || url.startsWith('/subtitles/')) return 'media';
  return 'skip';
};

/**
 * Every entry of a manifest, in precache order.
 * @param {OfflineManifest} manifest
 * @returns {ManifestEntry[]}
 */
export const allEntries = (manifest) => [...manifest.shell, ...manifest.pages, ...manifest.media];

/**
 * The offline fallback page of a locale. Precached for every locale so the
 * fallback itself is never the thing that is missing.
 * @param {string} lang
 * @returns {string}
 */
export const offlinePagePath = (lang) => `/${lang}/offline/`;

/**
 * What "save the whole site" means for one locale: the shell, the media and
 * the pages of that locale plus the ones shared by all locales.
 * @param {OfflineManifest} manifest
 * @param {string} lang
 * @returns {{ entries: ManifestEntry[], bytes: number }}
 */
export const planSync = (manifest, lang) => {
  const pages = manifest.pages.filter((entry) => {
    const pageLang = langFromPath(entry.url, manifest.langs);
    return pageLang === null || pageLang === lang;
  });
  const entries = [...manifest.shell, ...pages, ...manifest.media];
  return { entries, bytes: entries.reduce((total, entry) => total + entry.size, 0) };
};

/**
 * URLs whose content changed (or that disappeared) between two builds — the
 * exact set to drop from the caches so a deploy doesn't re-download the rest.
 * @param {OfflineManifest | null | undefined} previous
 * @param {OfflineManifest} next
 * @returns {string[]}
 */
export const staleUrls = (previous, next) => {
  if (!previous) return [];
  const fresh = new Map(allEntries(next).map((entry) => [entry.url, entry.hash]));
  return allEntries(previous)
    .filter((entry) => fresh.get(entry.url) !== entry.hash)
    .map((entry) => entry.url);
};

// ------------------------------------------------------------------- Sentry
//
// The worker cannot use @sentry/browser: it is a classic script assembled by
// concatenation, so there is nothing to `import` from. These four helpers are
// the whole reporter — enough to send an exception with a readable stack. The
// pages use the real SDK (src/lib/sentry.ts); only the worker uses this.

/**
 * DSN → the envelope endpoint to POST to. Returns null for anything unusable
 * (missing, still `change-me`, no public key), which is how reporting stays
 * off when .env carries no DSN.
 * @param {string | null | undefined} dsn
 * @returns {{ url: string, publicKey: string, projectId: string } | null}
 */
export const parseSentryDsn = (dsn) => {
  if (typeof dsn !== 'string') return null;
  const match = /^(https?):\/\/([^:@/]+)(?::[^@/]*)?@([^/]+)(\/.*)$/.exec(dsn.trim());
  if (!match) return null;

  const [, protocol, publicKey, host, path] = match;
  const segments = path.split('/').filter(Boolean);
  const projectId = segments.pop();
  if (!projectId) return null;

  const prefix = segments.length > 0 ? `/${segments.join('/')}` : '';
  return {
    url: `${protocol}://${host}${prefix}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`,
    publicKey,
    projectId,
  };
};

/** `at fn (url:line:col)` — V8. */
const V8_FRAME = /^\s*at\s+(?:async\s+)?(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/;
/** `fn@url:line:col` — Firefox and Safari. */
const SPIDERMONKEY_FRAME = /^(.*?)@(.+?):(\d+):(\d+)$/;

/**
 * Stack string → Sentry frames, oldest call first (the order Sentry renders
 * bottom-up). Lines it cannot read — the leading `Error: message`, native
 * frames — are dropped rather than guessed at.
 * @param {string | undefined} stack
 * @returns {{ filename: string, function: string, lineno: number, colno: number, in_app: boolean }[]}
 */
export const sentryStackFrames = (stack) => {
  if (typeof stack !== 'string') return [];

  const frames = [];
  for (const line of stack.split('\n')) {
    const match = V8_FRAME.exec(line) ?? SPIDERMONKEY_FRAME.exec(line);
    if (!match) continue;
    frames.push({
      filename: match[2],
      function: match[1] || '?',
      lineno: Number(match[3]),
      colno: Number(match[4]),
      in_app: true,
    });
  }
  return frames.reverse();
};

/**
 * Anything thrown → a Sentry `exception` payload. A rejected promise often
 * carries a string or a DOMException rather than an Error, so this never
 * assumes more than `name`/`message`/`stack`.
 * @param {unknown} error
 * @returns {{ values: object[] }}
 */
export const sentryException = (error) => {
  const object = typeof error === 'object' && error !== null ? /** @type {any} */ (error) : null;
  const frames = sentryStackFrames(object?.stack);

  return {
    values: [
      {
        type: (typeof object?.name === 'string' && object.name) || 'Error',
        value: typeof object?.message === 'string' ? object.message : String(error),
        stacktrace: frames.length > 0 ? { frames } : undefined,
        mechanism: { type: 'generic', handled: false },
      },
    ],
  };
};

/**
 * The newline-separated envelope body Sentry's ingest endpoint expects:
 * envelope header, item header, event.
 * @param {{ event_id?: string }} event
 * @param {string} dsn
 * @returns {string}
 */
export const sentryEnvelope = (event, dsn) =>
  [
    JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');

/**
 * Human-readable size, localized without needing a translation string.
 * @param {number} bytes
 * @param {string} [locale]
 * @returns {string}
 */
export const formatBytes = (bytes, locale = 'en') => {
  const megabytes = bytes / 1048576;
  const useMegabytes = megabytes >= 1;
  const value = useMegabytes ? megabytes : bytes / 1024;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: useMegabytes ? 'megabyte' : 'kilobyte',
      unitDisplay: 'short',
      maximumFractionDigits: value >= 10 ? 0 : 1,
    }).format(value);
  } catch {
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${useMegabytes ? 'MB' : 'KB'}`;
  }
};

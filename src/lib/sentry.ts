// Sentry for the pages. Configuration is baked in at build time from .env by
// `vite.define` in astro.config.mjs — see the comment there. `sentryEnabled` is
// a build-time constant, so with no DSN the boot scripts are never rendered
// (BaseLayout.astro) and nothing here ever runs.
//
// The SDK itself (~30 KB gzipped) is loaded lazily, on idle: a text-first blog
// should not spend its first seconds downloading a reporter. Errors thrown
// before it arrives are not lost — a tiny inline script in <head> buffers them
// into `window.__sentryEarly` and this module replays the queue once the SDK is
// up. Everything that touches @sentry/browser lives in ./sentry.boot.ts, which
// is the only thing imported dynamically.
//
// The service worker reports separately and does not use this module: it is a
// classic script with nothing to import from (see src/sw/worker.js).

/** Item pushed by the inline buffer in BaseLayout.astro, or by this module. */
export type ReportItem =
  | { kind: 'error'; error?: unknown; message?: string; filename?: string; lineno?: number; colno?: number }
  | { kind: 'rejection'; reason: unknown }
  | { kind: 'offline'; op: string; error?: unknown; message?: string; extra?: Record<string, unknown> };

declare global {
  interface Window {
    /** An array until the SDK is up, then a sink forwarding straight to it. */
    __sentryEarly?: { push(item: ReportItem): unknown };
    /** Removes the inline buffer's listeners once the SDK owns them. */
    __sentryEarlyStop?: () => void;
  }
}

export const sentryEnabled: boolean = import.meta.env.PROD && __SENTRY_DSN__ !== '';

/** How long the SDK may wait for an idle moment before loading anyway. */
const IDLE_TIMEOUT = 3000;

type Boot = typeof import('./sentry.boot');

let boot: Boot | null = null;
let loading: Promise<Boot | null> | null = null;

const load = (): Promise<Boot | null> => {
  if (!sentryEnabled) return Promise.resolve(null);

  loading ??= import('./sentry.boot')
    .then((module) => {
      module.startSentry();
      boot = module;
      // The SDK's own global handlers are installed now; two sets of listeners
      // would report everything twice.
      window.__sentryEarlyStop?.();
      window.__sentryEarly = { push: (item: ReportItem) => report(item) };
      return module;
    })
    .catch(() => null);

  return loading;
};

const report = (item: ReportItem): void => {
  if (boot) {
    boot.report(item);
    return;
  }
  void load().then((module) => module?.report(item));
};

/**
 * Anything that went wrong in the offline machinery — a registration that
 * failed, a save that came back incomplete, a worker command that threw. Safe
 * to call before the SDK has loaded; the event is queued.
 */
export const captureOffline = (
  op: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void => {
  if (!sentryEnabled) return;
  report({ kind: 'offline', op, error, extra });
};

/** The same, for a problem that has no exception behind it. */
export const warnOffline = (
  op: string,
  message: string,
  extra?: Record<string, unknown>,
): void => {
  if (!sentryEnabled) return;
  report({ kind: 'offline', op, message, extra });
};

/** Called once per page by the boot script in BaseLayout.astro. */
export const bootSentry = (): void => {
  if (!sentryEnabled) return;

  const queued = window.__sentryEarly;
  const buffered: ReportItem[] = Array.isArray(queued) ? queued : [];

  const start = () => {
    void load().then((module) => {
      if (!module) return;
      // Same array the inline buffer is still writing into up to the moment
      // `load()` swapped it out, so nothing in that window is missed.
      for (const item of buffered) module.report(item);
    });
  };

  // Something already broke — no reason to wait for an idle moment.
  if (buffered.length > 0) {
    start();
    return;
  }

  // Safari only got requestIdleCallback in 17; the timeout is the fallback.
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT });
    return;
  }
  window.setTimeout(start, IDLE_TIMEOUT);
};

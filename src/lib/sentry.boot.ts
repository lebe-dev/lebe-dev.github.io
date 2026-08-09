// The half of the Sentry setup that actually pulls the SDK in. Split from
// sentry.ts so it can be the target of a single dynamic import, and — more
// importantly — so the SDK is reached through *static named imports*: a
// namespace import (`import('@sentry/browser').then((m) => m.init(…))`) keeps
// the whole namespace object alive and ships replay, feedback and tracing along
// with it, five times the bytes for code this site never calls.

import {
  captureException,
  captureMessage,
  init,
  makeBrowserOfflineTransport,
  makeFetchTransport,
} from '@sentry/browser';
import type { ReportItem } from './sentry';

export const startSentry = (): void => {
  init({
    dsn: __SENTRY_DSN__,
    environment: __SENTRY_ENVIRONMENT__,
    release: __SENTRY_RELEASE__ || undefined,
    sendDefaultPii: false,
    // The whole point of this site's service worker is that people read it
    // offline — and an error that happens offline is exactly the one worth
    // seeing. This transport parks events in IndexedDB and sends them once the
    // connection is back, instead of dropping them on the floor.
    transport: makeBrowserOfflineTransport(makeFetchTransport),
    ignoreErrors: [
      // Browser noise, not the site's doing.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome(?:-extension)?:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-(?:web-)?extension:\/\//i,
      /googletagmanager\.com/,
    ],
  });
};

export const report = (item: ReportItem): void => {
  if (item.kind === 'rejection') {
    captureException(item.reason, { tags: { buffered: 'true' } });
    return;
  }

  if (item.kind === 'error') {
    captureException(item.error ?? new Error(item.message ?? 'Unknown error'), {
      tags: { buffered: 'true' },
      extra: { filename: item.filename, lineno: item.lineno, colno: item.colno },
    });
    return;
  }

  const context = {
    tags: { scope: 'offline', op: item.op },
    extra: { ...item.extra, online: navigator.onLine },
  };

  if (item.error !== undefined) {
    captureException(item.error, { ...context, level: 'error' });
    return;
  }
  captureMessage(item.message ?? item.op, { ...context, level: 'warning' });
};

/// <reference types="astro/client" />

// Baked in by `vite.define` in astro.config.mjs from .env (see the comment
// there). `__SENTRY_DSN__` is an empty string whenever reporting is off.
declare const __SENTRY_DSN__: string;
declare const __SENTRY_ENVIRONMENT__: string;
declare const __SENTRY_RELEASE__: string;

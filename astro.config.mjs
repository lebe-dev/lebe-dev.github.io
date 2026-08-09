import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';
import { rehypePromptBlocks } from './src/lib/rehypePromptBlocks.ts';
import { offline } from './src/integrations/offline.ts';
import { parseSentryDsn } from './src/sw/shared.js';

// Sentry is configured entirely from .env (gitignored; see .env.example) and
// baked into the bundle at build time — the site is static, so there is nothing
// to read at runtime. No .env, or no SENTRY_DSN in it, means no reporting at
// all: the DSN inlines as an empty string, the boot scripts are not rendered
// and the worker's reporter stays switched off. The third prefix argument is
// empty on purpose — these names carry no PUBLIC_ prefix, so `import.meta.env`
// would never expose them. A DSN is a write-only key; shipping it is expected.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
// Validated rather than merely non-empty, so the `change-me` placeholder of
// .env.example disables reporting instead of half-enabling it: the worker
// parses the DSN the same way and would otherwise disagree with the pages.
const SENTRY_DSN = parseSentryDsn(env.SENTRY_DSN) ? env.SENTRY_DSN.trim() : '';
const SENTRY_ENVIRONMENT = env.SENTRY_ENVIRONMENT?.trim() || 'production';

// Ties an event to a deploy. Missing git (a tarball checkout) is not worth
// failing a build over — Sentry treats an empty release as "unknown".
const gitRevision = () => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const SENTRY_RELEASE = SENTRY_DSN ? gitRevision() : '';

export default defineConfig({
  markdown: {
    shikiConfig: {
      // `prompt` isn't a real grammar — alias it to plaintext so Shiki
      // doesn't fall back and overwrite `data-language` before our
      // rehype plugin can see the original fence language.
      langAlias: { prompt: 'plaintext' },
    },
    rehypePlugins: [rehypePromptBlocks],
  },
  server: { port: 4200, host: true },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __SENTRY_DSN__: JSON.stringify(SENTRY_DSN),
      __SENTRY_ENVIRONMENT__: JSON.stringify(SENTRY_ENVIRONMENT),
      __SENTRY_RELEASE__: JSON.stringify(SENTRY_RELEASE),
    },
    // Published alongside the bundle so Sentry fetches them itself over
    // sourceMappingURL — no auth token, no upload step. Only worth the extra
    // files when something is actually going to read them.
    // Astro reads the client build's sourcemap flag from here specifically, not
    // from `vite.build.sourcemap` (core/build/vite-build-config.js).
    environments: { client: { build: { sourcemap: Boolean(SENTRY_DSN) } } },
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      },
    },
    server: { allowedHosts: ['test.home'] },
  },
  site: 'https://lebe-dev.github.io',
  base: '/',
  trailingSlash: 'ignore',
  redirects: {
    '/cc': '/cc/index.html',
  },
  i18n: {
    locales: ['en', 'ru', 'es', 'zh', 'ja', 'fr', 'de'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
    fallback: { ru: 'en', es: 'en', zh: 'en', ja: 'en', fr: 'en', de: 'en' },
  },
  integrations: [sitemap({
    // The offline fallback is a service-worker utility page, not content.
    filter: (page) => !page.includes('/offline/'),
    i18n: {
      defaultLocale: 'en',
      locales: { en: 'en', ru: 'ru', es: 'es', zh: 'zh', ja: 'ja', fr: 'fr', de: 'de' },
    },
  }), svelte(), offline({
    sentry: { dsn: SENTRY_DSN, environment: SENTRY_ENVIRONMENT, release: SENTRY_RELEASE },
  })],
});
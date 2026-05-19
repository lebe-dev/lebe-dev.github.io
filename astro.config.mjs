import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import svelte from '@astrojs/svelte';

export default defineConfig({
  server: { port: 4200, host: true },
  vite: { server: { allowedHosts: ['test.home'] } },
  site: 'https://lebe-dev.github.io',
  base: '/',
  trailingSlash: 'ignore',
  redirects: {
    '/cc': '/cc/index.html',
  },
  i18n: {
    locales: ['en', 'ru'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
    fallback: { ru: 'en' },
  },
  integrations: [sitemap({
    i18n: {
      defaultLocale: 'en',
      locales: { en: 'en', ru: 'ru' },
    },
  }), svelte()],
});
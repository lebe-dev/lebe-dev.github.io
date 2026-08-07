import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';
import { rehypePromptBlocks } from './src/lib/rehypePromptBlocks.ts';

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
    i18n: {
      defaultLocale: 'en',
      locales: { en: 'en', ru: 'ru', es: 'es', zh: 'zh', ja: 'ja', fr: 'fr', de: 'de' },
    },
  }), svelte()],
});
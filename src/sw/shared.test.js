import { describe, expect, it } from 'vitest';
import {
  allEntries,
  classifyAsset,
  fileToUrl,
  formatBytes,
  langFromPath,
  normalizePath,
  offlinePagePath,
  planSync,
  staleUrls,
} from './shared.js';
import { languages } from '../i18n/ui';

const LANGS = ['en', 'ru', 'es', 'zh', 'ja', 'fr', 'de'];

const entry = (url, hash = 'h', size = 100) => ({ url, hash, size });

const manifest = (overrides = {}) => ({
  buildId: 'build-1',
  mode: 'prod',
  langs: LANGS,
  shell: [entry('/_astro/a.css', 'css1', 1000)],
  pages: [entry('/', 'root', 10), entry('/ru/', 'ru', 20), entry('/en/', 'en', 30)],
  media: [entry('/images/x.png', 'img', 500)],
  ...overrides,
});

describe('normalizePath', () => {
  it('adds a trailing slash to extension-less paths', () => {
    expect(normalizePath('/ru/blog/post')).toBe('/ru/blog/post/');
  });

  it('leaves already-normalized paths alone', () => {
    expect(normalizePath('/ru/blog/post/')).toBe('/ru/blog/post/');
    expect(normalizePath('/')).toBe('/');
  });

  it('leaves file paths alone', () => {
    expect(normalizePath('/404.html')).toBe('/404.html');
    expect(normalizePath('/_astro/app.BxYz.js')).toBe('/_astro/app.BxYz.js');
  });

  it('tolerates a missing leading slash', () => {
    expect(normalizePath('ru/blog')).toBe('/ru/blog/');
  });
});

describe('langFromPath', () => {
  it('reads the locale from the first segment', () => {
    expect(langFromPath('/ru/podcasts/x/', LANGS)).toBe('ru');
    expect(langFromPath('/de/blog/', LANGS)).toBe('de');
  });

  it('returns null for pages shared by every locale', () => {
    expect(langFromPath('/', LANGS)).toBeNull();
    expect(langFromPath('/404.html', LANGS)).toBeNull();
    expect(langFromPath('/subtitles/', LANGS)).toBeNull();
    expect(langFromPath('/yaml/', LANGS)).toBeNull();
  });

  it('does not mistake a lookalike segment for a locale', () => {
    expect(langFromPath('/env/', LANGS)).toBeNull();
  });

  it('covers exactly the locales the site is built for', () => {
    expect(LANGS.slice().sort()).toEqual(Object.keys(languages).sort());
  });
});

describe('fileToUrl', () => {
  it('maps directory indexes to their URL', () => {
    expect(fileToUrl('index.html')).toBe('/');
    expect(fileToUrl('ru/index.html')).toBe('/ru/');
    expect(fileToUrl('ru/podcasts/deconstructing-yourself-1/index.html')).toBe(
      '/ru/podcasts/deconstructing-yourself-1/',
    );
  });

  it('keeps standalone files as they are', () => {
    expect(fileToUrl('404.html')).toBe('/404.html');
    expect(fileToUrl('images/banner.png')).toBe('/images/banner.png');
  });
});

describe('classifyAsset', () => {
  it('skips the calculator, which ships its own worker', () => {
    expect(classifyAsset('/cc/')).toBe('skip');
    expect(classifyAsset('/cc/js/app.js')).toBe('skip');
  });

  it('skips the worker itself and crawler files', () => {
    expect(classifyAsset('/sw.js')).toBe('skip');
    expect(classifyAsset('/robots.txt')).toBe('skip');
    expect(classifyAsset('/sitemap-0.xml')).toBe('skip');
    expect(classifyAsset('/sitemap-index.xml')).toBe('skip');
  });

  it('treats hashed build output and icons as shell', () => {
    expect(classifyAsset('/_astro/BaseLayout.rWrYtRVS.css')).toBe('shell');
    expect(classifyAsset('/_astro/inter-cyrillic-wght-normal.DqGufNeO.woff2')).toBe('shell');
    expect(classifyAsset('/favicon.svg')).toBe('shell');
    expect(classifyAsset('/manifest.webmanifest')).toBe('shell');
  });

  it('treats HTML output as pages', () => {
    expect(classifyAsset('/ru/')).toBe('page');
    expect(classifyAsset('/404.html')).toBe('page');
  });

  it('classifies /subtitles/ as a page but its files as media', () => {
    expect(classifyAsset('/subtitles/')).toBe('page');
    expect(classifyAsset('/subtitles/some-film.ru.srt')).toBe('media');
  });

  it('classifies images as media', () => {
    expect(classifyAsset('/images/blog-light-banner.png')).toBe('media');
  });

  it('skips feeds and anything unrecognised', () => {
    expect(classifyAsset('/ru/rss.xml')).toBe('skip');
    expect(classifyAsset('/something.txt')).toBe('skip');
  });
});

describe('offlinePagePath', () => {
  it('points at the locale fallback page', () => {
    expect(offlinePagePath('ru')).toBe('/ru/offline/');
  });
});

describe('planSync', () => {
  it('keeps the shell, the media, the locale and the shared pages', () => {
    const { entries, bytes } = planSync(manifest(), 'ru');
    expect(entries.map((e) => e.url)).toEqual([
      '/_astro/a.css',
      '/',
      '/ru/',
      '/images/x.png',
    ]);
    expect(bytes).toBe(1000 + 10 + 20 + 500);
  });

  it('excludes the other locales', () => {
    const urls = planSync(manifest(), 'de').entries.map((e) => e.url);
    expect(urls).not.toContain('/ru/');
    expect(urls).not.toContain('/en/');
  });
});

describe('staleUrls', () => {
  it('is empty on a first install', () => {
    expect(staleUrls(null, manifest())).toEqual([]);
  });

  it('reports only what changed or disappeared', () => {
    const previous = manifest();
    const next = manifest({
      pages: [entry('/', 'root', 10), entry('/ru/', 'ru-CHANGED', 20)],
    });
    expect(staleUrls(previous, next).sort()).toEqual(['/en/', '/ru/']);
  });

  it('reports nothing when a build only adds pages', () => {
    const previous = manifest();
    const next = manifest({ pages: [...manifest().pages, entry('/fr/', 'fr', 40)] });
    expect(staleUrls(previous, next)).toEqual([]);
  });
});

describe('allEntries', () => {
  it('walks every bucket', () => {
    expect(allEntries(manifest())).toHaveLength(5);
  });
});

describe('formatBytes', () => {
  it('uses megabytes above 1 MB', () => {
    expect(formatBytes(9_600_000, 'en')).toBe('9.2 MB');
  });

  it('localizes the unit', () => {
    expect(formatBytes(9_600_000, 'ru')).toMatch(/МБ/);
  });

  it('uses kilobytes below 1 MB', () => {
    expect(formatBytes(200_000, 'en')).toBe('195 kB');
  });

  it('drops the fraction for large values', () => {
    expect(formatBytes(64 * 1048576, 'en')).toBe('64 MB');
  });
});

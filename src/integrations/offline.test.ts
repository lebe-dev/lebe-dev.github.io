import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assembleWorker, buildManifest, stripExports, type OfflineManifest } from './offline';

const LANGS = ['en', 'ru'];
const SW_DIR = fileURLToPath(new URL('../sw/', import.meta.url));

const emptyManifest = (): OfflineManifest => ({
  buildId: 'test',
  version: 1,
  mode: 'prod',
  langs: LANGS,
  shell: [],
  pages: [],
  media: [],
});

describe('stripExports', () => {
  it('turns module declarations into plain ones', () => {
    expect(stripExports('export const a = 1;\nexport function b() {}\n')).toBe(
      'const a = 1;\nfunction b() {}\n',
    );
  });

  it('refuses an import the worker could not run', () => {
    expect(() => stripExports("import { x } from './x.js';\n")).toThrow(/cannot inline/);
  });

  it('refuses an export block, which leaves a bare `{ … }` behind', () => {
    expect(() => stripExports('const a = 1;\nexport { a };\n')).toThrow(/cannot inline/);
  });
});

describe('assembleWorker', () => {
  // The worker ships as a classic script built by concatenating two ES modules,
  // so the real sources — not fixtures — are what needs to keep compiling.
  let shared = '';
  let worker = '';
  let output = '';

  beforeAll(async () => {
    [shared, worker] = await Promise.all([
      readFile(path.join(SW_DIR, 'shared.js'), 'utf8'),
      readFile(path.join(SW_DIR, 'worker.js'), 'utf8'),
    ]);
    output = assembleWorker(shared, worker, emptyManifest());
  });

  it('compiles as a classic script', () => {
    expect(() => new vm.Script(output)).not.toThrow();
  });

  it('leaves no module syntax behind', () => {
    expect(output).not.toMatch(/^\s*(?:import|export)\b/m);
  });

  it('injects the manifest the worker reads', () => {
    expect(output).toMatch(/^const MANIFEST = \{/m);
    expect(worker).toContain('MANIFEST.buildId');
  });

  it('keeps the helpers the worker calls', () => {
    for (const helper of ['normalizePath', 'classifyAsset', 'planSync', 'staleUrls']) {
      expect(output).toContain(`const ${helper} = `);
      expect(worker).toContain(helper);
    }
  });

  // No .env, no SENTRY_DSN, or `astro dev` — all three arrive here as no config
  // at all, and the worker must then report nothing.
  it('switches error reporting off when no Sentry config is passed', () => {
    expect(output).toMatch(/^const SENTRY_CONFIG = null;$/m);
    expect(worker).toContain('SENTRY_CONFIG ? parseSentryDsn(SENTRY_CONFIG.dsn) : null');
  });

  it('injects the Sentry config when there is one, and still compiles', () => {
    const withSentry = assembleWorker(shared, worker, emptyManifest(), {
      dsn: 'https://key@o1.ingest.sentry.io/2',
      environment: 'production',
      release: 'abc1234',
    });

    expect(withSentry).toMatch(/^const SENTRY_CONFIG = \{"dsn":"https:\/\/key@/m);
    expect(() => new vm.Script(withSentry)).not.toThrow();
    for (const helper of ['parseSentryDsn', 'sentryException', 'sentryEnvelope']) {
      expect(withSentry).toContain(`const ${helper} = `);
    }
  });
});

describe('buildManifest', () => {
  let outDir = '';

  const write = async (relative: string, contents: string) => {
    const file = path.join(outDir, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents, 'utf8');
  };

  beforeAll(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), 'offline-manifest-'));
    await write('index.html', '<html>root</html>');
    await write('404.html', '<html>404</html>');
    await write('ru/index.html', '<html>ru</html>');
    await write('ru/blog/post/index.html', '<html>post</html>');
    await write('_astro/app.abc123.css', 'body{}');
    await write('images/banner.png', 'png-bytes');
    await write('subtitles/index.html', '<html>subtitles</html>');
    await write('subtitles/film.ru.srt', '1\n00:00:01,000 --> 00:00:02,000\n');
    await write('cc/index.html', '<html>calculator</html>');
    await write('cc/js/app.js', 'console.log(1)');
    await write('robots.txt', 'User-agent: *');
    await write('sitemap-0.xml', '<urlset/>');
    await write('ru/rss.xml', '<rss/>');
  });

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it('sorts the build output into the three caches', async () => {
    const manifest = await buildManifest(outDir, LANGS);
    expect(manifest.shell.map((e) => e.url)).toEqual(['/_astro/app.abc123.css']);
    expect(manifest.pages.map((e) => e.url)).toEqual([
      '/',
      '/404.html',
      '/ru/',
      '/ru/blog/post/',
      '/subtitles/',
    ]);
    expect(manifest.media.map((e) => e.url)).toEqual([
      '/images/banner.png',
      '/subtitles/film.ru.srt',
    ]);
  });

  it('leaves the calculator, feeds and crawler files out', async () => {
    const manifest = await buildManifest(outDir, LANGS);
    const urls = [...manifest.shell, ...manifest.pages, ...manifest.media].map((e) => e.url);
    expect(urls.some((url) => url.startsWith('/cc/'))).toBe(false);
    expect(urls).not.toContain('/robots.txt');
    expect(urls).not.toContain('/sitemap-0.xml');
    expect(urls).not.toContain('/ru/rss.xml');
  });

  it('records a real size for every entry', async () => {
    const manifest = await buildManifest(outDir, LANGS);
    const entries = [...manifest.shell, ...manifest.pages, ...manifest.media];
    expect(entries.every((entry) => entry.size > 0 && entry.hash.length > 0)).toBe(true);
  });

  it('keeps the build id stable until a file changes', async () => {
    const before = await buildManifest(outDir, LANGS);
    expect((await buildManifest(outDir, LANGS)).buildId).toBe(before.buildId);

    await write('ru/index.html', '<html>ru edited</html>');
    const after = await buildManifest(outDir, LANGS);
    expect(after.buildId).not.toBe(before.buildId);

    // …and only that page counts as stale, so a deploy does not force a
    // full re-download of everything already saved.
    const changed = after.pages.filter((entry) => {
      const previous = before.pages.find((old) => old.url === entry.url);
      return previous?.hash !== entry.hash;
    });
    expect(changed.map((entry) => entry.url)).toEqual(['/ru/']);
  });
});

import { describe, it, expect } from 'vitest';
import { isLang, getLangFromUrl, useTranslations, localePath, getReadingStats, formatDate } from './utils';
import { ui, defaultLang } from './ui';

describe('isLang', () => {
  it('accepts known language codes', () => {
    expect(isLang('en')).toBe(true);
    expect(isLang('ru')).toBe(true);
  });

  it('rejects unknown codes', () => {
    expect(isLang('xx')).toBe(false);
  });
});

describe('getLangFromUrl', () => {
  it('extracts the language segment from the path', () => {
    expect(getLangFromUrl(new URL('https://example.com/ru/blog/post'))).toBe('ru');
  });

  it('falls back to the default language for unknown segments', () => {
    expect(getLangFromUrl(new URL('https://example.com/cc/'))).toBe(defaultLang);
  });

  it('falls back to the default language for the root path', () => {
    expect(getLangFromUrl(new URL('https://example.com/'))).toBe(defaultLang);
  });
});

describe('useTranslations', () => {
  it('returns the translation for the requested language', () => {
    const t = useTranslations('ru');
    expect(t('nav.blog')).toBe(ui.ru['nav.blog']);
  });

  it('returns the default language translation for the default language', () => {
    const t = useTranslations(defaultLang);
    expect(t('nav.blog')).toBe(ui[defaultLang]['nav.blog']);
  });
});

describe('localePath', () => {
  it('builds a root path for an empty segment', () => {
    expect(localePath('en')).toBe('/en/');
    expect(localePath('en', '')).toBe('/en/');
  });

  it('trims leading and trailing slashes from the path', () => {
    expect(localePath('ru', '/blog/post/')).toBe('/ru/blog/post');
  });

  it('handles paths without slashes', () => {
    expect(localePath('ru', 'blog')).toBe('/ru/blog');
  });
});

describe('getReadingStats', () => {
  it('strips code blocks, links and markdown punctuation before counting', () => {
    const body = '# Title\n\nSome **bold** text with a [link](https://x.com) and `code`.\n\n```js\nconst x = 1;\n```';
    const stats = getReadingStats(body);
    expect(stats.chars).toBeGreaterThan(0);
    expect(stats.chars).toBeLessThan(body.length);
  });

  it('rounds reading time to the nearest minute with a minimum of 1', () => {
    expect(getReadingStats('short text').minutes).toBe(1);
    expect(getReadingStats('a'.repeat(1200 * 5)).minutes).toBe(5);
  });
});

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(formatDate(new Date('2026-01-02T23:00:00Z'))).toBe('2026-01-02');
  });
});

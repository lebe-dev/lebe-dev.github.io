import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatDurationSpoken,
  formatDateRu,
  formatDateSpoken,
  toDateAttr,
  titleLang,
  buildAltTitles,
} from './subtitles';

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration('01:48:39')).toBe('1 ч 49 мин');
    expect(formatDuration('01:37:21')).toBe('1 ч 37 мин');
  });

  it('drops the hours part when there are none', () => {
    expect(formatDuration('00:45:12')).toBe('45 мин');
  });

  it('drops the minutes part on a whole number of hours', () => {
    expect(formatDuration('02:00:00')).toBe('2 ч');
  });

  it('rolls seconds up into the next hour', () => {
    expect(formatDuration('01:59:45')).toBe('2 ч');
  });

  it('returns the input unchanged when it is not HH:MM:SS', () => {
    expect(formatDuration('1h 48m')).toBe('1h 48m');
    expect(formatDuration('01:75:00')).toBe('01:75:00');
    expect(formatDuration('00:00:20')).toBe('00:00:20');
  });
});

describe('formatDurationSpoken', () => {
  it('spells out hours and minutes', () => {
    expect(formatDurationSpoken('01:48:39')).toBe('1 час 49 минут');
    expect(formatDurationSpoken('02:22:00')).toBe('2 часа 22 минуты');
    expect(formatDurationSpoken('05:01:00')).toBe('5 часов 1 минута');
  });

  it('uses the many-form for the 11–14 exception', () => {
    expect(formatDurationSpoken('11:13:00')).toBe('11 часов 13 минут');
  });

  it('omits empty parts', () => {
    expect(formatDurationSpoken('02:00:00')).toBe('2 часа');
    expect(formatDurationSpoken('00:45:12')).toBe('45 минут');
  });

  it('returns the input unchanged when it is not HH:MM:SS', () => {
    expect(formatDurationSpoken('1h 48m')).toBe('1h 48m');
  });
});

describe('formatDateRu', () => {
  it('formats a date as DD.MM.YYYY in UTC', () => {
    expect(formatDateRu(new Date('2026-08-02'))).toBe('02.08.2026');
    expect(formatDateRu(new Date('2026-01-02T23:00:00Z'))).toBe('02.01.2026');
  });
});

describe('formatDateSpoken', () => {
  it('spells the date out in Russian', () => {
    expect(formatDateSpoken(new Date('2026-08-02'))).toBe('2 августа 2026 года');
    expect(formatDateSpoken(new Date('2026-01-31'))).toBe('31 января 2026 года');
  });
});

describe('toDateAttr', () => {
  it('returns the ISO calendar date', () => {
    expect(toDateAttr(new Date('2026-08-02'))).toBe('2026-08-02');
  });
});

describe('titleLang', () => {
  it('detects a Russian title by its script', () => {
    expect(titleLang('Дядюшка Бунми', 'th')).toBe('ru');
  });

  it('uses the source language for Latin-script originals', () => {
    expect(titleLang('Stille Freundin', 'de')).toBe('de');
  });

  it('marks non-Latin originals as transliterated', () => {
    expect(titleLang('Lung Boonmee Raluek Chat', 'th')).toBe('th-Latn');
    expect(titleLang('Sen to Chihiro no Kamikakushi', 'ja')).toBe('ja-Latn');
  });
});

describe('buildAltTitles', () => {
  it('keeps the native title first, then the English one, each tagged with its language', () => {
    expect(
      buildAltTitles({
        title: 'Дядюшка Бунми',
        originalTitle: 'Lung Boonmee Raluek Chat',
        englishTitle: 'Uncle Boonmee Who Can Recall His Past Lives',
        originalLang: 'th',
      }),
    ).toEqual([
      { text: 'Lung Boonmee Raluek Chat', lang: 'th-Latn' },
      { text: 'Uncle Boonmee Who Can Recall His Past Lives', lang: 'en' },
    ]);
  });

  it('skips alternatives equal to the main title', () => {
    expect(
      buildAltTitles({ title: 'Stille Freundin', originalTitle: 'stille freundin', originalLang: 'de' }),
    ).toEqual([]);
  });

  it('skips missing and blank alternatives', () => {
    expect(
      buildAltTitles({ title: 'Stille Freundin', englishTitle: 'Silent Friend', originalLang: 'de' }),
    ).toEqual([{ text: 'Silent Friend', lang: 'en' }]);
    expect(buildAltTitles({ title: 'X', originalTitle: '  ', originalLang: 'de' })).toEqual([]);
  });

  it('de-duplicates identical native and English titles', () => {
    expect(
      buildAltTitles({ title: 'X', originalTitle: 'Silent Friend', englishTitle: 'Silent Friend', originalLang: 'en' }),
    ).toEqual([{ text: 'Silent Friend', lang: 'en' }]);
  });
});

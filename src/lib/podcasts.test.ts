import { describe, expect, it } from 'vitest';
import {
  availableLangs,
  formatTimecode,
  getTranscript,
  listEpisodes,
  originalUrl,
  preferredLang,
  segmentId,
  timecodeToSeconds,
  transcriptDuration,
} from './podcasts';

describe('timecodeToSeconds', () => {
  it('parses HH:MM:SS', () => {
    expect(timecodeToSeconds('00:00:00')).toBe(0);
    expect(timecodeToSeconds('00:01:52')).toBe(112);
    expect(timecodeToSeconds('01:02:03')).toBe(3723);
  });

  it('returns null for anything that is not a timecode', () => {
    expect(timecodeToSeconds('1:52')).toBeNull();
    expect(timecodeToSeconds('00:99:00')).toBeNull();
    expect(timecodeToSeconds('')).toBeNull();
  });
});

describe('formatTimecode', () => {
  it('drops the hour when the episode is under an hour', () => {
    expect(formatTimecode('00:00:00')).toBe('0:00');
    expect(formatTimecode('00:01:52')).toBe('1:52');
    expect(formatTimecode('00:53:43')).toBe('53:43');
  });

  it('keeps the hour and pads the minutes past the hour mark', () => {
    expect(formatTimecode('01:02:03')).toBe('1:02:03');
    expect(formatTimecode('02:00:09')).toBe('2:00:09');
  });

  it('returns malformed input unchanged', () => {
    expect(formatTimecode('later')).toBe('later');
  });
});

describe('segmentId', () => {
  it('turns a timecode into a usable anchor', () => {
    expect(segmentId('00:01:52')).toBe('t-00-01-52');
  });
});

describe('preferredLang', () => {
  it('prefers the site locale when that transcript exists', () => {
    expect(preferredLang('ru', ['en', 'ru'])).toBe('ru');
    expect(preferredLang('en', ['en', 'ru'])).toBe('en');
  });

  it('falls back to English for locales with no transcript of their own', () => {
    expect(preferredLang('de', ['en', 'ru'])).toBe('en');
    expect(preferredLang('ja', ['en', 'ru'])).toBe('en');
  });

  it('falls back to the only transcript there is', () => {
    expect(preferredLang('de', ['ru'])).toBe('ru');
    expect(preferredLang('ru', ['ru'])).toBe('ru');
  });

  it('returns undefined when there is nothing to show', () => {
    expect(preferredLang('ru', [])).toBeUndefined();
  });
});

describe('transcript files', () => {
  const slug = 'deconstructing-yourself-114';

  it('finds both languages of the sample episode', () => {
    expect(availableLangs(slug)).toEqual(['en', 'ru']);
  });

  it('keeps the two languages segment-aligned', () => {
    const en = getTranscript(slug, 'en')!.transcript;
    const ru = getTranscript(slug, 'ru')!.transcript;
    expect(ru).toHaveLength(en.length);
    expect(ru.map((s) => s.start)).toEqual(en.map((s) => s.start));
  });

  it('reads the duration off the last segment', () => {
    expect(transcriptDuration(getTranscript(slug, 'en')!)).toBe('00:53:43');
  });

  it('takes the link to the original from the transcripts', () => {
    expect(originalUrl(slug, ['en', 'ru'])).toBe(getTranscript(slug, 'en')!.url);
  });

  it('lets podcasts.ts override the link, and gives up when there is none', () => {
    expect(originalUrl(slug, ['en'], 'https://example.com/ep')).toBe('https://example.com/ep');
    expect(originalUrl('nope', ['en'])).toBeUndefined();
  });

  it('leaves the glossary optional, and well-formed where it exists', () => {
    expect(getTranscript(slug, 'en')!.glossary).toBeUndefined();

    const withGlossary = getTranscript('deconstructing-yourself-112', 'ru')!.glossary!;
    expect(withGlossary.length).toBeGreaterThan(0);
    for (const entry of withGlossary) {
      expect(entry.term).toBeTruthy();
      expect(entry.definition).toBeTruthy();
    }
  });

  it('ignores unknown slugs and languages', () => {
    expect(getTranscript('nope', 'en')).toBeUndefined();
    expect(availableLangs('nope')).toEqual([]);
  });
});

describe('listEpisodes', () => {
  it('titles each episode in the language the locale will see', () => {
    const [ru] = listEpisodes('ru');
    const [de] = listEpisodes('de');
    expect(ru.titleLang).toBe('ru');
    expect(de.titleLang).toBe('en');
    expect(ru.title).not.toBe(de.title);
  });

  it('carries the guest through from the transcript', () => {
    const [first] = listEpisodes('ru');
    expect(first.guest).toBe(getTranscript(first.slug, 'ru')!.guest);
    expect(first.guest).toBeTruthy();
  });

  it('sorts newest addition first', () => {
    const dates = listEpisodes('en').map((e) => e.dateAdded);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('breaks a dateAdded tie by the episode release date, newest first', () => {
    const keys = listEpisodes('en').map((e) => `${e.dateAdded} ${e.publishedAt ?? ''}`);
    expect([...keys].sort().reverse()).toEqual(keys);
  });
});

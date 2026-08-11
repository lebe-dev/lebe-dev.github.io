import { describe, expect, it } from 'vitest';
import {
  MAX_ENTRIES,
  READ_THRESHOLD,
  STORE_VERSION,
  emptyStore,
  formatPercent,
  getProgress,
  isRead,
  parseStore,
  podcastTarget,
  postTarget,
  prune,
  scrollOffsetFor,
  scrollRatio,
  serializeStore,
  setProgress,
  setRead,
  shouldResume,
} from './readingProgress';

const post = postTarget('translate-podcasts-with-llm');
const NOW = 1_700_000_000_000;

describe('targets', () => {
  it('keys a post by its translation key, so every language shares one state', () => {
    expect(postTarget('hello-world')).toEqual({
      progressId: 'post:hello-world',
      readId: 'post:hello-world',
    });
  });

  it('keys a podcast position per transcript language but "read" per episode', () => {
    const ru = podcastTarget('dy-112', 'ru');
    const en = podcastTarget('dy-112', 'en');
    expect(ru.progressId).not.toBe(en.progressId);
    expect(ru.readId).toBe(en.readId);
  });
});

describe('parseStore', () => {
  it('reads back what serializeStore wrote', () => {
    const store = setProgress(emptyStore(), post, 0.4, NOW);
    expect(parseStore(serializeStore(store))).toEqual(store);
  });

  it('falls back to empty on missing, broken or foreign-version data', () => {
    expect(parseStore(null)).toEqual(emptyStore());
    expect(parseStore('')).toEqual(emptyStore());
    expect(parseStore('{not json')).toEqual(emptyStore());
    expect(parseStore('"a string"')).toEqual(emptyStore());
    expect(parseStore(JSON.stringify({ v: STORE_VERSION + 1, items: {} }))).toEqual(emptyStore());
    expect(parseStore(JSON.stringify({ v: STORE_VERSION }))).toEqual(emptyStore());
  });

  it('drops malformed entries and clamps the surviving ones', () => {
    const raw = JSON.stringify({
      v: STORE_VERSION,
      items: {
        good: { p: 1.7, read: false, at: NOW },
        noRead: { p: 0.5, at: NOW },
        nan: { p: Number.NaN, read: true, at: NOW },
        notAnObject: 7,
      },
    });
    expect(parseStore(raw).items).toEqual({ good: { p: 1, read: false, at: NOW } });
  });
});

describe('setProgress', () => {
  it('stores a clamped position', () => {
    expect(getProgress(setProgress(emptyStore(), post, 0.42, NOW), post)).toBe(0.42);
    expect(getProgress(setProgress(emptyStore(), post, -3, NOW), post)).toBe(0);
    expect(getProgress(setProgress(emptyStore(), post, 12, NOW), post)).toBe(1);
  });

  it('marks read once the threshold is reached', () => {
    expect(isRead(setProgress(emptyStore(), post, READ_THRESHOLD - 0.01, NOW), post)).toBe(false);
    expect(isRead(setProgress(emptyStore(), post, READ_THRESHOLD, NOW), post)).toBe(true);
  });

  it('marks the whole episode read from any transcript language', () => {
    const ru = podcastTarget('dy-112', 'ru');
    const en = podcastTarget('dy-112', 'en');
    const store = setProgress(emptyStore(), ru, 1, NOW);
    expect(isRead(store, en)).toBe(true);
    // The other language's position is untouched — it is a different text.
    expect(getProgress(store, en)).toBe(0);
  });

  it('does not un-read content when the reader scrolls back up', () => {
    let store = setProgress(emptyStore(), post, 1, NOW);
    store = setProgress(store, post, 0.2, NOW + 1000);
    expect(isRead(store, post)).toBe(true);
    expect(getProgress(store, post)).toBe(0.2);
  });

  it('does not touch unrelated entries', () => {
    const other = postTarget('hello-world');
    let store = setProgress(emptyStore(), other, 0.3, NOW);
    store = setProgress(store, post, 0.9, NOW + 1000);
    expect(getProgress(store, other)).toBe(0.3);
  });
});

describe('setRead', () => {
  it('completes the position when marking read', () => {
    const store = setRead(emptyStore(), post, true, NOW);
    expect(isRead(store, post)).toBe(true);
    expect(getProgress(store, post)).toBe(1);
  });

  it('resets the position when unmarking, so nothing offers to resume at the end', () => {
    const store = setRead(setRead(emptyStore(), post, true, NOW), post, false, NOW + 1000);
    expect(isRead(store, post)).toBe(false);
    expect(getProgress(store, post)).toBe(0);
  });
});

describe('prune', () => {
  it('keeps the store untouched below the cap', () => {
    const store = setProgress(emptyStore(), post, 0.5, NOW);
    expect(prune(store)).toBe(store);
  });

  it('drops the least recently touched entries past the cap', () => {
    let store = emptyStore();
    for (let i = 0; i < 5; i += 1) {
      store = setProgress(store, postTarget(`p${i}`), 0.5, NOW + i * 1000);
    }
    expect(Object.keys(prune(store, 3).items).sort()).toEqual(['post:p2', 'post:p3', 'post:p4']);
  });

  it('defaults to MAX_ENTRIES', () => {
    let store = emptyStore();
    for (let i = 0; i < MAX_ENTRIES + 10; i += 1) {
      store = setProgress(store, postTarget(`p${i}`), 0.5, NOW + i);
    }
    expect(Object.keys(prune(store).items)).toHaveLength(MAX_ENTRIES);
  });
});

describe('scrollRatio', () => {
  const geometry = { scrollY: 0, viewportHeight: 800, contentTop: 200, contentHeight: 2800 };

  it('is 0 at the top of the content', () => {
    expect(scrollRatio({ ...geometry, scrollY: 200 })).toBe(0);
  });

  it('is 1 once the end of the content reaches the bottom of the viewport', () => {
    expect(scrollRatio({ ...geometry, scrollY: 2200 })).toBe(1);
  });

  it('is 0.5 halfway through', () => {
    expect(scrollRatio({ ...geometry, scrollY: 1200 })).toBe(0.5);
  });

  it('treats content shorter than the viewport as fully read', () => {
    expect(scrollRatio({ ...geometry, contentHeight: 300 })).toBe(1);
  });

  it('clamps above the content and past its end', () => {
    expect(scrollRatio({ ...geometry, scrollY: 0 })).toBe(0);
    expect(scrollRatio({ ...geometry, scrollY: 99_999 })).toBe(1);
  });
});

describe('scrollOffsetFor', () => {
  const geometry = { scrollY: 0, viewportHeight: 800, contentTop: 200, contentHeight: 2800 };

  it('inverts scrollRatio', () => {
    for (const p of [0, 0.25, 0.5, 1]) {
      const scrollY = scrollOffsetFor(p, geometry);
      expect(scrollRatio({ ...geometry, scrollY })).toBeCloseTo(p, 10);
    }
  });

  it('lands on the content itself when it is shorter than the viewport', () => {
    expect(scrollOffsetFor(0.5, { ...geometry, contentHeight: 300 })).toBe(200);
  });
});

describe('shouldResume', () => {
  it('offers to resume only from an unfinished middle', () => {
    expect(shouldResume(0, false)).toBe(false);
    expect(shouldResume(0.01, false)).toBe(false);
    expect(shouldResume(0.45, false)).toBe(true);
    expect(shouldResume(READ_THRESHOLD, false)).toBe(false);
    expect(shouldResume(0.45, true)).toBe(false);
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percent and clamps', () => {
    expect(formatPercent(0.454)).toBe('45%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(2)).toBe('100%');
    expect(formatPercent(Number.NaN)).toBe('0%');
  });
});

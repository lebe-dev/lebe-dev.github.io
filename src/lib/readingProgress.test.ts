import { describe, expect, it } from 'vitest';
import {
  MAX_ENTRIES,
  READ_THRESHOLD,
  STORE_VERSION,
  bookChapterTarget,
  completion,
  emptyStore,
  looseBoolean,
  looseNumber,
  parseStoreCompat,
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

  it('keys a book chapter by the book and the chapter, position and read alike', () => {
    expect(bookChapterTarget('mctb2', '7')).toEqual({
      progressId: 'book:mctb2:7',
      readId: 'book:mctb2:7',
    });
  });

  it('keeps a chapter apart from the same number in another book', () => {
    expect(bookChapterTarget('mctb2', '7').readId).not.toBe(
      bookChapterTarget('other', '7').readId,
    );
  });
});

describe('completion', () => {
  const chapters = ['book:b:1', 'book:b:2', 'book:b:3', 'book:b:4'];
  const readAll = (ids: string[]) =>
    ids.reduce(
      (store, id) => setRead(store, { progressId: id, readId: id }, true, NOW),
      emptyStore(),
    );

  it('counts nothing in an untouched store', () => {
    expect(completion(emptyStore(), chapters)).toEqual({
      total: 4,
      read: 0,
      ratio: 0,
      done: false,
    });
  });

  it('counts the parts that are read', () => {
    expect(completion(readAll(chapters.slice(0, 3)), chapters)).toEqual({
      total: 4,
      read: 3,
      ratio: 0.75,
      done: false,
    });
  });

  it('is done only when every part is read', () => {
    expect(completion(readAll(chapters), chapters).done).toBe(true);
  });

  it('does not count a part that was merely started', () => {
    const store = setProgress(
      emptyStore(),
      { progressId: chapters[0], readId: chapters[0] },
      0.5,
      NOW,
    );
    expect(completion(store, chapters).read).toBe(0);
  });

  it('ignores parts of other content in the same store', () => {
    const store = setRead(readAll(chapters.slice(0, 1)), post, true, NOW);
    expect(completion(store, chapters).read).toBe(1);
  });

  it('is not done when there is nothing to read', () => {
    expect(completion(emptyStore(), [])).toEqual({
      total: 0,
      read: 0,
      ratio: 0,
      done: false,
    });
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

describe('looseNumber', () => {
  it('takes a number, or something that plainly stands for one', () => {
    expect(looseNumber(0)).toBe(0);
    expect(looseNumber(-3.5)).toBe(-3.5);
    expect(looseNumber('0.5')).toBe(0.5);
    expect(looseNumber('  700  ')).toBe(700);
    expect(looseNumber('-1e3')).toBe(-1000);
  });

  it('rejects everything else', () => {
    expect(looseNumber(Number.NaN)).toBeNull();
    expect(looseNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(looseNumber('')).toBeNull();
    expect(looseNumber('   ')).toBeNull();
    expect(looseNumber('later')).toBeNull();
    expect(looseNumber(true)).toBeNull();
    expect(looseNumber(null)).toBeNull();
    expect(looseNumber(undefined)).toBeNull();
    expect(looseNumber({})).toBeNull();
  });
});

describe('looseBoolean', () => {
  it('takes a boolean, or the 0/1 and "true"/"false" an older format used', () => {
    expect(looseBoolean(true)).toBe(true);
    expect(looseBoolean(false)).toBe(false);
    expect(looseBoolean(1)).toBe(true);
    expect(looseBoolean(0)).toBe(false);
    expect(looseBoolean('TRUE')).toBe(true);
    expect(looseBoolean(' 1 ')).toBe(true);
    expect(looseBoolean('yes')).toBe(true);
    expect(looseBoolean('false')).toBe(false);
    expect(looseBoolean('0')).toBe(false);
    expect(looseBoolean('no')).toBe(false);
    // An empty string is what a cleared flag looks like, not an unknown value.
    expect(looseBoolean('')).toBe(false);
  });

  it('rejects everything else', () => {
    expect(looseBoolean('maybe')).toBeNull();
    expect(looseBoolean(Number.NaN)).toBeNull();
    expect(looseBoolean(null)).toBeNull();
    expect(looseBoolean(undefined)).toBeNull();
    expect(looseBoolean({})).toBeNull();
  });
});

describe('parseStoreCompat', () => {
  it('reads back what serializeStore wrote', () => {
    const store = setProgress(emptyStore(), post, 0.4, NOW);
    expect(parseStoreCompat(serializeStore(store))).toEqual(store);
  });

  it('accepts a store of any version, unlike the strict parse', () => {
    const foreign = JSON.stringify({
      v: STORE_VERSION + 7,
      items: { 'post:a': { p: 0.5, read: false, at: NOW } },
    });

    expect(parseStore(foreign)).toEqual(emptyStore());
    expect(parseStoreCompat(foreign).items['post:a']).toEqual({ p: 0.5, read: false, at: NOW });
  });

  it('accepts a store with no version at all', () => {
    const raw = JSON.stringify({ items: { 'post:a': { p: 0.5, read: false, at: NOW } } });
    expect(parseStoreCompat(raw).items['post:a'].p).toBe(0.5);
  });

  it('accepts a bare map of entries, without the wrapper', () => {
    const raw = JSON.stringify({ 'post:a': { p: 0.5, read: false, at: NOW } });
    expect(parseStoreCompat(raw).items['post:a'].p).toBe(0.5);
  });

  it('always reports the current store version', () => {
    const raw = JSON.stringify({ v: 99, items: {} });
    expect(parseStoreCompat(raw).v).toBe(STORE_VERSION);
  });

  it('fills in the fields an older format may not have had', () => {
    const raw = JSON.stringify({
      items: {
        onlyPosition: { p: 0.25 },
        onlyRead: { read: true },
        onlyUnread: { read: false },
        noTimestamp: { p: 0.6, read: false },
      },
    });

    expect(parseStoreCompat(raw).items).toEqual({
      onlyPosition: { p: 0.25, read: false, at: 0 },
      // Read but no position: finished, so the position is the end.
      onlyRead: { p: 1, read: true, at: 0 },
      onlyUnread: { p: 0, read: false, at: 0 },
      noTimestamp: { p: 0.6, read: false, at: 0 },
    });
  });

  it('coerces and clamps the values it does find', () => {
    const raw = JSON.stringify({
      items: {
        strings: { p: '0.5', read: 'true', at: '700' },
        numbers: { p: 1.7, read: 1, at: -5 },
        low: { p: -2, read: 0, at: NOW },
      },
    });

    expect(parseStoreCompat(raw).items).toEqual({
      strings: { p: 0.5, read: true, at: 700 },
      numbers: { p: 1, read: true, at: 0 },
      low: { p: 0, read: false, at: NOW },
    });
  });

  it('drops entries there is nothing to salvage from', () => {
    const raw = JSON.stringify({
      items: {
        good: { p: 0.5, read: false, at: NOW },
        // A timestamp says nothing about whether anything was read.
        timestampOnly: { at: NOW },
        empty: {},
        unreadableFields: { p: 'soon', read: 'maybe' },
        notAnObject: 7,
        aString: 'nope',
        nullish: null,
        anArray: [1, 2],
      },
    });

    expect(Object.keys(parseStoreCompat(raw).items)).toEqual(['good']);
  });

  it('ignores the wrapper own fields when reading a bare map', () => {
    // `{ v, items }` where `items` is not an object: `v` is not an entry.
    const raw = JSON.stringify({ v: 1, items: 'broken', 'post:a': { p: 0.3 } });
    expect(Object.keys(parseStoreCompat(raw).items)).toEqual(['post:a']);
  });

  it('falls back to empty on anything that is not a store', () => {
    expect(parseStoreCompat(null)).toEqual(emptyStore());
    expect(parseStoreCompat(undefined)).toEqual(emptyStore());
    expect(parseStoreCompat('')).toEqual(emptyStore());
    expect(parseStoreCompat('{not json')).toEqual(emptyStore());
    expect(parseStoreCompat('"a string"')).toEqual(emptyStore());
    expect(parseStoreCompat('42')).toEqual(emptyStore());
    expect(parseStoreCompat('[{"p":1}]')).toEqual(emptyStore());
    expect(parseStoreCompat(JSON.stringify({ v: STORE_VERSION }))).toEqual(emptyStore());
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

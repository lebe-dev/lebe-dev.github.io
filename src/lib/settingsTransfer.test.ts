import { describe, expect, it } from 'vitest';
import {
  READING_KEY,
  SETTING_VALIDATORS,
  TRANSFER_VERSION,
  TRANSFERABLE_KEYS,
  buildSnapshot,
  decodeSnapshot,
  encodeSnapshot,
  mergeSnapshots,
  parseSnapshot,
  writeSnapshot,
  type Snapshot,
} from './settingsTransfer';
import { MAX_ENTRIES, serializeStore, type Store } from './readingProgress';
import { languages } from '../i18n/ui';

const store = (items: Store['items']): string => serializeStore({ v: 1, items });

const reader = (data: Record<string, string>) => (key: string) => data[key] ?? null;

/** A snapshot as another device would hand it over. */
const dump = (data: Record<string, string>, at = 1000): Snapshot => ({
  v: TRANSFER_VERSION,
  at,
  data,
});

const readingOf = (result: { data: Record<string, string> }): Store['items'] =>
  JSON.parse(result.data[READING_KEY]).items;

describe('buildSnapshot', () => {
  it('collects only the transferable keys that are present', () => {
    const snapshot = buildSnapshot(
      reader({ theme: 'dark', lang: 'ru', 'unrelated-key': 'x' }),
      1000,
    );

    expect(snapshot).toEqual({
      v: TRANSFER_VERSION,
      at: 1000,
      data: { theme: 'dark', lang: 'ru' },
    });
  });

  it('survives a reader that throws (Safari private mode)', () => {
    const snapshot = buildSnapshot(() => {
      throw new Error('denied');
    }, 1000);

    expect(snapshot.data).toEqual({});
  });

  it('covers every key the site actually writes', () => {
    expect(TRANSFERABLE_KEYS).toContain('reading-progress');
    expect(TRANSFERABLE_KEYS).toContain('theme');
    expect(TRANSFERABLE_KEYS).toContain('lang');
    expect(TRANSFERABLE_KEYS).toContain('podcast-transcript-lang');
    expect(TRANSFERABLE_KEYS).toContain('podcast-sort-dir');
    expect(TRANSFERABLE_KEYS).toContain('ai-usage-disclaimer-accepted');
  });
});

describe('SETTING_VALIDATORS', () => {
  it('covers every transferable key except the reading store', () => {
    const covered = Object.keys(SETTING_VALIDATORS).sort();
    const expected = TRANSFERABLE_KEYS.filter((key) => key !== READING_KEY).sort();
    expect(covered).toEqual(expected);
  });

  it('accepts the values the site itself writes', () => {
    expect(SETTING_VALIDATORS.theme('dark')).toBe('dark');
    expect(SETTING_VALIDATORS.theme('light')).toBe('light');
    expect(SETTING_VALIDATORS.lang('ja')).toBe('ja');
    expect(SETTING_VALIDATORS['podcast-transcript-lang']('en')).toBe('en');
    expect(SETTING_VALIDATORS['podcast-sort-dir']('asc')).toBe('asc');
    expect(SETTING_VALIDATORS['podcast-sort-dir']('desc')).toBe('desc');
    expect(SETTING_VALIDATORS['ai-usage-disclaimer-accepted']('1')).toBe('1');
  });

  it('normalizes the case and the padding around a value', () => {
    expect(SETTING_VALIDATORS.theme(' Dark ')).toBe('dark');
    expect(SETTING_VALIDATORS.lang('RU')).toBe('ru');
    expect(SETTING_VALIDATORS['podcast-sort-dir']('\tASC\n')).toBe('asc');
    expect(SETTING_VALIDATORS['ai-usage-disclaimer-accepted'](' 1 ')).toBe('1');
  });

  it('rejects a value this version cannot use', () => {
    // "system" is not a value the boot script understands: storing it would
    // pin the reader to the light theme.
    expect(SETTING_VALIDATORS.theme('system')).toBeNull();
    expect(SETTING_VALIDATORS.theme('')).toBeNull();
    expect(SETTING_VALIDATORS.lang('it')).toBeNull();
    expect(SETTING_VALIDATORS['podcast-sort-dir']('sideways')).toBeNull();
    expect(SETTING_VALIDATORS['ai-usage-disclaimer-accepted']('0')).toBeNull();
  });

  it('knows exactly the locales the site publishes', () => {
    // The locale list is spelled out in settingsTransfer.ts to keep the UI
    // strings of seven locales out of the client bundle; this pins it.
    for (const lang of Object.keys(languages)) {
      expect(SETTING_VALIDATORS.lang(lang)).toBe(lang);
    }
    expect(SETTING_VALIDATORS.lang('xx')).toBeNull();
  });
});

describe('parseSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    const raw = { v: TRANSFER_VERSION, at: 5, data: { theme: 'dark' } };
    expect(parseSnapshot(raw)).toEqual(raw);
  });

  it('accepts a dump from a newer version of the site', () => {
    // The whole point: a tab on an older deploy must still be able to read a
    // dump made by a newer one. The version is reported, never a gate.
    const parsed = parseSnapshot({
      v: 99,
      at: 5,
      data: { theme: 'dark', 'brand-new-setting': 'x' },
    });

    expect(parsed?.v).toBe(99);
    expect(parsed?.data).toEqual({ theme: 'dark' });
    expect(parsed?.extras).toEqual({ 'brand-new-setting': 'x' });
  });

  it('accepts a dump with no version, or a version written as a string', () => {
    expect(parseSnapshot({ at: 5, data: { theme: 'dark' } })?.v).toBe(TRANSFER_VERSION);
    expect(parseSnapshot({ v: '2', at: 5, data: { theme: 'dark' } })?.v).toBe(2);
    expect(parseSnapshot({ v: 'later', at: 5, data: { theme: 'dark' } })?.v).toBe(TRANSFER_VERSION);
  });

  it('takes the timestamp however it is written, and 0 when it makes no sense', () => {
    expect(parseSnapshot({ v: 1, at: 5, data: {} })?.at).toBe(5);
    expect(parseSnapshot({ v: 1, at: '5', data: {} })?.at).toBe(5);
    expect(parseSnapshot({ v: 1, at: '2026-01-02T03:04:05Z', data: {} })?.at).toBe(
      Date.parse('2026-01-02T03:04:05Z'),
    );
    expect(parseSnapshot({ v: 1, data: {} })?.at).toBe(0);
    expect(parseSnapshot({ v: 1, at: -7, data: {} })?.at).toBe(0);
    expect(parseSnapshot({ v: 1, at: Number.NaN, data: {} })?.at).toBe(0);
    expect(parseSnapshot({ v: 1, at: 'later', data: {} })?.at).toBe(0);
  });

  it('turns a value that is not a string into the string localStorage holds', () => {
    const parsed = parseSnapshot({
      v: 1,
      at: 5,
      data: {
        'podcast-sort-dir': 'asc',
        lang: 42,
        theme: true,
        [READING_KEY]: { v: 1, items: { 'post:a': { p: 0.5, read: false, at: 1 } } },
      },
    });

    expect(parsed?.data.lang).toBe('42');
    expect(parsed?.data.theme).toBe('true');
    // An inlined store instead of its JSON string — what a hand-edited dump
    // tends to look like.
    expect(JSON.parse(parsed?.data[READING_KEY] ?? '{}').items['post:a'].p).toBe(0.5);
  });

  it('drops values there is no honest string for', () => {
    const parsed = parseSnapshot({
      v: 1,
      at: 5,
      data: { theme: 'dark', lang: null, 'podcast-sort-dir': undefined },
    });

    expect(parsed?.data).toEqual({ theme: 'dark' });
  });

  it('keeps unknown keys apart from the known ones, and omits the field when there are none', () => {
    const known = parseSnapshot({ v: 1, at: 5, data: { theme: 'dark' } });
    expect(known).not.toHaveProperty('extras');

    const mixed = parseSnapshot({ v: 1, at: 5, data: { theme: 'dark', evil: 'x', other: 'y' } });
    expect(mixed?.data).toEqual({ theme: 'dark' });
    expect(mixed?.extras).toEqual({ evil: 'x', other: 'y' });
  });

  it('accepts a bare map of localStorage keys, as copied out of devtools', () => {
    const parsed = parseSnapshot({ theme: 'dark', lang: 'ru', 'some-other-app': 'x' });

    expect(parsed?.data).toEqual({ theme: 'dark', lang: 'ru' });
    expect(parsed?.extras).toEqual({ 'some-other-app': 'x' });
    expect(parsed?.at).toBe(0);
  });

  it('accepts a bare reading store pasted on its own', () => {
    const items = { 'post:a': { p: 0.5, read: false, at: 1 } };
    const parsed = parseSnapshot({ v: 1, items });

    expect(JSON.parse(parsed?.data[READING_KEY] ?? '{}').items).toEqual(items);
  });

  it('treats an empty payload as a valid dump of a browser with nothing stored', () => {
    expect(parseSnapshot({ v: 1, at: 5, data: {} })).toEqual({ v: 1, at: 5, data: {} });
  });

  it('rejects what could not be a dump at all', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot(undefined)).toBeNull();
    expect(parseSnapshot('nope')).toBeNull();
    expect(parseSnapshot(42)).toBeNull();
    expect(parseSnapshot([{ theme: 'dark' }])).toBeNull();
    expect(parseSnapshot({})).toBeNull();
    // An envelope with no payload and no key we recognize.
    expect(parseSnapshot({ v: TRANSFER_VERSION, at: 5 })).toBeNull();
    expect(parseSnapshot({ v: 1, at: 5, data: ['theme'] })).toBeNull();
    expect(parseSnapshot({ unrelated: 'x', 'another-app': 'y' })).toBeNull();
  });
});

describe('mergeSnapshots: reading progress', () => {
  it('keeps the newer position for an entry present on both sides', () => {
    const local = dump({ [READING_KEY]: store({ 'post:a': { p: 0.2, read: false, at: 100 } }) });
    const incoming = dump({ [READING_KEY]: store({ 'post:a': { p: 0.7, read: false, at: 200 } }) });

    const merged = mergeSnapshots(local, incoming);

    expect(readingOf(merged)['post:a']).toEqual({ p: 0.7, read: false, at: 200 });
    expect(merged.entriesMerged).toBe(1);
  });

  it('does not let an older incoming position overwrite a newer local one', () => {
    const local = dump({ [READING_KEY]: store({ 'post:a': { p: 0.9, read: false, at: 300 } }) });
    const incoming = dump({ [READING_KEY]: store({ 'post:a': { p: 0.1, read: false, at: 100 } }) });

    expect(readingOf(mergeSnapshots(local, incoming))['post:a'].p).toBe(0.9);
  });

  it('keeps "read" set from either side, whichever is older', () => {
    const local = dump({ [READING_KEY]: store({ 'post:a': { p: 0.4, read: true, at: 100 } }) });
    const incoming = dump({ [READING_KEY]: store({ 'post:a': { p: 0.5, read: false, at: 900 } }) });

    expect(readingOf(mergeSnapshots(local, incoming))['post:a'].read).toBe(true);
  });

  it('carries over entries the local side has never seen', () => {
    const local = dump({ [READING_KEY]: store({ 'post:a': { p: 0.4, read: false, at: 100 } }) });
    const incoming = dump({
      [READING_KEY]: store({
        'podcast:x:ru': { p: 0.5, read: false, at: 200 },
        'podcast:x': { p: 0, read: true, at: 200 },
      }),
    });

    const merged = mergeSnapshots(local, incoming);

    expect(Object.keys(readingOf(merged)).sort()).toEqual([
      'podcast:x',
      'podcast:x:ru',
      'post:a',
    ]);
    expect(merged.entriesMerged).toBe(2);
  });

  it('unions the book chapters two devices read separately', () => {
    // The point of deriving a book's progress from its chapters rather than
    // storing a total: neither device loses the chapters the other finished.
    const done = { p: 1, read: true, at: 2000 };
    const local = dump({ [READING_KEY]: store({ 'book:mctb2:1': done, 'book:mctb2:2': done }) });
    const incoming = dump({ [READING_KEY]: store({ 'book:mctb2:3': done, 'book:mctb2:4': done }) });

    const merged = mergeSnapshots(local, incoming);

    expect(Object.keys(readingOf(merged)).sort()).toEqual([
      'book:mctb2:1',
      'book:mctb2:2',
      'book:mctb2:3',
      'book:mctb2:4',
    ]);
    expect(merged.entriesMerged).toBe(2);
  });

  it('salvages a store written under a different STORE_VERSION', () => {
    // An older deploy's store must not be thrown away over its version number:
    // it is the reader's whole history.
    const foreign = JSON.stringify({
      v: 0,
      items: { 'post:a': { p: 0.5, read: true, at: 400 } },
    });
    const merged = mergeSnapshots(dump({}), dump({ [READING_KEY]: foreign }));

    expect(readingOf(merged)['post:a']).toEqual({ p: 0.5, read: true, at: 400 });
    expect(merged.entriesMerged).toBe(1);
  });

  it('salvages a local store of a foreign version instead of dropping it', () => {
    const localForeign = JSON.stringify({
      v: 42,
      items: { 'post:local': { p: 0.3, read: false, at: 100 } },
    });
    const incoming = dump({ [READING_KEY]: store({ 'post:new': { p: 0.6, read: false, at: 200 } }) });

    const items = readingOf(mergeSnapshots(dump({ [READING_KEY]: localForeign }), incoming));

    expect(Object.keys(items).sort()).toEqual(['post:local', 'post:new']);
  });

  it('salvages an entry that carries no timestamp, without stealing a position', () => {
    // An old format may have had no `at`. Such an entry counts as undated, so
    // it can never win a position — but "read" is sticky, so it still counts.
    const undated = JSON.stringify({ items: { 'post:a': { p: 0.1, read: true } } });
    const local = dump({ [READING_KEY]: store({ 'post:a': { p: 0.8, read: false, at: 500 } }) });

    const entry = readingOf(mergeSnapshots(local, dump({ [READING_KEY]: undated })))['post:a'];

    expect(entry.p).toBe(0.8);
    expect(entry.read).toBe(true);
    expect(entry.at).toBe(500);
  });

  it('reads an entry that only says it was read as a finished one', () => {
    const flagOnly = JSON.stringify({ items: { 'post:a': { read: true } } });

    expect(readingOf(mergeSnapshots(dump({}), dump({ [READING_KEY]: flagOnly })))['post:a']).toEqual(
      { p: 1, read: true, at: 0 },
    );
  });

  it('reads an entry that only says how far it got', () => {
    const positionOnly = JSON.stringify({ items: { 'post:a': { p: 0.42 } } });

    expect(readingOf(mergeSnapshots(dump({}), dump({ [READING_KEY]: positionOnly })))['post:a']).toEqual(
      { p: 0.42, read: false, at: 0 },
    );
  });

  it('coerces fields an older format may have spelled differently', () => {
    const oldStyle = JSON.stringify({
      items: {
        'post:a': { p: '0.5', read: 1, at: '700' },
        'post:b': { p: 2, read: 'true', at: 800 },
        'post:c': { p: 0.1, read: 'no', at: 900 },
      },
    });

    const items = readingOf(mergeSnapshots(dump({}), dump({ [READING_KEY]: oldStyle })));

    expect(items['post:a']).toEqual({ p: 0.5, read: true, at: 700 });
    // Out of range positions are clamped, as everywhere else.
    expect(items['post:b']).toEqual({ p: 1, read: true, at: 800 });
    expect(items['post:c']).toEqual({ p: 0.1, read: false, at: 900 });
  });

  it('drops entries with nothing to salvage rather than inventing them', () => {
    const junk = JSON.stringify({
      items: {
        'post:good': { p: 0.5 },
        'post:timestampOnly': { at: 900 },
        'post:empty': {},
        'post:notAnObject': 7,
        'post:nullish': null,
      },
    });

    const items = readingOf(mergeSnapshots(dump({}), dump({ [READING_KEY]: junk })));

    expect(Object.keys(items)).toEqual(['post:good']);
  });

  it('accepts a reading store that arrives as a bare map of entries', () => {
    const bare = JSON.stringify({ 'post:a': { p: 0.5, read: false, at: 100 } });

    expect(readingOf(mergeSnapshots(dump({}), dump({ [READING_KEY]: bare })))['post:a'].p).toBe(0.5);
  });

  it('ignores an unparseable reading store on either side', () => {
    const local = dump({ [READING_KEY]: 'broken' });
    const incoming = dump({ [READING_KEY]: store({ 'post:a': { p: 0.5, read: false, at: 1 } }) });

    expect(readingOf(mergeSnapshots(local, incoming))['post:a'].p).toBe(0.5);
  });

  it('leaves the reading store untouched when the dump carries none', () => {
    const raw = store({ 'post:a': { p: 0.5, read: false, at: 1 } });
    const merged = mergeSnapshots(dump({ [READING_KEY]: raw }), dump({ theme: 'dark' }));

    expect(merged.data[READING_KEY]).toBe(raw);
    expect(merged.entriesMerged).toBe(0);
  });

  it('stays within the entry cap when a huge dump arrives', () => {
    const items: Store['items'] = {};
    for (let i = 0; i < MAX_ENTRIES + 120; i += 1) {
      items[`post:${i}`] = { p: 0.5, read: false, at: 1000 + i };
    }

    const merged = mergeSnapshots(dump({}), dump({ [READING_KEY]: store(items) }));

    expect(Object.keys(readingOf(merged))).toHaveLength(MAX_ENTRIES);
    // The most recently touched survive.
    expect(readingOf(merged)).toHaveProperty(`post:${MAX_ENTRIES + 119}`);
  });
});

describe('mergeSnapshots: plain settings', () => {
  it('lets the incoming side win', () => {
    const merged = mergeSnapshots(dump({ theme: 'light', lang: 'en' }), dump({ theme: 'dark' }));

    expect(merged.data.theme).toBe('dark');
    // A setting absent from the dump is left alone rather than cleared.
    expect(merged.data.lang).toBe('en');
    expect(merged.settingsApplied).toEqual(['theme']);
    expect(merged.settingsSkipped).toEqual([]);
  });

  it('reports nothing applied when the incoming setting already matches', () => {
    expect(mergeSnapshots(dump({ theme: 'dark' }), dump({ theme: 'dark' })).settingsApplied).toEqual(
      [],
    );
  });

  it('leaves every key an older dump never knew about', () => {
    // A dump from a deploy that had only the theme must not wipe the four
    // settings that came later.
    const local = dump({
      theme: 'light',
      lang: 'ru',
      'podcast-transcript-lang': 'en',
      'podcast-sort-dir': 'asc',
      'ai-usage-disclaimer-accepted': '1',
      [READING_KEY]: store({ 'post:a': { p: 0.5, read: false, at: 100 } }),
    });

    const merged = mergeSnapshots(local, dump({ theme: 'dark' }));

    expect(merged.data).toEqual({ ...local.data, theme: 'dark' });
    expect(merged.settingsApplied).toEqual(['theme']);
  });

  it('normalizes a value before storing it', () => {
    const merged = mergeSnapshots(dump({}), dump({ theme: ' DARK ', lang: 'RU' }));

    expect(merged.data.theme).toBe('dark');
    expect(merged.data.lang).toBe('ru');
    expect(merged.settingsApplied.sort()).toEqual(['lang', 'theme']);
  });

  it('reports a normalized value that already matches as unchanged', () => {
    const merged = mergeSnapshots(dump({ theme: 'dark' }), dump({ theme: 'Dark' }));

    expect(merged.settingsApplied).toEqual([]);
    expect(merged.data.theme).toBe('dark');
  });

  it('skips a value this version cannot use, keeping the rest of the dump', () => {
    const local = dump({ theme: 'light', lang: 'en' });
    const incoming = dump({
      theme: 'system',
      lang: 'it',
      'podcast-sort-dir': 'asc',
      'ai-usage-disclaimer-accepted': '0',
    });

    const merged = mergeSnapshots(local, incoming);

    // The unusable ones are left exactly as they were.
    expect(merged.data.theme).toBe('light');
    expect(merged.data.lang).toBe('en');
    expect(merged.data['ai-usage-disclaimer-accepted']).toBeUndefined();
    // The usable one still lands.
    expect(merged.data['podcast-sort-dir']).toBe('asc');
    expect(merged.settingsApplied).toEqual(['podcast-sort-dir']);
    expect(merged.settingsSkipped.sort()).toEqual([
      'ai-usage-disclaimer-accepted',
      'lang',
      'theme',
    ]);
  });

  it('reports the keys a newer version knows about without writing them', () => {
    const incoming = parseSnapshot({
      v: 7,
      at: 5,
      data: { theme: 'dark', 'font-size': 'large', 'reader-width': 'wide' },
    });

    const merged = mergeSnapshots(dump({}), incoming!);

    expect(merged.unknownKeys).toEqual(['font-size', 'reader-width']);
    expect(Object.keys(merged.data)).toEqual(['theme']);
  });

  it('changes nothing at all for an empty dump', () => {
    const local = dump({ theme: 'dark', [READING_KEY]: store({}) });

    expect(mergeSnapshots(local, dump({}))).toEqual({
      data: local.data,
      entriesMerged: 0,
      settingsApplied: [],
      settingsSkipped: [],
      unknownKeys: [],
    });
  });

  it('works on a snapshot built by hand, without an extras field', () => {
    const incoming = { v: 1, at: 0, data: { theme: 'dark' } };

    expect(mergeSnapshots(dump({}), incoming).unknownKeys).toEqual([]);
  });
});

describe('encodeSnapshot / decodeSnapshot', () => {
  const snapshot = {
    v: TRANSFER_VERSION,
    at: 1_700_000_000_000,
    data: {
      theme: 'dark',
      [READING_KEY]: store({ 'post:пост': { p: 0.5, read: true, at: 3 } }),
    },
  };
  const ascii = { v: TRANSFER_VERSION, at: 5, data: { theme: 'dark', lang: 'en' } };

  it('round-trips a snapshot, including non-ASCII payloads', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(text)).toEqual(snapshot);
  });

  it('produces a single line with no whitespace to break on copy-paste', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(text).not.toMatch(/\s/);
  });

  it('does not re-export keys it never validated', async () => {
    const withExtras = { ...ascii, extras: { 'font-size': 'large' } };
    const decoded = await decodeSnapshot(await encodeSnapshot(withExtras));

    expect(decoded).toEqual(ascii);
  });

  it('tolerates whitespace and line breaks added by the transport', async () => {
    const text = await encodeSnapshot(snapshot);
    const mangled = `  ${text.slice(0, 20)}\n${text.slice(20)}\n `;
    expect(await decodeSnapshot(mangled)).toEqual(snapshot);
  });

  it('tolerates quotes wrapped around the line', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(`"${text}"`)).toEqual(snapshot);
    expect(await decodeSnapshot(`'${text}'`)).toEqual(snapshot);
    expect(await decodeSnapshot(`\`${text}\``)).toEqual(snapshot);
    expect(await decodeSnapshot(`«${text}»`)).toEqual(snapshot);
    expect(await decodeSnapshot(`“${text}”`)).toEqual(snapshot);
  });

  it('tolerates a BOM and invisible characters glued to the line', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(`﻿${text}​`)).toEqual(snapshot);
    expect(await decodeSnapshot(`${text.slice(0, 30)}‍${text.slice(30)}`)).toEqual(snapshot);
  });

  it('accepts url-safe base64, as a link would have carried it', async () => {
    const text = await encodeSnapshot(snapshot);
    const urlSafe = text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(await decodeSnapshot(urlSafe)).toEqual(snapshot);
  });

  it('accepts base64 that lost its padding', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(text.replace(/=+$/, ''))).toEqual(snapshot);
  });

  it('reads the body even when the prefix labels it wrongly', async () => {
    const gzipped = await encodeSnapshot(snapshot);
    // A gzip body under the "plain" prefix...
    expect(await decodeSnapshot(gzipped.replace(/^lbs1\./, 'lbs0.'))).toEqual(snapshot);
    // ...and a plain body under the "gzip" one.
    expect(await decodeSnapshot(`lbs1.${btoa(JSON.stringify(ascii))}`)).toEqual(ascii);
  });

  it('reads a prefix from a future version of the format', async () => {
    const gzipped = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(gzipped.replace(/^lbs1\./, 'lbs7.'))).toEqual(snapshot);
    expect(await decodeSnapshot(`lbs42.${btoa(JSON.stringify(ascii))}`)).toEqual(ascii);
  });

  it('also accepts a raw JSON snapshot pasted by hand', async () => {
    expect(await decodeSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(await decodeSnapshot(`﻿  ${JSON.stringify(ascii)}  `)).toEqual(ascii);
  });

  it('accepts a bare map of localStorage keys pasted by hand', async () => {
    const decoded = await decodeSnapshot('{"theme":"dark","lang":"ru"}');
    expect(decoded?.data).toEqual({ theme: 'dark', lang: 'ru' });
  });

  it('accepts a bare reading store pasted by hand', async () => {
    const decoded = await decodeSnapshot(store({ 'post:a': { p: 0.5, read: false, at: 1 } }));
    expect(JSON.parse(decoded?.data[READING_KEY] ?? '{}').items['post:a'].p).toBe(0.5);
  });

  it('accepts a dump from a newer version of the site', async () => {
    const future = `lbs1.${btoa(JSON.stringify({ v: 9, at: 5, data: { theme: 'dark', next: 'x' } }))}`;
    const decoded = await decodeSnapshot(future);

    expect(decoded?.v).toBe(9);
    expect(decoded?.data).toEqual({ theme: 'dark' });
    expect(decoded?.extras).toEqual({ next: 'x' });
  });

  it('returns null for anything it cannot make sense of', async () => {
    expect(await decodeSnapshot('')).toBeNull();
    expect(await decodeSnapshot('   ')).toBeNull();
    expect(await decodeSnapshot('""')).toBeNull();
    expect(await decodeSnapshot('hello there')).toBeNull();
    expect(await decodeSnapshot('lbs1.')).toBeNull();
    expect(await decodeSnapshot('lbs1.@@@not-base64@@@')).toBeNull();
    expect(await decodeSnapshot('lbsx.abcd')).toBeNull();
    expect(await decodeSnapshot('{ not json')).toBeNull();
    expect(await decodeSnapshot('{"unrelated":"x"}')).toBeNull();
    expect(await decodeSnapshot(`lbs1.${btoa('[1,2,3]')}`)).toBeNull();
  });

  it('finds the line inside the message it was sent in', async () => {
    const text = await encodeSnapshot(snapshot);

    // A label in front of it.
    expect(await decodeSnapshot(`Настройки: ${text}`)).toEqual(snapshot);
    // One line of a longer message.
    expect(
      await decodeSnapshot(`Привет! Вот мои настройки:\n${text}\nВставь их у себя.`),
    ).toEqual(snapshot);
    // Both at once.
    expect(await decodeSnapshot(`hi\nsettings: ${text}\nbye`)).toEqual(snapshot);
  });

  it('still reads a payload the transport wrapped across lines of a message', async () => {
    const text = await encodeSnapshot(snapshot);
    const wrapped = `${text.slice(0, 40)}\n${text.slice(40, 80)}\n${text.slice(80)}`;

    expect(await decodeSnapshot(wrapped)).toEqual(snapshot);
  });

  it('compresses a realistic reading store well below its JSON size', async () => {
    const items: Store['items'] = {};
    for (let i = 0; i < 200; i += 1) {
      items[`post:some-fairly-long-slug-${i}`] = {
        p: i / 200,
        read: i % 3 === 0,
        at: 1_700_000_000_000 + i,
      };
    }
    const big = { v: TRANSFER_VERSION, at: 1, data: { [READING_KEY]: store(items) } };

    const text = await encodeSnapshot(big);

    expect(text.length).toBeLessThan(JSON.stringify(big).length / 2);
    expect(await decodeSnapshot(text)).toEqual(big);
  });
});

describe('a full round trip between two deploys', () => {
  it('merges an old dump into a new browser without losing anything', async () => {
    // The old deploy knew the theme and the reading store, nothing else, and
    // its store had no `at` on the entries.
    const oldDump = JSON.stringify({
      v: 1,
      data: {
        theme: 'dark',
        [READING_KEY]: JSON.stringify({
          items: {
            'post:shared': { p: 0.9, read: false },
            'post:only-there': { p: 0.4, read: true },
          },
        }),
      },
    });

    const local = buildSnapshot(
      reader({
        theme: 'light',
        lang: 'ru',
        'podcast-sort-dir': 'asc',
        [READING_KEY]: store({
          'post:shared': { p: 0.2, read: false, at: 9000 },
          'book:mctb2:3': { p: 1, read: true, at: 9000 },
        }),
      }),
      9999,
    );

    const incoming = await decodeSnapshot(oldDump);
    expect(incoming).not.toBeNull();

    const merged = mergeSnapshots(local, incoming!);
    const items = readingOf(merged);

    // Settings the old dump never knew survive; the one it carried is applied.
    expect(merged.data.theme).toBe('dark');
    expect(merged.data.lang).toBe('ru');
    expect(merged.data['podcast-sort-dir']).toBe('asc');
    // The newer local position wins, the incoming "read" flag still counts.
    expect(items['post:shared']).toEqual({ p: 0.2, read: false, at: 9000 });
    // Entries either side had alone are all there.
    expect(items['post:only-there']).toEqual({ p: 0.4, read: true, at: 0 });
    expect(items['book:mctb2:3'].read).toBe(true);
    expect(merged.unknownKeys).toEqual([]);
  });

  it('merges a new dump into an old browser, reporting what it could not use', async () => {
    // The dump comes from a deploy with a setting and a store version this one
    // has never heard of.
    const newDump = `lbs1.${btoa(
      JSON.stringify({
        v: 5,
        at: 8000,
        data: {
          theme: 'dark',
          'font-size': 'large',
          lang: 'it',
          [READING_KEY]: JSON.stringify({
            v: 3,
            items: { 'post:a': { p: 0.6, read: false, at: 8000 } },
          }),
        },
      }),
    )}`;

    const incoming = await decodeSnapshot(newDump);
    const merged = mergeSnapshots(dump({ lang: 'ru' }), incoming!);

    expect(merged.data.theme).toBe('dark');
    // A locale this deploy does not publish is not written.
    expect(merged.data.lang).toBe('ru');
    expect(merged.settingsSkipped).toEqual(['lang']);
    expect(merged.unknownKeys).toEqual(['font-size']);
    // The store survives its unknown version.
    expect(readingOf(merged)['post:a'].p).toBe(0.6);
  });
});

describe('writeSnapshot', () => {
  /** A localStorage stand-in that can be told to refuse some keys. */
  const box = (refuse: string[] = []) => {
    const values: Record<string, string> = {};
    const stub = {
      getItem: (key: string) => values[key] ?? null,
      setItem: (key: string, value: string) => {
        if (refuse.includes(key)) {
          const error = new Error('quota');
          error.name = 'QuotaExceededError';
          throw error;
        }
        values[key] = value;
      },
      removeItem: (key: string) => {
        delete values[key];
      },
      clear: () => {
        for (const key of Object.keys(values)) delete values[key];
      },
      key: () => null,
      length: 0,
    };
    return { values, stub };
  };

  const withStorage = <T,>(stub: unknown, run: () => T): T => {
    const globals = globalThis as { localStorage?: unknown };
    const had = 'localStorage' in globals;
    const previous = globals.localStorage;
    Object.defineProperty(globals, 'localStorage', { value: stub, configurable: true });
    try {
      return run();
    } finally {
      if (had) Object.defineProperty(globals, 'localStorage', { value: previous, configurable: true });
      else delete globals.localStorage;
    }
  };

  it('writes every key and reports them', () => {
    const { values, stub } = box();
    const data = { theme: 'dark', lang: 'ru', [READING_KEY]: store({}) };

    const result = withStorage(stub, () => writeSnapshot(data));

    expect(result.failed).toEqual([]);
    expect(result.written.sort()).toEqual([READING_KEY, 'lang', 'theme'].sort());
    expect(values).toEqual(data);
  });

  it('writes the reading store last, so a full quota costs only the store', () => {
    const { values, stub } = box([READING_KEY]);
    const data = {
      theme: 'dark',
      lang: 'ru',
      [READING_KEY]: store({ 'post:a': { p: 0.5, read: false, at: 1 } }),
    };

    const result = withStorage(stub, () => writeSnapshot(data));

    expect(result.failed).toEqual([READING_KEY]);
    expect(result.written).toEqual(['lang', 'theme']);
    // The settings are in even though the big one was refused.
    expect(values).toEqual({ theme: 'dark', lang: 'ru' });
  });

  it('keeps going past a key storage refuses', () => {
    const { values, stub } = box(['lang']);

    const result = withStorage(stub, () => writeSnapshot({ theme: 'dark', lang: 'ru' }));

    expect(result.written).toEqual(['theme']);
    expect(result.failed).toEqual(['lang']);
    expect(values).toEqual({ theme: 'dark' });
  });

  it('reports every key as failed when there is no storage at all', () => {
    const result = withStorage(undefined, () => writeSnapshot({ theme: 'dark', lang: 'ru' }));

    expect(result.written).toEqual([]);
    expect(result.failed.sort()).toEqual(['lang', 'theme']);
  });

  it('writes nothing and fails nothing for an empty result', () => {
    const { stub } = box();
    expect(withStorage(stub, () => writeSnapshot({}))).toEqual({ written: [], failed: [] });
  });
});

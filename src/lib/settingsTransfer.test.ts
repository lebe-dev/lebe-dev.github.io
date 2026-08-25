import { describe, expect, it } from 'vitest';
import {
  TRANSFER_VERSION,
  TRANSFERABLE_KEYS,
  buildSnapshot,
  decodeSnapshot,
  encodeSnapshot,
  mergeSnapshots,
  parseSnapshot,
} from './settingsTransfer';
import { serializeStore, type Store } from './readingProgress';

const store = (items: Store['items']): string => serializeStore({ v: 1, items });

const reader = (data: Record<string, string>) => (key: string) => data[key] ?? null;

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

describe('parseSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    const raw = { v: TRANSFER_VERSION, at: 5, data: { theme: 'dark' } };
    expect(parseSnapshot(raw)).toEqual(raw);
  });

  it('drops values that are not strings and keys it does not know', () => {
    const parsed = parseSnapshot({
      v: TRANSFER_VERSION,
      at: 5,
      data: { theme: 'dark', lang: 42, evil: 'x' },
    });

    expect(parsed?.data).toEqual({ theme: 'dark' });
  });

  it('rejects junk, a foreign version and a missing payload', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot('nope')).toBeNull();
    expect(parseSnapshot({ v: 99, at: 5, data: {} })).toBeNull();
    expect(parseSnapshot({ v: TRANSFER_VERSION, at: 5 })).toBeNull();
    expect(parseSnapshot({ v: TRANSFER_VERSION, at: 'later', data: {} })).toBeNull();
  });
});

describe('mergeSnapshots', () => {
  it('keeps the newer position for an entry present on both sides', () => {
    const local = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.2, read: false, at: 100 } }) }),
      0,
    );
    const incoming = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.7, read: false, at: 200 } }) }),
      0,
    );

    const merged = mergeSnapshots(local, incoming);
    const items = JSON.parse(merged.data['reading-progress']).items;

    expect(items['post:a']).toEqual({ p: 0.7, read: false, at: 200 });
    expect(merged.entriesMerged).toBe(1);
  });

  it('does not let an older incoming position overwrite a newer local one', () => {
    const local = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.9, read: false, at: 300 } }) }),
      0,
    );
    const incoming = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.1, read: false, at: 100 } }) }),
      0,
    );

    const items = JSON.parse(mergeSnapshots(local, incoming).data['reading-progress']).items;
    expect(items['post:a'].p).toBe(0.9);
  });

  it('keeps "read" set from either side, whichever is older', () => {
    const local = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.4, read: true, at: 100 } }) }),
      0,
    );
    const incoming = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.5, read: false, at: 900 } }) }),
      0,
    );

    const items = JSON.parse(mergeSnapshots(local, incoming).data['reading-progress']).items;
    expect(items['post:a'].read).toBe(true);
  });

  it('carries over entries the local side has never seen', () => {
    const local = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.4, read: false, at: 100 } }) }),
      0,
    );
    const incoming = buildSnapshot(
      reader({
        'reading-progress': store({
          'podcast:x:ru': { p: 0.5, read: false, at: 200 },
          'podcast:x': { p: 0, read: true, at: 200 },
        }),
      }),
      0,
    );

    const merged = mergeSnapshots(local, incoming);
    const items = JSON.parse(merged.data['reading-progress']).items;

    expect(Object.keys(items).sort()).toEqual(['podcast:x', 'podcast:x:ru', 'post:a']);
    expect(merged.entriesMerged).toBe(2);
  });

  it('lets the incoming side win for plain settings', () => {
    const local = buildSnapshot(reader({ theme: 'light', lang: 'en' }), 0);
    const incoming = buildSnapshot(reader({ theme: 'dark' }), 0);

    const merged = mergeSnapshots(local, incoming);

    expect(merged.data.theme).toBe('dark');
    // A setting absent from the dump is left alone rather than cleared.
    expect(merged.data.lang).toBe('en');
    expect(merged.settingsApplied).toEqual(['theme']);
  });

  it('reports nothing applied when the incoming setting already matches', () => {
    const local = buildSnapshot(reader({ theme: 'dark' }), 0);
    const incoming = buildSnapshot(reader({ theme: 'dark' }), 0);

    expect(mergeSnapshots(local, incoming).settingsApplied).toEqual([]);
  });

  it('ignores an unparseable reading store on either side', () => {
    const local = buildSnapshot(reader({ 'reading-progress': 'broken' }), 0);
    const incoming = buildSnapshot(
      reader({ 'reading-progress': store({ 'post:a': { p: 0.5, read: false, at: 1 } }) }),
      0,
    );

    const items = JSON.parse(mergeSnapshots(local, incoming).data['reading-progress']).items;
    expect(items['post:a'].p).toBe(0.5);
  });

  it('leaves the reading store untouched when the dump carries none', () => {
    const raw = store({ 'post:a': { p: 0.5, read: false, at: 1 } });
    const local = buildSnapshot(reader({ 'reading-progress': raw }), 0);
    const incoming = buildSnapshot(reader({ theme: 'dark' }), 0);

    const merged = mergeSnapshots(local, incoming);

    expect(merged.data['reading-progress']).toBe(raw);
    expect(merged.entriesMerged).toBe(0);
  });
});

describe('encodeSnapshot / decodeSnapshot', () => {
  const snapshot = {
    v: TRANSFER_VERSION,
    at: 1_700_000_000_000,
    data: { theme: 'dark', 'reading-progress': store({ 'post:пост': { p: 0.5, read: true, at: 3 } }) },
  };

  it('round-trips a snapshot, including non-ASCII payloads', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(await decodeSnapshot(text)).toEqual(snapshot);
  });

  it('produces a single line with no whitespace to break on copy-paste', async () => {
    const text = await encodeSnapshot(snapshot);
    expect(text).not.toMatch(/\s/);
  });

  it('tolerates whitespace and line breaks added by the transport', async () => {
    const text = await encodeSnapshot(snapshot);
    const mangled = `  ${text.slice(0, 20)}\n${text.slice(20)}\n `;
    expect(await decodeSnapshot(mangled)).toEqual(snapshot);
  });

  it('also accepts a raw JSON snapshot pasted by hand', async () => {
    expect(await decodeSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('returns null for anything it cannot make sense of', async () => {
    expect(await decodeSnapshot('')).toBeNull();
    expect(await decodeSnapshot('hello there')).toBeNull();
    expect(await decodeSnapshot('lbs1.@@@not-base64@@@')).toBeNull();
    expect(await decodeSnapshot(JSON.stringify({ v: 99, at: 1, data: {} }))).toBeNull();
  });

  it('compresses a realistic reading store well below its JSON size', async () => {
    const items: Store['items'] = {};
    for (let i = 0; i < 200; i += 1) {
      items[`post:some-fairly-long-slug-${i}`] = { p: i / 200, read: i % 3 === 0, at: 1_700_000_000_000 + i };
    }
    const big = { v: TRANSFER_VERSION, at: 1, data: { 'reading-progress': store(items) } };

    const text = await encodeSnapshot(big);

    expect(text.length).toBeLessThan(JSON.stringify(big).length / 2);
    expect(await decodeSnapshot(text)).toEqual(big);
  });
});

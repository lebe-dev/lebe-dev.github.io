/**
 * Moving what the browser remembers from one device to another.
 *
 * Everything the site stores is client-side: reading progress, the theme, the
 * chosen language, a couple of per-section preferences. There is no account and
 * nothing is sent anywhere, so the only way to carry that state to a second
 * device is to hand it over by hand — the reader copies one line of text out of
 * the menu here and pastes it there.
 *
 * The transfer text is `lbs1.<base64 gzip json>` (`lbs0.` when the browser has
 * no CompressionStream). A pasted plain JSON snapshot is accepted too, so a
 * dump that has been through an editor still imports.
 *
 * Import **merges** rather than replaces: reading positions are reconciled per
 * entry by their timestamp and "read" is sticky, so two devices can keep
 * exchanging dumps in both directions without ever losing progress. Plain
 * settings have no timestamps, so there the incoming value simply wins — but a
 * key absent from the dump is left alone rather than cleared.
 */

import {
  parseStore,
  prune,
  serializeStore,
  type Entry,
  type Store,
} from './readingProgress';

export const TRANSFER_VERSION = 1;

/** The reading store is merged entry by entry; the rest are plain values. */
export const READING_KEY = 'reading-progress';

/** Every localStorage key the site owns. Keep in sync when a new one appears. */
export const TRANSFERABLE_KEYS = [
  READING_KEY,
  'theme',
  'lang',
  'podcast-transcript-lang',
  'podcast-sort-dir',
  'ai-usage-disclaimer-accepted',
] as const;

export type TransferableKey = (typeof TRANSFERABLE_KEYS)[number];

const GZIP_PREFIX = 'lbs1.';
const PLAIN_PREFIX = 'lbs0.';

export interface Snapshot {
  v: number;
  /** Epoch ms the dump was produced — shown to the reader, never merged on. */
  at: number;
  /** Raw localStorage values, by key. */
  data: Record<string, string>;
}

export interface MergeResult {
  /** The values to write back, already merged with what was there. */
  data: Record<string, string>;
  /** How many reading entries the dump actually added or moved forward. */
  entriesMerged: number;
  /** Which plain settings the dump changed. */
  settingsApplied: TransferableKey[];
}

const isTransferable = (key: string): key is TransferableKey =>
  (TRANSFERABLE_KEYS as readonly string[]).includes(key);

/** Read the current state through `read`, skipping keys that are not set. */
export const buildSnapshot = (
  read: (key: string) => string | null,
  now: number,
): Snapshot => {
  const data: Record<string, string> = {};
  for (const key of TRANSFERABLE_KEYS) {
    let value: string | null = null;
    try {
      value = read(key);
    } catch {
      // Safari in private mode throws on access rather than on use.
      continue;
    }
    if (typeof value === 'string') data[key] = value;
  }
  return { v: TRANSFER_VERSION, at: now, data };
};

/** Validate a decoded dump. Unknown keys and non-string values are dropped. */
export const parseSnapshot = (raw: unknown): Snapshot | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const snapshot = raw as Partial<Snapshot>;
  if (snapshot.v !== TRANSFER_VERSION) return null;
  if (typeof snapshot.at !== 'number' || !Number.isFinite(snapshot.at)) return null;
  if (typeof snapshot.data !== 'object' || snapshot.data === null) return null;

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(snapshot.data)) {
    if (!isTransferable(key) || typeof value !== 'string') continue;
    data[key] = value;
  }
  return { v: TRANSFER_VERSION, at: snapshot.at, data };
};

/**
 * Reconcile one reading entry. The newer timestamp decides the position, while
 * "read" is sticky — finishing something on one device must not be undone by a
 * dump from a device where it was never opened.
 */
const mergeEntry = (local: Entry | undefined, incoming: Entry): Entry => {
  if (!local) return incoming;
  const newer = incoming.at > local.at ? incoming : local;
  return {
    p: newer.p,
    read: local.read || incoming.read,
    at: Math.max(local.at, incoming.at),
  };
};

const sameEntry = (a: Entry | undefined, b: Entry): boolean =>
  a !== undefined && a.p === b.p && a.read === b.read && a.at === b.at;

const mergeReading = (
  localRaw: string | undefined,
  incomingRaw: string | undefined,
): { raw: string | undefined; count: number } => {
  if (incomingRaw === undefined) return { raw: localRaw, count: 0 };

  const local = parseStore(localRaw ?? null);
  const incoming = parseStore(incomingRaw);

  const items: Store['items'] = { ...local.items };
  let count = 0;
  for (const [id, entry] of Object.entries(incoming.items)) {
    const merged = mergeEntry(local.items[id], entry);
    if (sameEntry(local.items[id], merged)) continue;
    items[id] = merged;
    count += 1;
  }

  return { raw: serializeStore(prune({ ...local, items })), count };
};

export const mergeSnapshots = (local: Snapshot, incoming: Snapshot): MergeResult => {
  const data: Record<string, string> = { ...local.data };
  const settingsApplied: TransferableKey[] = [];

  for (const key of TRANSFERABLE_KEYS) {
    if (key === READING_KEY) continue;
    const value = incoming.data[key];
    if (value === undefined || value === local.data[key]) continue;
    data[key] = value;
    settingsApplied.push(key);
  }

  const reading = mergeReading(local.data[READING_KEY], incoming.data[READING_KEY]);
  if (reading.raw !== undefined) data[READING_KEY] = reading.raw;

  return { data, entriesMerged: reading.count, settingsApplied };
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  // Chunked so a large dump does not blow the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const base64ToBytes = (text: string): Uint8Array => {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const pipe = async (bytes: Uint8Array, stream: ReadableWritablePair): Promise<Uint8Array> => {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
};

/** One line of text, safe to paste into a messenger. */
export const encodeSnapshot = async (snapshot: Snapshot): Promise<string> => {
  const json = new TextEncoder().encode(JSON.stringify(snapshot));
  if (typeof CompressionStream === 'undefined') {
    return PLAIN_PREFIX + bytesToBase64(json);
  }
  try {
    return GZIP_PREFIX + bytesToBase64(await pipe(json, new CompressionStream('gzip')));
  } catch {
    return PLAIN_PREFIX + bytesToBase64(json);
  }
};

/** The inverse; `null` for anything that is not one of our dumps. */
export const decodeSnapshot = async (text: string): Promise<Snapshot | null> => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      return parseSnapshot(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  const gzipped = trimmed.startsWith(GZIP_PREFIX);
  if (!gzipped && !trimmed.startsWith(PLAIN_PREFIX)) return null;

  // Line breaks inserted by whatever carried the text here are not part of it.
  const payload = trimmed.slice(GZIP_PREFIX.length).replace(/\s+/g, '');

  try {
    const bytes = base64ToBytes(payload);
    const json = gzipped ? await pipe(bytes, new DecompressionStream('gzip')) : bytes;
    return parseSnapshot(JSON.parse(new TextDecoder().decode(json)));
  } catch {
    return null;
  }
};

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

/** The state of this browser, ready to be encoded. */
export const readLocalSnapshot = (now: number = Date.now()): Snapshot =>
  buildSnapshot((key) => storage()?.getItem(key) ?? null, now);

/** Write a merged result back. Returns false if storage refused it. */
export const writeSnapshot = (data: Record<string, string>): boolean => {
  const box = storage();
  if (!box) return false;
  try {
    for (const [key, value] of Object.entries(data)) box.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

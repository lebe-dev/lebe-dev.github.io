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
 * no CompressionStream).
 *
 * **Reading a dump is deliberately forgiving, writing it is strict.** The two
 * devices are almost never running the same deploy: one is a tab that has been
 * open for a month, the other was loaded today. A dump therefore routinely
 * lacks keys this version knows, or carries keys it does not, and neither is an
 * error. What is accepted, in order of how likely it is to turn up:
 *
 * - the `lbs<n>.` line this module writes, whatever `n` says — a wrong or
 *   future prefix is retried the other way round rather than refused;
 * - base64 that travelled badly: line-wrapped, url-safe (`-_`), unpadded, in
 *   quotes, with a BOM or zero-width characters glued to it;
 * - a plain JSON `{ v, at, data }` envelope of any version;
 * - a bare map of localStorage keys, which is what a devtools copy looks like;
 * - a bare reading store (`{ v, items }`) on its own;
 * - values that are numbers, booleans or inlined objects instead of the
 *   strings localStorage actually holds.
 *
 * Import **merges** rather than replaces: reading positions are reconciled per
 * entry by their timestamp and "read" is sticky, so two devices can keep
 * exchanging dumps in both directions without ever losing progress. Plain
 * settings have no timestamps, so there the incoming value simply wins — but
 * only if this version can still make sense of it, and a key **absent** from
 * the dump is left alone rather than cleared.
 */

import {
  looseNumber,
  parseStoreCompat,
  prune,
  serializeStore,
  type Entry,
  type Store,
} from './readingProgress';

/** Version stamped on a dump this version writes. Readers ignore it. */
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

/** A plain setting, i.e. everything except the reading store. */
export type SettingKey = Exclude<TransferableKey, typeof READING_KEY>;

/**
 * Locale codes the site publishes, spelled out rather than imported from
 * `src/i18n/ui.ts` on purpose: that module carries the UI strings of all seven
 * locales and this one is in the client bundle. `settingsTransfer.test.ts`
 * pins the list to the real one, so it cannot drift.
 */
const LOCALES = ['en', 'ru', 'es', 'zh', 'ja', 'fr', 'de'] as const;

/** Accepts one of `allowed`, ignoring the case and the padding around it. */
const oneOf =
  (allowed: readonly string[]) =>
  (value: string): string | null => {
    const normalized = value.trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : null;
  };

/**
 * What a plain setting may contain — the incoming value normalized, or null
 * for one this version cannot use.
 *
 * A rejected value is skipped, never written and never fatal: a dump from
 * another deploy may name a theme, a locale or a flag that no longer exists,
 * and the rest of it is still worth having. Writing it through would be worse
 * than dropping it — `theme: "system"`, for instance, is not a value the boot
 * script in BaseLayout understands, and storing it would pin the reader to the
 * light theme with no way back except this dialog.
 */
export const SETTING_VALIDATORS: Record<SettingKey, (value: string) => string | null> = {
  theme: oneOf(['light', 'dark']),
  lang: oneOf(LOCALES),
  'podcast-transcript-lang': oneOf(LOCALES),
  'podcast-sort-dir': oneOf(['asc', 'desc']),
  // Written as "1" and read as `=== '1'`; anything else means "not accepted",
  // which is what an absent key already says.
  'ai-usage-disclaimer-accepted': (value) => (value.trim() === '1' ? '1' : null),
};

const GZIP_PREFIX = 'lbs1.';
const PLAIN_PREFIX = 'lbs0.';
/** `lbs<n>.` — the number is a hint about the body, not a gate. */
const PREFIX = /^lbs(\d+)\./;
/** The same, wherever it sits in a pasted message. */
const PREFIX_ANYWHERE = /lbs\d+\./;

export interface Snapshot {
  v: number;
  /** Epoch ms the dump was produced — shown to the reader, never merged on. */
  at: number;
  /** Raw localStorage values, by key, for the keys this version knows. */
  data: Record<string, string>;
  /**
   * Keys the dump carried that this version knows nothing about — almost
   * always a newer deploy's. Kept for reporting and deliberately not written:
   * this version cannot say whether the value is still meaningful.
   *
   * Optional, and absent when there were none: a snapshot built by hand (or by
   * an older copy of this module) has no business filling it in.
   */
  extras?: Record<string, string>;
}

export interface MergeResult {
  /** The values to write back, already merged with what was there. */
  data: Record<string, string>;
  /** How many reading entries the dump actually added or moved forward. */
  entriesMerged: number;
  /** Which plain settings the dump changed. */
  settingsApplied: SettingKey[];
  /** Settings whose incoming value this version cannot use — left untouched. */
  settingsSkipped: SettingKey[];
  /** Keys from a version that knows more than this one. */
  unknownKeys: string[];
}

const isTransferable = (key: string): key is TransferableKey =>
  (TRANSFERABLE_KEYS as readonly string[]).includes(key);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

/** A dump value as localStorage would hold it: a string. */
const asStoredValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return String(value);
  // A store inlined as an object instead of the JSON string localStorage
  // holds — what a hand-edited dump tends to look like.
  if (isPlainObject(value) || Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * The dump's own version, for reporting only. An unreadable one counts as this
 * version: every field is validated on its own anyway, so refusing a dump over
 * its version number would stand between the reader and their data for no
 * gain.
 */
const versionOf = (value: unknown): number => looseNumber(value) ?? TRANSFER_VERSION;

/** When the dump was made. Also accepts a date string; unusable becomes 0. */
const timestampOf = (value: unknown): number => {
  const numeric = looseNumber(value);
  if (numeric !== null) return numeric >= 0 ? numeric : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value.trim());
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
};

/**
 * Validate a decoded dump. Returns null only when there is nothing in it that
 * could be a dump at all — see the four accepted shapes in the module comment.
 */
export const parseSnapshot = (raw: unknown): Snapshot | null => {
  if (!isPlainObject(raw)) return null;

  const body = snapshotBody(raw);
  if (!body) return null;

  const data: Record<string, string> = {};
  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    const text = asStoredValue(value);
    if (text === null) continue;
    if (isTransferable(key)) data[key] = text;
    else extras[key] = text;
  }

  const snapshot: Snapshot = { v: versionOf(raw.v), at: timestampOf(raw.at), data };
  if (Object.keys(extras).length > 0) snapshot.extras = extras;
  return snapshot;
};

/** Which of the accepted shapes this is, reduced to a map of key → value. */
const snapshotBody = (raw: Record<string, unknown>): Record<string, unknown> | null => {
  // `{ v, at, data }` — what this module writes. An empty `data` is a valid
  // dump of a browser that has nothing stored yet.
  if (isPlainObject(raw.data)) return raw.data;

  // A reading store on its own, pasted straight out of localStorage.
  if (isPlainObject(raw.items)) return { [READING_KEY]: JSON.stringify(raw) };

  // A bare map of localStorage keys, e.g. copied out of devtools. Recognized
  // only by carrying a key we know, so junk still reads as junk.
  if (TRANSFERABLE_KEYS.some((key) => key in raw)) return raw;

  return null;
};

/**
 * Reconcile one reading entry. The newer timestamp decides the position, while
 * "read" is sticky — finishing something on one device must not be undone by a
 * dump from a device where it was never opened.
 *
 * An entry salvaged without a timestamp carries `at: 0`, so it can only ever
 * add a position the local side does not have, never overwrite one.
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

/**
 * Both sides are read leniently on purpose. The incoming store is from another
 * deploy by definition; the local one may itself predate a `STORE_VERSION`
 * bump, and this is the one moment where salvaging it costs nothing — the key
 * is about to be rewritten either way.
 */
const mergeReading = (
  localRaw: string | undefined,
  incomingRaw: string | undefined,
): { raw: string | undefined; count: number } => {
  if (incomingRaw === undefined) return { raw: localRaw, count: 0 };

  const local = parseStoreCompat(localRaw ?? null);
  const incoming = parseStoreCompat(incomingRaw);

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
  const settingsApplied: SettingKey[] = [];
  const settingsSkipped: SettingKey[] = [];

  for (const key of TRANSFERABLE_KEYS) {
    if (key === READING_KEY) continue;

    const raw = incoming.data[key];
    // Absent from the dump: an older version did not know this key, or this
    // browser never set it. Either way, leave what is here alone.
    if (raw === undefined) continue;

    const value = SETTING_VALIDATORS[key](raw);
    if (value === null) {
      settingsSkipped.push(key);
      continue;
    }
    if (value === local.data[key]) continue;

    data[key] = value;
    settingsApplied.push(key);
  }

  const reading = mergeReading(local.data[READING_KEY], incoming.data[READING_KEY]);
  if (reading.raw !== undefined) data[READING_KEY] = reading.raw;

  return {
    data,
    entriesMerged: reading.count,
    settingsApplied,
    settingsSkipped,
    unknownKeys: Object.keys(incoming.extras ?? {}).sort(),
  };
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
  // Only the three fields of the wire format: `extras` belongs to whatever
  // deploy produced them, and re-exporting them would spread keys this version
  // never validated.
  const wire = { v: snapshot.v, at: snapshot.at, data: snapshot.data };
  const json = new TextEncoder().encode(JSON.stringify(wire));
  if (typeof CompressionStream === 'undefined') {
    return PLAIN_PREFIX + bytesToBase64(json);
  }
  try {
    return GZIP_PREFIX + bytesToBase64(await pipe(json, new CompressionStream('gzip')));
  } catch {
    return PLAIN_PREFIX + bytesToBase64(json);
  }
};

/**
 * Whatever carried the text here may have wrapped it in quotes or left a BOM,
 * a zero-width space or a directional mark glued to it. None of that is part
 * of the dump.
 */
const unwrap = (text: string): string =>
  text
    .replace(/[\uFEFF\u200B-\u200F\u2060\u202A-\u202E]/g, '')
    .trim()
    .replace(/^["'`«“‘]+|["'`»”’]+$/g, '')
    .trim();

/** base64, however it travelled: line-wrapped, url-safe or unpadded. */
const normalizeBase64 = (payload: string): string => {
  const compact = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/]/g, '');
  const remainder = compact.length % 4;
  return remainder === 0 ? compact : compact + '='.repeat(4 - remainder);
};

/**
 * The body, read as gzip or as plain bytes — starting with what the prefix
 * claims and falling back to the other, so a mislabelled dump (or a browser
 * with no DecompressionStream) is not a dead end.
 */
const decodeBody = async (bytes: Uint8Array, compressed: boolean): Promise<unknown> => {
  for (const gzip of compressed ? [true, false] : [false, true]) {
    try {
      const json = gzip ? await pipe(bytes, new DecompressionStream('gzip')) : bytes;
      return JSON.parse(new TextDecoder().decode(json));
    } catch {
      // Try the other reading of the same bytes.
    }
  }
  return null;
};

/** One `lbs<n>.…` line, or null if it does not decode to a dump. */
const decodeLine = async (line: string): Promise<Snapshot | null> => {
  const prefix = PREFIX.exec(line);
  if (!prefix) return null;

  const payload = normalizeBase64(line.slice(prefix[0].length));
  if (!payload) return null;

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(payload);
  } catch {
    return null;
  }

  return parseSnapshot(await decodeBody(bytes, prefix[1] !== '0'));
};

/**
 * Every reading of the pasted text that could be a dump, likeliest first.
 *
 * The dump is one long line, but it does not always arrive alone: it may carry
 * a label in front of it ("settings: lbs1.…"), or sit among the other lines of
 * a message it was sent in. Taking the whole text first is what keeps a
 * payload that the transport wrapped over several lines working, since the
 * line breaks inside it are then simply stripped; the per-line readings are
 * the fallback for when the text around it got in the way.
 */
const candidates = (text: string): string[] => {
  const found: string[] = [];

  const add = (value: string) => {
    const trimmed = unwrap(value);
    const at = trimmed.search(PREFIX_ANYWHERE);
    if (at === -1) return;
    const candidate = trimmed.slice(at);
    if (!found.includes(candidate)) found.push(candidate);
  };

  add(text);
  for (const line of text.split(/[\r\n]+/)) add(line);
  return found;
};

/** The inverse of {@link encodeSnapshot}; `null` for anything unreadable. */
export const decodeSnapshot = async (text: string): Promise<Snapshot | null> => {
  const trimmed = unwrap(text);
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      return parseSnapshot(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  for (const candidate of candidates(text)) {
    const snapshot = await decodeLine(candidate);
    if (snapshot) return snapshot;
  }
  return null;
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

export interface WriteResult {
  written: string[];
  /** Keys storage refused — a full quota, or no storage at all. */
  failed: string[];
}

/**
 * Write a merged result back, key by key.
 *
 * The reading store goes last and every key is written on its own, so a full
 * quota costs at most the store — the handful of small settings in front of it
 * are already in. Writing them all in one `try` would have thrown away an
 * import that was almost entirely fine.
 */
export const writeSnapshot = (data: Record<string, string>): WriteResult => {
  const keys = Object.keys(data).sort((a, b) => {
    if (a === b) return 0;
    if (a === READING_KEY) return 1;
    if (b === READING_KEY) return -1;
    return a < b ? -1 : 1;
  });

  const box = storage();
  if (!box) return { written: [], failed: keys };

  const written: string[] = [];
  const failed: string[] = [];
  for (const key of keys) {
    try {
      box.setItem(key, data[key]);
      written.push(key);
    } catch {
      failed.push(key);
    }
  }
  return { written, failed };
};

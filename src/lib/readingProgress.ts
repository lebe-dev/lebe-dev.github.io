/**
 * Client-side reading progress for blog posts and podcast transcripts.
 *
 * Everything lives in one localStorage key so a single read/write covers the
 * whole site. The helpers below are pure — the browser-facing wrappers at the
 * bottom are the only part that touches localStorage, so the logic stays
 * testable in node.
 *
 * Identity is deliberately language-independent: a post is keyed by its
 * `translationKey`, so reading it in Russian marks the English translation read
 * too. A podcast episode is keyed by its slug for the "read" flag, but the
 * scroll position is kept per transcript language — the same episode in two
 * languages is two different texts to scroll through.
 */

export const STORAGE_KEY = 'reading-progress';
export const STORE_VERSION = 1;

/** Scrolled this far through the content counts as read. */
export const READ_THRESHOLD = 0.95;

/** Below this the reader has barely started — offering to resume is noise. */
export const RESUME_MIN = 0.03;

/** Entries kept; the least recently touched are dropped past this. */
export const MAX_ENTRIES = 500;

export interface Entry {
  /** Last reading position, 0…1. */
  p: number;
  read: boolean;
  /** Epoch ms of the last update — the pruning order. */
  at: number;
}

export interface Store {
  v: number;
  items: Record<string, Entry>;
}

/**
 * Where a piece of content stores its state. The two ids coincide for posts and
 * differ for podcasts, whose position is per transcript language while the
 * "read" flag belongs to the episode as a whole.
 */
export interface Target {
  progressId: string;
  readId: string;
}

export const emptyStore = (): Store => ({ v: STORE_VERSION, items: {} });

/** A post is identified by its `translationKey` (its slug as a fallback). */
export const postTarget = (key: string): Target => ({
  progressId: `post:${key}`,
  readId: `post:${key}`,
});

export const podcastTarget = (slug: string, lang: string): Target => ({
  progressId: `podcast:${slug}:${lang}`,
  readId: `podcast:${slug}`,
});

const isEntry = (value: unknown): value is Entry => {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.p === 'number' &&
    Number.isFinite(entry.p) &&
    typeof entry.read === 'boolean' &&
    typeof entry.at === 'number' &&
    Number.isFinite(entry.at)
  );
};

export const clampRatio = (p: number): number => {
  if (!Number.isFinite(p)) return 0;
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
};

/** Anything unparseable, of a foreign version or malformed reads as empty. */
export const parseStore = (raw: string | null | undefined): Store => {
  if (!raw) return emptyStore();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyStore();
  }

  if (typeof parsed !== 'object' || parsed === null) return emptyStore();
  const store = parsed as Partial<Store>;
  if (store.v !== STORE_VERSION) return emptyStore();
  if (typeof store.items !== 'object' || store.items === null) return emptyStore();

  const items: Record<string, Entry> = {};
  for (const [id, entry] of Object.entries(store.items)) {
    if (!isEntry(entry)) continue;
    items[id] = { p: clampRatio(entry.p), read: entry.read, at: entry.at };
  }
  return { v: STORE_VERSION, items };
};

export const serializeStore = (store: Store): string => JSON.stringify(store);

export const getProgress = (store: Store, target: Target): number =>
  store.items[target.progressId]?.p ?? 0;

export const isRead = (store: Store, target: Target): boolean =>
  store.items[target.readId]?.read ?? false;

const touch = (store: Store, id: string, patch: Partial<Entry>, now: number): Store => {
  const previous = store.items[id] ?? { p: 0, read: false, at: now };
  return {
    v: STORE_VERSION,
    items: { ...store.items, [id]: { ...previous, ...patch, at: now } },
  };
};

/**
 * Record a reading position. Reaching {@link READ_THRESHOLD} marks the content
 * read; an existing "read" flag is never cleared by scrolling back up.
 */
export const setProgress = (store: Store, target: Target, p: number, now: number): Store => {
  const ratio = clampRatio(p);
  const next = touch(store, target.progressId, { p: ratio }, now);
  if (ratio < READ_THRESHOLD || isRead(next, target)) return next;
  return touch(next, target.readId, { read: true }, now);
};

/**
 * Mark read or unread by hand. Marking read completes the position; unmarking
 * resets it, so the resume prompt does not immediately offer the very end.
 */
export const setRead = (store: Store, target: Target, read: boolean, now: number): Store => {
  const next = touch(store, target.progressId, { p: read ? 1 : 0 }, now);
  return touch(next, target.readId, { read }, now);
};

/** Drop the least recently touched entries past `max`. */
export const prune = (store: Store, max = MAX_ENTRIES): Store => {
  const ids = Object.keys(store.items);
  if (ids.length <= max) return store;

  const kept = ids
    .sort((a, b) => store.items[b].at - store.items[a].at)
    .slice(0, max);
  const items: Record<string, Entry> = {};
  for (const id of kept) items[id] = store.items[id];
  return { v: STORE_VERSION, items };
};

export interface ScrollGeometry {
  /** Current window scroll offset. */
  scrollY: number;
  viewportHeight: number;
  /** Distance from the top of the document to the top of the content. */
  contentTop: number;
  contentHeight: number;
}

/**
 * How far through the content the reader is, 0…1 — measured by the *bottom* of
 * the viewport, so the last screenful counts as read. Content shorter than the
 * viewport is read as soon as it is opened.
 */
export const scrollRatio = ({
  scrollY,
  viewportHeight,
  contentTop,
  contentHeight,
}: ScrollGeometry): number => {
  const span = contentHeight - viewportHeight;
  if (span <= 0) return 1;
  return clampRatio((scrollY - contentTop) / span);
};

/** The scroll offset that puts the reader back at `p` — the inverse of {@link scrollRatio}. */
export const scrollOffsetFor = (p: number, geometry: ScrollGeometry): number => {
  const { viewportHeight, contentTop, contentHeight } = geometry;
  const span = contentHeight - viewportHeight;
  if (span <= 0) return contentTop;
  return contentTop + clampRatio(p) * span;
};

/** Whether an unfinished position is worth offering to resume from. */
export const shouldResume = (p: number, read: boolean): boolean =>
  !read && p >= RESUME_MIN && p < READ_THRESHOLD;

export const formatPercent = (p: number): string => `${Math.round(clampRatio(p) * 100)}%`;

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Safari in private mode throws on access rather than on use.
    return null;
  }
};

export const loadStore = (): Store => {
  try {
    return parseStore(storage()?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return emptyStore();
  }
};

export const saveStore = (store: Store): void => {
  try {
    storage()?.setItem(STORAGE_KEY, serializeStore(prune(store)));
  } catch {
    // A full or unavailable storage box must never break reading.
  }
};

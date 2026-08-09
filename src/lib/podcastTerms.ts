/**
 * Glossary terms highlighted inline in a transcript.
 *
 * The positions are precomputed by scripts/glossary_terms.py (`just glossary`),
 * because finding "випассану" from the glossary's "Випассана" needs Russian
 * morphology we don't want to ship to the browser. This module only slices the
 * text at the offsets that script produced.
 *
 * Kept apart from podcasts.ts on purpose: Transcript.svelte imports it, and
 * podcasts.ts would drag every transcript JSON into the client bundle.
 */

/** `[segment, from, to, term]` — the term is an index into that language's glossary. */
export type TermHit = readonly [number, number, number, number];

export interface TextPart {
  text: string;
  /** Index into the glossary, when this part is a term occurrence. */
  term?: number;
}

/** Hits bucketed by segment index, each bucket sorted by position. */
export const hitsBySegment = (hits: readonly TermHit[]): Map<number, TermHit[]> => {
  const bySegment = new Map<number, TermHit[]>();
  for (const hit of hits) {
    const bucket = bySegment.get(hit[0]);
    if (bucket) bucket.push(hit);
    else bySegment.set(hit[0], [hit]);
  }
  for (const bucket of bySegment.values()) bucket.sort((a, b) => a[1] - b[1]);
  return bySegment;
};

/**
 * Split one segment into plain runs and term occurrences.
 *
 * Only the **first** occurrence of a term within the segment is marked up; the
 * speaker repeating "випассана" six times in one reply should not turn their
 * paragraph into a field of underlines. The sidecar still records every
 * occurrence — this is a reading decision, so it lives here and can change
 * without regenerating anything.
 *
 * Hits that no longer fit the text are dropped rather than trusted: an edited
 * transcript whose hits were not regenerated would otherwise underline an
 * arbitrary substring, which is worse than no highlight at all.
 */
export const splitSegment = (text: string, hits: readonly TermHit[]): TextPart[] => {
  if (hits.length === 0) return [{ text }];

  const parts: TextPart[] = [];
  const seen = new Set<number>();
  let cursor = 0;

  for (const [, from, to, term] of hits) {
    if (from < cursor || to > text.length || from >= to) continue;
    if (seen.has(term)) continue; // already introduced in this reply
    seen.add(term);
    if (from > cursor) parts.push({ text: text.slice(cursor, from) });
    parts.push({ text: text.slice(from, to), term });
    cursor = to;
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
};

/**
 * A book chapter's Markdown body, cut into the blocks the page renders.
 *
 * Chapters are deliberately **not** run through Astro's Markdown pipeline. The
 * glossary tooltips need character offsets into the text (see podcastTerms.ts),
 * and offsets computed on the source do not survive a trip through HTML. So the
 * body uses a small, fixed subset of Markdown, parsed here and rendered by
 * ChapterBody.svelte the same way Transcript.svelte renders a transcript.
 *
 * The subset, and nothing else:
 *
 *     blank line        separates blocks
 *     ## text           a heading inside the chapter
 *     > text            a block quote
 *     *text*            emphasis, inside any block
 *
 * `scripts/glossary_terms.py` parses the same subset with the same rules —
 * `blocks()` and `EMPHASIS` have counterparts there, so a change to either has
 * to be made on both sides (the script's VERSION then forces a regeneration).
 */

export type BlockKind = 'p' | 'h2' | 'quote';

export interface Block {
  kind: BlockKind;
  /** The block's text with its marker stripped and its lines joined. */
  text: string;
}

/** `*text*` — one level, no nesting, never spanning a block. */
export const EMPHASIS = /\*([^*\n]+)\*/g;

/** Everything before the first blank line after a leading `---` fence. */
const FRONTMATTER = /^---\r?\n.*?\r?\n---\r?\n/s;

/** Drop the YAML frontmatter, so offsets are relative to the body alone. */
export const stripFrontmatter = (source: string): string => source.replace(FRONTMATTER, '');

/**
 * Split a chapter body into blocks.
 *
 * A block's inner newlines become spaces: the source is wrapped for the sake of
 * diffs, and a hard wrap must not turn into a term that no longer matches.
 */
export const blocks = (body: string): Block[] => {
  const out: Block[] = [];

  for (const chunk of stripFrontmatter(body).split(/\r?\n[ \t]*\r?\n/)) {
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines[0].startsWith('## ')) {
      out.push({ kind: 'h2', text: lines.join(' ').slice(3).trim() });
      continue;
    }

    if (lines[0].startsWith('>')) {
      const text = lines.map((line) => line.replace(/^>\s?/, '')).join(' ').trim();
      out.push({ kind: 'quote', text });
      continue;
    }

    out.push({ kind: 'p', text: lines.join(' ') });
  }

  return out;
};

export interface EmphasisPart {
  text: string;
  em?: boolean;
}

/**
 * Cut a run of text at its `*emphasis*` markers.
 *
 * Called on the plain runs `splitSegment()` produced, never on a term run: the
 * generator refuses any hit that overlaps an emphasis span, so a run always
 * carries balanced markers and a term is never half-italic.
 */
export const splitEmphasis = (text: string): EmphasisPart[] => {
  const parts: EmphasisPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(EMPHASIS)) {
    const at = match.index;
    if (at > cursor) parts.push({ text: text.slice(cursor, at) });
    parts.push({ text: match[1], em: true });
    cursor = at + match[0].length;
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length > 0 ? parts : [{ text }];
};

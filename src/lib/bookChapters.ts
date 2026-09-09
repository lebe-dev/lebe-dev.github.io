import type { TermHit } from './podcastTerms';

/**
 * The generated glossary sidecars of the book chapters.
 *
 * One file per chapter that has a glossary, written by `just glossary` next to
 * the Markdown it belongs to. Keyed here by `<book>/<chapterKey>`, the same id
 * the content collection gives the chapter.
 */
interface Sidecar {
  version: number;
  sourceHash: string;
  hits: TermHit[];
}

const sidecars = import.meta.glob<Sidecar>('../content/books/*/*.terms.json', {
  eager: true,
  import: 'default',
});

/** `../content/books/mctb2/preface.terms.json` → `mctb2/preface`. */
const idOf = (path: string): string => {
  const match = path.match(/books\/([^/]+)\/(.+)\.terms\.json$/);
  return match ? `${match[1]}/${match[2]}` : path;
};

const byId = new Map(Object.entries(sidecars).map(([path, data]) => [idOf(path), data]));

/**
 * Where the glossary terms sit in this chapter's blocks.
 *
 * Empty when the chapter has no glossary — then nothing is highlighted, which
 * is exactly right rather than an error.
 */
export const chapterHits = (id: string): TermHit[] => byId.get(id)?.hits ?? [];

/** `mctb2/preface-to-the-second-edition` → both halves. */
export const parseChapterId = (id: string): { book: string; key: string } => {
  const at = id.indexOf('/');
  return at < 0 ? { book: id, key: '' } : { book: id.slice(0, at), key: id.slice(at + 1) };
};

import { books, type Book, type BookChapter, type BookPart } from '../data/books';
import { bookChapterTarget, type Target } from './readingProgress';

/** The book behind a slug, or undefined for an unknown one. */
export const findBook = (slug: string): Book | undefined =>
  books.find((book) => book.slug === slug);

/** Books newest-added first — the order the listing page uses. */
export const listBooks = (): Book[] =>
  [...books].sort((a, b) => new Date(b.dateAdded).valueOf() - new Date(a.dateAdded).valueOf());

/** Every chapter of the book in reading order, parts flattened away. */
export const allChapters = (book: Book): BookChapter[] => book.toc.flatMap((part) => part.chapters);

/** How many chapters the table of contents lists, the closing pieces included. */
export const chapterCount = (book: Book): number => allChapters(book).length;

/** Anything but letters and digits becomes a hyphen; used for chapter keys. */
const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Stable id of a chapter inside its book — the number printed in the book, or a
 * slug of the original title for the closing pieces, which have none.
 *
 * It goes into the reader's localStorage, so it has to stay put: the original
 * titles are those of a published edition and the numbers do not move, while
 * the position of a chapter in the list would shift the moment one is inserted.
 */
export const chapterKey = (chapter: BookChapter): string =>
  chapter.number !== undefined ? String(chapter.number) : slugify(chapter.originalTitle);

/** Where a chapter's reading state lives. */
export const chapterTarget = (book: Book, chapter: BookChapter): Target =>
  bookChapterTarget(book.slug, chapterKey(chapter));

/** Read ids of one part's chapters, in reading order. */
export const partReadIds = (book: Book, part: BookPart): string[] =>
  part.chapters.map((chapter) => chapterTarget(book, chapter).readId);

/**
 * Read ids of the whole book. A listing aggregates a book's mark from these
 * rather than from an id of its own — see `completion()` in readingProgress.
 */
export const bookReadIds = (book: Book): string[] =>
  allChapters(book).map((chapter) => chapterTarget(book, chapter).readId);

/** How a chapter is named on its own, for a button label or a screen reader. */
export const chapterLabel = (chapter: BookChapter): string =>
  chapter.number !== undefined ? `Глава ${chapter.number}. ${chapter.title}` : `«${chapter.title}»`;

/** Russian noun agreement: "1 глава", "2 главы", "5 глав". */
export const pluralRu = (n: number, forms: [string, string, string]): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
};

/** "6 частей · 73 главы", the meta line of a book entry. */
export const formatVolume = (book: Book): string => {
  const parts = book.toc.length;
  const chapters = chapterCount(book);
  return [
    `${parts} ${pluralRu(parts, ['часть', 'части', 'частей'])}`,
    `${chapters} ${pluralRu(chapters, ['глава', 'главы', 'глав'])}`,
  ].join(' · ');
};

/** How a book is named among other kinds of entry: Книга «…» (Автор). */
export const bookLabel = (book: Book): string => `Книга «${book.title}» (${book.author})`;

/** Host of a URL without the www., the way outbound links are labelled. */
export const linkHost = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

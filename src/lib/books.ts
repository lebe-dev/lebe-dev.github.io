import { books, type Book, type BookChapter } from '../data/books';

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

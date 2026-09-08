import { describe, expect, it } from 'vitest';
import { books } from '../data/books';
import { allChapters, bookLabel, chapterCount, findBook, formatVolume, linkHost, listBooks, pluralRu } from './books';

describe('findBook', () => {
  it('finds a book by its slug', () => {
    expect(findBook('mctb2')?.shortTitle).toBe('MCTB2');
  });

  it('returns undefined for an unknown slug', () => {
    expect(findBook('nope')).toBeUndefined();
  });
});

describe('listBooks', () => {
  it('sorts newest-added first without touching the source array', () => {
    const sorted = listBooks();
    const dates = sorted.map((b) => b.dateAdded);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(sorted).not.toBe(books);
  });
});

describe('allChapters / chapterCount', () => {
  const book = findBook('mctb2')!;

  it('flattens the parts in reading order', () => {
    const chapters = allChapters(book);
    expect(chapters[0].originalTitle).toBe('Introduction to Part I');
    expect(chapters.at(-1)?.originalTitle).toBe('Last Words of Wisdom');
  });

  it('counts every chapter, numbered or not', () => {
    expect(chapterCount(book)).toBe(allChapters(book).length);
  });
});

describe('pluralRu', () => {
  const forms: [string, string, string] = ['глава', 'главы', 'глав'];

  it.each([
    [1, 'глава'],
    [2, 'главы'],
    [4, 'главы'],
    [5, 'глав'],
    [11, 'глав'],
    [21, 'глава'],
    [22, 'главы'],
    [25, 'глав'],
    [111, 'глав'],
  ])('agrees with %i', (n, expected) => {
    expect(pluralRu(n, forms)).toBe(expected);
  });
});

describe('formatVolume', () => {
  it('reports both counts', () => {
    expect(formatVolume(findBook('mctb2')!)).toBe('6 частей · 73 главы');
  });
});

describe('bookLabel', () => {
  it('names the book in quotes with its author, without a date', () => {
    expect(bookLabel(findBook('mctb2')!)).toBe(
      'Книга «Овладение основами учения Будды» (Дэниел М. Инграм)',
    );
  });
});

describe('linkHost', () => {
  it('drops the www.', () => {
    expect(linkHost('https://www.mctb.org/mctb2/')).toBe('mctb.org');
  });
});

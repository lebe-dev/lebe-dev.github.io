import { describe, expect, it } from 'vitest';
import { books } from '../data/books';
import {
  allChapters,
  bookLabel,
  bookReadIds,
  chapterCount,
  chapterKey,
  chapterLabel,
  chapterNeighbours,
  chapterTarget,
  findBook,
  findChapter,
  formatVolume,
  linkHost,
  listBooks,
  partReadIds,
  pluralRu,
} from './books';

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

  it('puts the front matter first, then flattens the parts in reading order', () => {
    const chapters = allChapters(book);
    expect(chapters[0].originalTitle).toBe('Preface to the Second Edition');
    expect(chapters[1].originalTitle).toBe('Introduction to Part I');
    expect(chapters.at(-1)?.originalTitle).toBe('Last Words of Wisdom');
  });

  it('reads a book with no front matter as its parts alone', () => {
    const { front, ...withoutFront } = book;
    expect(allChapters(withoutFront)).toHaveLength(allChapters(book).length - front!.length);
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
    expect(formatVolume(findBook('mctb2')!)).toBe('6 частей · 74 главы');
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

describe('chapterKey', () => {
  const book = findBook('mctb2')!;

  it('uses the number printed in the book', () => {
    expect(chapterKey({ number: 7, title: 'Семь', originalTitle: 'The Seven' })).toBe('7');
  });

  it('falls back to a slug of the original title for the closing pieces', () => {
    expect(chapterKey({ title: 'Напутствие', originalTitle: 'Final Wishes' })).toBe('final-wishes');
  });

  it('slugifies punctuation away', () => {
    expect(chapterKey({ title: 'Что дальше', originalTitle: 'Beyond ("What Next?")' })).toBe(
      'beyond-what-next',
    );
  });

  it('is unique across every chapter of a real book', () => {
    const keys = allChapters(book).map(chapterKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('chapterTarget', () => {
  const book = findBook('mctb2')!;

  it('namespaces a chapter under its book', () => {
    expect(chapterTarget(book, { number: 1, title: 'Введение', originalTitle: 'Intro' })).toEqual({
      progressId: 'book:mctb2:1',
      readId: 'book:mctb2:1',
    });
  });
});

describe('bookReadIds / partReadIds', () => {
  const book = findBook('mctb2')!;

  it('lists one id per chapter, in reading order', () => {
    const ids = bookReadIds(book);
    expect(ids).toHaveLength(chapterCount(book));
    expect(ids[0]).toBe('book:mctb2:preface-to-the-second-edition');
    expect(ids[1]).toBe('book:mctb2:1');
    expect(ids.at(-1)).toBe('book:mctb2:last-words-of-wisdom');
  });

  it('splits into the front matter and the parts without losing or duplicating a chapter', () => {
    const fromFront = (book.front ?? []).map((c) => chapterTarget(book, c).readId);
    const fromParts = book.toc.flatMap((part) => partReadIds(book, part));
    expect([...fromFront, ...fromParts]).toEqual(bookReadIds(book));
  });
});

describe('chapterLabel', () => {
  it('names a numbered chapter by its number', () => {
    expect(chapterLabel({ number: 5, title: 'Три характеристики', originalTitle: 'The Three' })).toBe(
      'Глава 5. Три характеристики',
    );
  });

  it('quotes a closing piece, which has no number', () => {
    expect(chapterLabel({ title: 'Напутствие', originalTitle: 'Final Wishes' })).toBe(
      '«Напутствие»',
    );
  });
});

describe('findChapter', () => {
  const book = findBook('mctb2')!;

  it('finds a numbered chapter by its key', () => {
    expect(findChapter(book, '5')?.originalTitle).toBe('The Three Characteristics');
  });

  it('finds a front-matter piece by its slug', () => {
    expect(findChapter(book, 'preface-to-the-second-edition')?.title).toBe(
      'Предисловие ко второму изданию',
    );
  });

  it('returns undefined for a key the book does not have', () => {
    expect(findChapter(book, '999')).toBeUndefined();
  });
});

describe('chapterNeighbours', () => {
  const book = findBook('mctb2')!;

  it('has no previous chapter before the front matter', () => {
    const { prev, next } = chapterNeighbours(book, 'preface-to-the-second-edition');
    expect(prev).toBeUndefined();
    expect(next?.originalTitle).toBe('Introduction to Part I');
  });

  it('crosses a part boundary rather than stopping at it', () => {
    // 16 closes Part I, 17 opens Part II.
    expect(chapterNeighbours(book, '16').next?.originalTitle).toBe(
      'Introduction to Parts Two through Five',
    );
  });

  it('has no next chapter after the last one', () => {
    expect(chapterNeighbours(book, 'last-words-of-wisdom').next).toBeUndefined();
  });

  it('returns nothing for an unknown key', () => {
    expect(chapterNeighbours(book, 'nope')).toEqual({});
  });
});

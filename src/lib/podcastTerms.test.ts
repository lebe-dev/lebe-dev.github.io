import { describe, expect, it } from 'vitest';
import { hitsBySegment, splitSegment, type TermHit } from './podcastTerms';

describe('hitsBySegment', () => {
  it('buckets hits by segment and sorts each bucket by position', () => {
    const hits: TermHit[] = [
      [2, 10, 15, 0],
      [0, 30, 35, 1],
      [2, 0, 4, 1],
    ];
    const bySegment = hitsBySegment(hits);
    expect([...bySegment.keys()].sort()).toEqual([0, 2]);
    expect(bySegment.get(2)).toEqual([
      [2, 0, 4, 1],
      [2, 10, 15, 0],
    ]);
  });

  it('returns an empty map for a transcript with no glossary', () => {
    expect(hitsBySegment([]).size).toBe(0);
  });
});

describe('splitSegment', () => {
  const text = 'Практика випассаны учит внимательности.';

  it('returns the text untouched when there are no hits', () => {
    expect(splitSegment(text, [])).toEqual([{ text }]);
  });

  it('splits around a hit and keeps every character', () => {
    const parts = splitSegment(text, [[0, 9, 18, 3]]);
    expect(parts).toEqual([
      { text: 'Практика ' },
      { text: 'випассаны', term: 3 },
      { text: ' учит внимательности.' },
    ]);
    expect(parts.map((p) => p.text).join('')).toBe(text);
  });

  it('marks up only the first occurrence of a term in the segment', () => {
    const twice = 'Дзен и снова дзен.';
    const parts = splitSegment(twice, [
      [0, 0, 4, 0],
      [0, 13, 17, 0],
    ]);
    expect(parts).toEqual([{ text: 'Дзен', term: 0 }, { text: ' и снова дзен.' }]);
    expect(parts.map((p) => p.text).join('')).toBe(twice);
  });

  it('marks up each distinct term once', () => {
    const both = 'Дзен и випассана.';
    const parts = splitSegment(both, [
      [0, 0, 4, 0],
      [0, 7, 16, 1],
    ]);
    expect(parts.filter((p) => p.term !== undefined).map((p) => p.term)).toEqual([0, 1]);
    expect(parts.map((p) => p.text).join('')).toBe(both);
  });

  it('keeps a hit that ends exactly at the end of the text', () => {
    const parts = splitSegment('Это дзен', [[0, 4, 8, 0]]);
    expect(parts).toEqual([{ text: 'Это ' }, { text: 'дзен', term: 0 }]);
  });

  // An edited transcript whose hits were not regenerated would otherwise
  // underline an arbitrary substring, which reads as a bug rather than as
  // missing data.
  it('drops hits that no longer fit the text', () => {
    expect(splitSegment(text, [[0, 30, 999, 0]])).toEqual([{ text }]);
    expect(splitSegment(text, [[0, 5, 5, 0]])).toEqual([{ text }]);
  });

  it('drops a hit that overlaps the previous one', () => {
    const parts = splitSegment(text, [
      [0, 0, 18, 0],
      [0, 9, 18, 1],
    ]);
    expect(parts).toEqual([
      { text: 'Практика випассаны', term: 0 },
      { text: ' учит внимательности.' },
    ]);
  });
});

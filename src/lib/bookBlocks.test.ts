import { describe, expect, it } from 'vitest';
import { blocks, splitEmphasis, stripFrontmatter } from './bookBlocks';

describe('stripFrontmatter', () => {
  it('drops a leading YAML block', () => {
    expect(stripFrontmatter('---\ntitle: x\n---\nТекст')).toBe('Текст');
  });

  it('leaves a body that has none alone', () => {
    expect(stripFrontmatter('Текст --- ещё')).toBe('Текст --- ещё');
  });

  it('does not eat a horizontal rule further down', () => {
    expect(stripFrontmatter('Первый\n\n---\n\nВторой')).toBe('Первый\n\n---\n\nВторой');
  });
});

describe('blocks', () => {
  it('splits on blank lines', () => {
    expect(blocks('Первый\n\nВторой')).toEqual([
      { kind: 'p', text: 'Первый' },
      { kind: 'p', text: 'Второй' },
    ]);
  });

  it('joins a hard-wrapped paragraph into one line', () => {
    // A wrapped source must not break a term across two blocks.
    expect(blocks('одна строка\nвторая строка')).toEqual([
      { kind: 'p', text: 'одна строка вторая строка' },
    ]);
  });

  it('reads "## " as a heading and strips the marker', () => {
    expect(blocks('## Заголовок')).toEqual([{ kind: 'h2', text: 'Заголовок' }]);
  });

  it('reads "> " as a quote and strips it from every line', () => {
    expect(blocks('> первая\n> вторая')).toEqual([{ kind: 'quote', text: 'первая вторая' }]);
  });

  it('ignores blank and whitespace-only chunks', () => {
    expect(blocks('Первый\n\n   \n\nВторой')).toHaveLength(2);
  });

  it('tolerates CRLF', () => {
    expect(blocks('Первый\r\n\r\nВторой')).toHaveLength(2);
  });

  it('skips the frontmatter of a real chapter file', () => {
    expect(blocks('---\nsourceUrl: https://x/\n---\n\nТекст')).toEqual([
      { kind: 'p', text: 'Текст' },
    ]);
  });
});

describe('splitEmphasis', () => {
  it('returns one plain part when there is no emphasis', () => {
    expect(splitEmphasis('обычный текст')).toEqual([{ text: 'обычный текст' }]);
  });

  it('marks an emphasised run and drops its asterisks', () => {
    expect(splitEmphasis('книга *MCTB1* вышла')).toEqual([
      { text: 'книга ' },
      { text: 'MCTB1', em: true },
      { text: ' вышла' },
    ]);
  });

  it('handles several runs', () => {
    expect(splitEmphasis('*раз* и *два*')).toEqual([
      { text: 'раз', em: true },
      { text: ' и ' },
      { text: 'два', em: true },
    ]);
  });

  it('leaves a lone asterisk as plain text', () => {
    expect(splitEmphasis('5 * 3 = 15')).toEqual([{ text: '5 * 3 = 15' }]);
  });

  it('never spans a newline', () => {
    expect(splitEmphasis('*раз\nдва*')).toEqual([{ text: '*раз\nдва*' }]);
  });
});

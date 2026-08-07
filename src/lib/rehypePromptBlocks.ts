import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import type { VFile } from 'vfile';
import { ui, defaultLang, type Lang } from '../i18n/ui';

const isLang = (value: unknown): value is Lang => typeof value === 'string' && value in ui;

const translate = (lang: Lang, key: 'prompt.label' | 'prompt.copy' | 'prompt.copied'): string =>
  ui[lang][key] ?? ui[defaultLang][key];

// Turns fenced ```prompt blocks into a labeled block with a copy-to-clipboard
// button (wired up client-side in PostLayout.astro). Runs after Astro's
// built-in Shiki highlighting, which stamps `data-language` on the <pre>.
export function rehypePromptBlocks() {
  return (tree: Root, file: VFile) => {
    const frontmatterLang = (file.data as { astro?: { frontmatter?: { lang?: unknown } } })?.astro
      ?.frontmatter?.lang;
    const lang: Lang = isLang(frontmatterLang) ? frontmatterLang : defaultLang;

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || parent == null || index == null) return;
      if (node.properties?.dataLanguage !== 'prompt') return;

      const codeEl = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'code',
      );
      if (!codeEl) return;

      // The prompt language isn't a real Shiki grammar; drop the noisy
      // fallback attribute Shiki leaves behind on the highlighted <pre>.
      delete node.properties.dataLanguage;

      const label = translate(lang, 'prompt.label');
      const copyLabel = translate(lang, 'prompt.copy');
      const copiedLabel = translate(lang, 'prompt.copied');

      const labelIcon: Element = {
        type: 'element',
        tagName: 'svg',
        properties: {
          viewBox: '0 0 24 24',
          width: '13',
          height: '13',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ariaHidden: 'true',
        },
        children: [
          {
            type: 'element',
            tagName: 'polyline',
            properties: { points: '4 17 10 11 4 5' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'line',
            properties: { x1: '12', y1: '19', x2: '20', y2: '19' },
            children: [],
          },
        ],
      };

      const copyIcon: Element = {
        type: 'element',
        tagName: 'svg',
        properties: {
          className: ['prompt-block__icon', 'prompt-block__icon--copy'],
          viewBox: '0 0 24 24',
          width: '13',
          height: '13',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ariaHidden: 'true',
        },
        children: [
          {
            type: 'element',
            tagName: 'rect',
            properties: { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'path',
            properties: { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
            children: [],
          },
        ],
      };

      const checkIcon: Element = {
        type: 'element',
        tagName: 'svg',
        properties: {
          className: ['prompt-block__icon', 'prompt-block__icon--check'],
          viewBox: '0 0 24 24',
          width: '13',
          height: '13',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          ariaHidden: 'true',
        },
        children: [
          { type: 'element', tagName: 'path', properties: { d: 'M20 6 9 17l-5-5' }, children: [] },
        ],
      };

      const header: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['prompt-block__header'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['prompt-block__label'] },
            children: [labelIcon, { type: 'text', value: label }],
          },
          {
            type: 'element',
            tagName: 'button',
            properties: {
              type: 'button',
              className: ['prompt-block__copy'],
              ariaLabel: copyLabel,
              title: copyLabel,
              dataCopyPrompt: '',
              dataLabelCopy: copyLabel,
              dataLabelCopied: copiedLabel,
            },
            children: [copyIcon, checkIcon],
          },
        ],
      };

      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['prompt-block'] },
        children: [header, node],
      };

      parent.children[index] = wrapper;
    });
  };
}

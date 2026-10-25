/**
 * Highlights fenced code blocks with Shiki and wraps each one in the mockup's
 * code block: a header with the file name, a language chip and a copy button,
 * then the code with line numbers (CSS counters in code.css).
 *
 *   ```sql title="roles.sql" {7}
 *
 * `title="…"` names the file; `{7}` or `{1,3-4}` highlights lines
 * (transformerMetaHighlight). An unknown language fails the build, so a typo
 * such as `pyhton` cannot ship as unhighlighted text. Mermaid fences never
 * get here: rehype-diagrams turns them into figures first.
 *
 * Runs after rehype-sanitize: the classes and the button it adds are ours.
 */
import { transformerMetaHighlight } from '@shikijs/transformers';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { bundledLanguagesInfo, createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { codeTheme, TOKEN_CLASS } from './code-theme.ts';
import { classes, el, isElement, text } from './hast.ts';

const PLAIN = new Set(['text', 'txt', 'plain', 'plaintext']);

let highlighter: Promise<Highlighter> | undefined;

function getHighlighter(): Promise<Highlighter> {
  // Languages load on first use; one highlighter serves the whole build.
  highlighter ??= createHighlighter({ themes: [codeTheme], langs: [] });
  return highlighter;
}

/** The bundled language for a fence name or alias, with its display name. */
function language(name: string): { id: string; label: string } | undefined {
  if (PLAIN.has(name)) return { id: 'text', label: 'Text' };
  const info = bundledLanguagesInfo.find((lang) => lang.id === name || lang.aliases?.includes(name));
  return info && { id: info.id, label: info.name };
}

function fenceLanguage(code: Element): string {
  const match = classes(code).find((name) => name.startsWith('language-'));
  return match ? match.slice('language-'.length).toLowerCase() : 'text';
}

function fileTitle(meta: string): string | undefined {
  const match = /(?:^|\s)title=(?:"([^"]*)"|'([^']*)')/.exec(meta);
  return match?.[1] ?? match?.[2];
}

/** Replaces Shiki's inline colours with token classes and drops every style. */
export function transformerTokenClasses(): ShikiTransformer {
  return {
    name: 'token-classes',
    pre(node) {
      node.properties = { className: ['code-body'], tabIndex: 0 };
    },
    span(node) {
      const style = String(node.properties.style ?? '');
      delete node.properties.style;
      const color = /(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i.exec(style)?.[1]?.toLowerCase();
      const token = color && TOKEN_CLASS.get(color);
      if (token) this.addClassToHast(node, token);
    },
  };
}

const copyIcon = el(
  'svg',
  {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ariaHidden: 'true',
  },
  [
    el('rect', { x: '9', y: '9', width: 12, height: 12, rx: '2' }),
    el('path', { d: 'M5 15V5a2 2 0 0 1 2-2h10' }),
  ],
);

function codeBlock(pre: Element, label: string, title: string | undefined): Element {
  const head = el('div', { className: ['code-head'] }, [
    el('div', { className: ['code-meta'] }, [
      ...(title ? [el('span', { className: ['code-file'] }, [text(title)])] : []),
      el('span', { className: ['code-lang'] }, [text(label)]),
    ]),
    // Hidden until src/scripts/copy-code.ts finds a working clipboard.
    el('button', { type: 'button', className: ['code-copy'], dataCopy: '', hidden: true }, [
      structuredClone(copyIcon),
      el('span', { dataCopyLabel: '', ariaLive: 'polite' }, [text('Copy')]),
    ]),
  ]);
  return el('div', { className: ['code'] }, [head, pre]);
}

/**
 * remark-rehype keeps a fence's meta (`title="roles.sql" {7}`) in node data,
 * which rehype-raw drops. Runs before rehype-raw and copies it to a
 * `data-meta` attribute, which the sanitiser allows on <code>.
 */
export const rehypeCodeMeta: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node) => {
    const meta = (node.data as { meta?: unknown } | undefined)?.meta;
    if (node.tagName === 'code' && typeof meta === 'string' && meta !== '') node.properties.dataMeta = meta;
  });
};

export const rehypeCode: Plugin<[], Root> = () => async (tree, file) => {
  const blocks: { pre: Element; code: Element; parent: Element | Root }[] = [];
  visit(tree, 'element', (node, _index, parent) => {
    const code = node.children[0];
    if (node.tagName !== 'pre' || !parent || node.children.length !== 1 || !isElement(code, 'code')) return;
    blocks.push({ pre: node, code, parent });
  });

  const shiki = await getHighlighter();
  for (const { pre, code, parent } of blocks) {
    const name = fenceLanguage(code);
    const lang = language(name);
    if (!lang) return file.fail(`Unknown code block language "${name}"`, code);
    if (lang.id !== 'text' && !shiki.getLoadedLanguages().includes(lang.id)) {
      await shiki.loadLanguage(lang.id as Parameters<Highlighter['loadLanguage']>[0]);
    }
    const meta = String(code.properties.dataMeta ?? '');
    const highlighted = shiki.codeToHast(toString(code).replace(/\n$/, ''), {
      lang: lang.id,
      theme: codeTheme.name!,
      meta: { __raw: meta },
      transformers: [transformerMetaHighlight(), transformerTokenClasses()],
    });
    const result = highlighted.children[0] as Element;
    parent.children[parent.children.indexOf(pre)] = codeBlock(result, lang.label, fileTitle(meta));
  }
};

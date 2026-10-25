/**
 * Footnotes become sidenotes (HANDOFF.md 6.1).
 *
 *   A median that is off by a few hours looks exactly like a correct one.[^1]
 *
 *   [^1]: Not a criticism of any particular model.
 *
 * GFM renders footnotes as a list at the end of the page. This plugin moves
 * each note next to the block that first refers to it: an
 * `<aside class="sidenotes">` right after that block. prose.css puts the
 * aside in the margin column from 960px and leaves it below the block on
 * narrower screens. GitHub's preview still shows ordinary footnotes.
 *
 * Runs after rehype-sanitize, which prefixes ids with "user-content-", so
 * notes and references are matched on their ids without that prefix.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';
import type { Plugin } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { el, isBlank, isElement, text } from './hast.ts';

const key = (id: string) => id.replace(/^#/, '').replace(/^(?:user-content-)+/, '');

/** A footnote's content without GFM's "↩" back links. */
function noteContent(item: Element): ElementContent[] {
  const content = structuredClone(item.children.filter((child) => !isBlank(child)));
  for (const block of content) {
    if (!isElement(block)) continue;
    visit(block, 'element', (node, index, parent) => {
      if (node.properties.dataFootnoteBackref === undefined || !parent || index === undefined) return;
      parent.children.splice(index, 1);
      const before = parent.children[index - 1];
      if (before?.type === 'text') before.value = before.value.trimEnd();
      return [SKIP, index];
    });
  }
  return content;
}

export const rehypeSidenotes: Plugin<[], Root> = () => (tree) => {
  const sectionIndex = tree.children.findIndex(
    (node) => isElement(node, 'section') && node.properties.dataFootnotes !== undefined,
  );
  if (sectionIndex === -1) return;

  const notes = new Map<string, Element>();
  visit(tree.children[sectionIndex] as Element, 'element', (node) => {
    if (node.tagName === 'li' && typeof node.properties.id === 'string') notes.set(key(node.properties.id), node);
  });
  tree.children.splice(sectionIndex, 1);

  const placed = new Set<string>();
  const after = new Map<RootContent, Element[]>();

  for (const block of tree.children) {
    if (!isElement(block)) continue;
    visit(block, 'element', (node, _index, parent) => {
      if (node.tagName !== 'a' || node.properties.dataFootnoteRef === undefined) return;
      const id = key(String(node.properties.href ?? ''));
      const number = toString(node).trim();
      const item = notes.get(id);
      if (!item) return;

      node.properties = { href: `#sn-${number}`, ariaLabel: `Note ${number}` };
      if (isElement(parent, 'sup')) parent.properties = { className: ['sidenote-ref'] };
      if (placed.has(id)) return;
      placed.add(id);

      const content = noteContent(item);
      const first = content[0];
      const numberLabel = el('span', { className: ['sidenote-num'] }, [text(number)]);
      if (isElement(first, 'p')) first.children.unshift(numberLabel);
      else content.unshift(numberLabel);
      const notesAfter = after.get(block) ?? [];
      notesAfter.push(el('div', { className: ['sidenote'], id: `sn-${number}` }, content));
      after.set(block, notesAfter);
    });
  }

  for (const [block, sidenotes] of after) {
    tree.children.splice(tree.children.indexOf(block) + 1, 0, el('aside', { className: ['sidenotes'] }, sidenotes));
  }
};

/**
 * GitHub alerts become notes (HANDOFF.md 5.4: surface background, a label,
 * no coloured border).
 *
 *   > [!NOTE]
 *   > Figures come from the project README.
 *
 * GitHub's preview renders the same syntax as its own alert box.
 */
import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { el, isBlank, isElement, text } from './hast.ts';

const LABELS = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
} as const;

const MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*(?:\r?\n|$)/i;

export const rehypeAlerts: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'blockquote' || !parent || index === undefined) return;
    const first = node.children.find((child) => !isBlank(child));
    const head = isElement(first, 'p') ? first.children[0] : undefined;
    if (!isElement(first, 'p') || head?.type !== 'text') return;
    const match = MARKER.exec(head.value);
    if (!match) return;

    const kind = match[1]!.toLowerCase() as keyof typeof LABELS;
    head.value = head.value.slice(match[0].length);
    if (head.value === '') first.children.shift();
    // A marker on a line of its own leaves an empty first paragraph.
    const body = first.children.every(isBlank) ? node.children.filter((child) => child !== first) : node.children;

    parent.children[index] = el('div', { className: ['callout'], dataKind: kind, role: 'note' }, [
      el('p', { className: ['callout-label'] }, [text(LABELS[kind])]),
      ...body,
    ]);
    return SKIP;
  });
};

/**
 * Tables: numbered captions, row headers, the Verdict row, and a scroll box
 * for narrow screens.
 *
 *   Table: Who computes the number?
 *
 *   |              | Model computes | Postgres computes |
 *   | ------------ | -------------- | ----------------- |
 *   | Accuracy     | Approximate    | Exact             |
 *   | Verdict      | Avoid          | **Use this**      |
 *
 * A paragraph starting with "Table:" right above a table becomes its caption,
 * "Table N" (Pandoc's convention; GitHub shows it as a line above the table).
 * When the top-left header cell is empty, the first column holds row headers.
 * A body row whose first cell reads "Verdict" is the verdict row; its bold
 * cell takes the post's accent colour (prose.css).
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { el, isBlank, isElement, text } from './hast.ts';

const CAPTION = /^Table:\s*/;
const TABLE_PARTS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr']);

function rows(table: Element, section: 'thead' | 'tbody'): Element[] {
  return table.children
    .filter((child): child is Element => isElement(child, section))
    .flatMap((part) => part.children.filter((row): row is Element => isElement(row, 'tr')));
}

function cells(row: Element): Element[] {
  return row.children.filter((cell): cell is Element => isElement(cell, 'th') || isElement(cell, 'td'));
}

/** The paragraph right before `index`, if it starts with "Table:". */
function captionBefore(siblings: (RootContent | ElementContent)[], index: number): number {
  let i = index - 1;
  while (i >= 0 && isBlank(siblings[i]!)) i--;
  const candidate = siblings[i];
  const first = isElement(candidate, 'p') ? candidate.children[0] : undefined;
  return first?.type === 'text' && CAPTION.test(first.value) ? i : -1;
}

export const rehypeTables: Plugin<[], Root> = () => (tree) => {
  const tables: { table: Element; parent: Element | Root }[] = [];
  visit(tree, 'element', (node, _index, parent) => {
    if (node.tagName === 'table' && parent) tables.push({ table: node, parent });
  });

  let number = 0;
  for (const { table, parent } of tables) {
    const header = rows(table, 'thead')[0];
    const headerCells = header ? cells(header) : [];
    for (const cell of headerCells) cell.properties.scope = 'col';

    if (headerCells[0] && toString(headerCells[0]).trim() === '') {
      for (const row of rows(table, 'tbody')) {
        const first = cells(row)[0];
        if (first) Object.assign(first, { tagName: 'th', properties: { ...first.properties, scope: 'row' } });
      }
    }

    for (const row of rows(table, 'tbody')) {
      const first = cells(row)[0];
      if (first && toString(first).trim().toLowerCase() === 'verdict') row.properties.className = ['verdict'];
    }

    const siblings = parent.children;
    const captionIndex = captionBefore(siblings, siblings.indexOf(table));
    if (captionIndex !== -1) {
      const paragraph = siblings[captionIndex] as Element;
      const first = paragraph.children[0] as { value: string };
      first.value = first.value.replace(CAPTION, '');
      number++;
      table.children.unshift(
        el('caption', {}, [el('span', { className: ['table-num'] }, [text(`Table ${number}`)]), text(' '), ...paragraph.children]),
      );
      siblings.splice(captionIndex, 1);
    }

    // rehype-raw moves whitespace between table rows out in front of the
    // table (HTML's "foster parenting"). Drop it, and tidy what was moved.
    visit(table, 'element', (node) => {
      if (TABLE_PARTS.has(node.tagName)) node.children = node.children.filter((child) => !isBlank(child));
    });
    const index = siblings.indexOf(table);
    const before = siblings[index - 1];
    if (before?.type === 'text' && isBlank(before)) before.value = '\n';

    siblings[index] = el('div', { className: ['table-scroll'] }, [table]);
  }
};

/**
 * Mermaid fences become figures with an inline SVG, rendered at build time by
 * beautiful-mermaid: no browser in the build, no diagram JavaScript on the page.
 *
 *   Figure: The model writes queries; the database does the arithmetic.
 *
 *   ```mermaid
 *   flowchart LR
 *     accDescr: A question goes to the model, which writes SQL for the database.
 *     Q["<b>Question</b><br>from an engineer"]:::slate --> M["<b>Model</b><br>writes SQL"]:::violet
 *   %% legend
 *   ```
 *
 * A "Figure:" line right above the fence becomes the caption; rehype-figures
 * numbers it with the images. `accDescr` is required, like alt text, and
 * names the SVG for screen readers. Nodes take a palette category with
 * `:::violet` or `class A,B violet` (diagram-theme.ts); posts never carry
 * colour values. `%% legend` adds a legend of the categories used, and
 * `%% legend violet=Model` renames one. Mermaid comments (`%%`) and the
 * class names are invisible in GitHub's preview, which renders the same fence.
 *
 * Runs after rehype-sanitize. The diagram source is author text and the SVG
 * carries it, so the SVG is parsed and sanitised again, with an SVG-only
 * allowlist, before the theme pass reads it.
 */
import { parseMermaid, renderMermaidSVG } from 'beautiful-mermaid';
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { sanitize, type Schema } from 'hast-util-sanitize';
import { toString } from 'hast-util-to-string';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { CATEGORIES, CLASS_DEFS, isCategory, LEGEND_LABELS, paintRole, type Category } from './diagram-theme.ts';
import { classes, el, isBlank, isElement, text } from './hast.ts';

/** The renderer draws 13px labels; scaled up, they are the mockup's 15px. */
const SCALE = 15 / 13;
/** Wider than the reading column (--measure): the figure breaks out to 956px. */
const COLUMN = 680;
/** Figures shrink with the screen to this share of their size, then scroll. */
const FLOOR = 0.75;
/**
 * Floors come in 40px steps, `diagram-min-280` to `diagram-min-920` in
 * figures.css, rounded up so a figure never shrinks below FLOOR. 920 stays
 * under the 956px of a wide figure, so nothing scrolls on a desktop.
 */
const FLOOR_STEP = 40;
const FLOOR_MIN = 280;
const FLOOR_MAX = 920;

const RENDER_OPTIONS = { bg: 'none', fg: 'none', transparent: true, font: 'Inter', padding: 8 };
const CAPTION = /^Figure:\s*/;

// ---------------------------------------------------------------------------
// Source: what the author wrote

interface Source {
  /** The diagram as the renderer gets it: no accessibility or comment lines, plus the classDefs. */
  body: string;
  description: string;
  /** Legend labels by category, when the author asked for a legend. */
  legend?: Map<Category, string>;
  used: Set<Category>;
}

class DiagramError extends Error {}

const TYPES: [RegExp, string][] = [
  [/^(?:flowchart|graph)\b/i, 'flowchart'],
  [/^sequenceDiagram\s*$/i, 'sequence'],
];

/** Reads a fence: accessibility lines, legend comments, class names; throws a DiagramError on a rule broken. */
export function readSource(source: string): Source {
  const body: string[] = [];
  let title = '';
  let description = '';
  let legend: Map<Category, string> | undefined;
  const used = new Set<Category>();
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    let match: RegExpExecArray | null;
    if ((match = /^accTitle\s*:\s*(.*)$/.exec(line))) title = match[1]!.trim();
    else if ((match = /^accDescr\s*:\s*(.*)$/.exec(line))) description = match[1]!.trim();
    else if (/^accDescr\s*\{/.test(line)) {
      const block: string[] = [line.replace(/^accDescr\s*\{/, '')];
      while (!block.at(-1)!.includes('}') && i + 1 < lines.length) block.push(lines[++i]!.trim());
      description = block.join(' ').replace(/\}\s*$/, '').trim();
    } else if ((match = /^%%\s*legend\b(.*)$/.exec(line))) {
      legend ??= new Map();
      const rename = /^\s*([a-z]+)\s*=\s*(.+)$/.exec(match[1]!);
      if (rename) {
        if (!isCategory(rename[1]!)) throw new DiagramError(`Unknown palette class "${rename[1]}" in the legend`);
        legend.set(rename[1], rename[2]!.trim());
      }
    } else if (line.startsWith('%%') || line === '') continue;
    else body.push(lines[i]!);
  }

  const header = body[0]?.trim() ?? '';
  const type = TYPES.find(([pattern]) => pattern.test(header))?.[1];
  if (!type) {
    throw new DiagramError(`Diagram type "${header.split(/\s/)[0] ?? ''}" is not supported (flowchart, sequenceDiagram)`);
  }
  if (!description) throw new DiagramError('Diagram needs an accessible description (accDescr: …)');

  for (const line of body) {
    const statement = /^\s*(classDef|style|linkStyle)\b/.exec(line)?.[1];
    if (statement) throw new DiagramError(`Diagram colours come from palette classes such as A:::violet, not "${statement}"`);
    const names = [
      ...Array.from(line.matchAll(/:::([\w-]+)/g), (m) => m[1]!),
      ...(/^\s*class\s+[\w\s,-]+?\s+([\w-]+)\s*;?\s*$/.exec(line)?.slice(1) ?? []),
    ];
    for (const name of names) {
      if (!isCategory(name)) throw new DiagramError(`Unknown palette class "${name}" (${CATEGORIES.join(', ')})`);
      used.add(name);
    }
  }

  checkEveryLine(type, body);
  return {
    body: type === 'flowchart' ? `${body.join('\n')}\n${CLASS_DEFS}` : body.join('\n'),
    description: title ? `${title}. ${description}` : description,
    legend,
    used,
  };
}

/** Lines that open or close a block, or only assign a class (checked above), and may change nothing alone. */
const STRUCTURE = /^\s*(?:subgraph|end|direction|class|loop|alt|opt|par|critical|break|rect|else|and)\b/;
const ARROWS = /-->|-\.->|==>|---|-\.-|===/g;
/** A flowchart line without arrows declares one node: an id, a closed shape, a class. */
const NODE = /^[\w-]+(?:\s*[[({>].*[\])}])?(?::::[\w-]+)?\s*;?$/;

/**
 * beautiful-mermaid has no syntax errors: it skips a line it cannot parse,
 * and stops reading a line at the first thing it does not understand. So
 * each line is rendered on top of the ones before it, and must change the
 * drawing; in a flowchart it must also produce as many edges as it has
 * arrows. A typo then fails the build instead of quietly dropping a box.
 */
function checkEveryLine(type: string, body: string[]): void {
  if (body.length < 2) throw new DiagramError('Diagram is empty');
  const draw = (count: number) => {
    const lines = body.slice(0, count).join('\n');
    return type === 'flowchart' ? `${lines}\n${CLASS_DEFS}` : lines;
  };
  let previous = renderMermaidSVG(draw(1), RENDER_OPTIONS);
  let edges = 0;
  for (let count = 2; count <= body.length; count++) {
    const line = body[count - 1]!.trim();
    const current = renderMermaidSVG(draw(count), RENDER_OPTIONS);
    const unchanged = current === previous && !STRUCTURE.test(line);
    let understood = !unchanged;
    if (type === 'flowchart' && !STRUCTURE.test(line)) {
      const total = parseMermaid(draw(count)).edges.length;
      const arrows = line.match(ARROWS)?.length ?? 0;
      understood &&= total - edges >= arrows && (arrows > 0 || NODE.test(line));
      edges = total;
    }
    if (!understood) throw new DiagramError(`Diagram line "${line}" was not understood`);
    previous = current;
  }
}

// ---------------------------------------------------------------------------
// Sanitising: an allowlist for the SVG the renderer writes

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
const NUMBERS = /^[-+\d.,\se]+$/i;
const PAINT = /^(?:none|fig-[a-z]+(?:-text)?|var\(--_?[a-z-]+\))$/;
const LOCAL_URL = /^url\(#[a-z][\w-]*\)$/;

type Definition = string | [string, ...(string | RegExp)[]];

const numbers = (...names: string[]): Definition[] => names.map((name) => [name, NUMBER]);
const paint: Definition[] = [
  ['fill', PAINT],
  ['stroke', PAINT],
  ['strokeWidth', NUMBER],
  ['strokeDashArray', NUMBERS],
  ['strokeLineJoin', 'round', 'miter', 'bevel'],
  ['strokeLineCap', 'round', 'butt', 'square'],
];
const markers: Definition[] = [
  ['markerEnd', LOCAL_URL],
  ['markerStart', LOCAL_URL],
];
const typography: Definition[] = [
  ...numbers('x', 'y', 'dx', 'dy', 'fontSize'),
  ['fill', PAINT],
  ['fontWeight', /^(?:bold|normal|[1-9]00)$/],
  ['fontStyle', 'italic', 'normal'],
  ['textAnchor', 'start', 'middle', 'end'],
  ['textDecoration', 'underline', 'line-through'],
  ['dominantBaseline', 'middle', 'central', 'hanging', 'auto'],
];

/**
 * Drawing and text elements only. No <style>, <script>, <foreignObject>,
 * links, images, event handlers or `style`; references only to ids in the
 * same SVG; numbers where numbers belong.
 */
export const svgSchema: Schema = {
  tagNames: ['svg', 'g', 'defs', 'marker', 'rect', 'line', 'polyline', 'polygon', 'path', 'circle', 'ellipse', 'text', 'tspan'],
  attributes: {
    '*': [['className', /^[a-z][a-z-]*$/]],
    svg: [['viewBox', NUMBERS], ...numbers('width', 'height')],
    marker: [['id', /^[a-z][\w-]*$/], ...numbers('markerWidth', 'markerHeight', 'refX', 'refY'), ['orient', 'auto', 'auto-start-reverse']],
    rect: [...numbers('x', 'y', 'width', 'height', 'rx', 'ry'), ...paint],
    line: [...numbers('x1', 'y1', 'x2', 'y2'), ...paint, ...markers],
    polyline: [['points', NUMBERS], ...paint, ...markers],
    polygon: [['points', NUMBERS], ...paint],
    path: [['d', /^[MLHVCSQTAZ\d.,\se-]+$/i], ...paint, ...markers],
    circle: [...numbers('cx', 'cy', 'r'), ...paint],
    ellipse: [...numbers('cx', 'cy', 'rx', 'ry'), ...paint],
    text: typography,
    tspan: typography,
  },
  strip: ['script', 'style', 'title', 'desc', 'foreignObject'],
  clobber: [],
  protocols: {},
  required: {},
  ancestors: {},
};

// ---------------------------------------------------------------------------
// Theme pass: classes instead of colours, ids unique per figure

/** The renderer's class names, renamed so page styles cannot collide with them. */
const CLASS_NAMES: Record<string, string> = {
  node: 'fig-node',
  edge: 'fig-edge',
  'edge-label': 'fig-edge-label',
  subgraph: 'fig-group',
  actor: 'fig-actor',
  message: 'fig-message',
  lifeline: 'fig-lifeline',
  note: 'fig-note',
  block: 'fig-block',
};

/** Rounds the corners the mockup rounds: boxes 8, boundaries 12 (before scaling). */
function roundCorners(svg: Element): void {
  visit(svg, 'element', (node) => {
    if (!isElement(node, 'g')) return;
    const kind = classes(node)[0];
    const rects = node.children.filter((child): child is Element => isElement(child, 'rect'));
    if (kind === 'subgraph') {
      // The header band behind the label: the mockup's boundary has none.
      if (rects[1]) node.children.splice(node.children.indexOf(rects[1]), 1);
      Object.assign(rects[0]?.properties ?? {}, { rx: '12', ry: '12' });
    }
    if (kind === 'node') {
      for (const rect of rects) if (rect.properties.rx === '0') Object.assign(rect.properties, { rx: '8', ry: '8' });
    }
  });
}

/**
 * beautiful-mermaid 1.1.3 draws its start arrowhead already flipped and then
 * flips it again with orient="auto-start-reverse", so `A <--- B` and
 * `A <--> B` point back into their own line, hidden under the node. Drawn
 * like the end arrowhead, the start one points at its node.
 */
function fixStartArrows(svg: Element): void {
  visit(svg, 'element', (node) => {
    if (!isElement(node, 'marker') || !/^arrowhead-start\b/.test(String(node.properties.id))) return;
    const head = node.children.find((child) => isElement(child, 'polygon'));
    if (!isElement(head, 'polygon')) return;
    const width = Number(node.properties.markerWidth);
    const height = Number(node.properties.markerHeight);
    head.properties.points = `0 0, ${width} ${height / 2}, 0 ${height}`;
    node.properties.refX = String(width - 1);
  });
}

function themeSvg(svg: Element, prefix: string): void {
  roundCorners(svg);
  fixStartArrows(svg);
  visit(svg, 'element', (node) => {
    if (node === svg) return;
    const names = classes(node).flatMap((name) => CLASS_NAMES[name] ?? []);
    for (const key of ['fill', 'stroke'] as const) {
      const value = node.properties[key];
      if (value === undefined || value === 'none') continue;
      const role = paintRole(String(value));
      if (!role) throw new DiagramError(`Unexpected ${key} "${String(value)}" in the rendered diagram`);
      names.push(`fig-${key}-${role}`);
      delete node.properties[key];
    }
    node.properties.className = names.length > 0 ? names : undefined;
    if (typeof node.properties.id === 'string') node.properties.id = `${prefix}-${node.properties.id}`;
    for (const key of ['markerEnd', 'markerStart']) {
      const value = node.properties[key];
      if (typeof value === 'string') node.properties[key] = value.replace('url(#', `url(#${prefix}-`);
    }
  });
}

// ---------------------------------------------------------------------------
// The figure

function captionBefore(siblings: (RootContent | ElementContent)[], index: number): number {
  let i = index - 1;
  while (i >= 0 && isBlank(siblings[i]!)) i--;
  const candidate = siblings[i];
  const first = isElement(candidate, 'p') ? candidate.children[0] : undefined;
  return first?.type === 'text' && CAPTION.test(first.value) ? i : -1;
}

function legendList(source: Source): Element | undefined {
  if (!source.legend) return undefined;
  const items = CATEGORIES.filter((name) => source.used.has(name)).map((name) =>
    el('li', {}, [
      el('span', { className: ['legend-swatch', `fig-swatch-${name}`], ariaHidden: 'true' }),
      text(source.legend!.get(name) ?? LEGEND_LABELS[name]),
    ]),
  );
  return el('ul', { className: ['legend'], ariaLabel: 'Legend' }, items);
}

/** Renders one fence to the figure's SVG, or throws a DiagramError. */
export function renderDiagram(source: Source, prefix: string): { svg: Element; width: number } {
  let markup: string;
  try {
    markup = renderMermaidSVG(source.body, RENDER_OPTIONS);
  } catch (error) {
    throw new DiagramError(`Diagram could not be rendered: ${(error as Error).message}`);
  }
  const tree = sanitize(fromHtml(markup, { fragment: true }), svgSchema) as Root;
  const svg = tree.children.find((child): child is Element => isElement(child, 'svg'));
  const box = String(svg?.properties.viewBox ?? '').split(/[\s,]+/).map(Number);
  if (!svg || box.length !== 4 || box.some(Number.isNaN)) throw new DiagramError('Diagram rendered without a viewBox');

  themeSvg(svg, prefix);
  const width = Math.ceil(box[2]! * SCALE);
  svg.properties = {
    viewBox: svg.properties.viewBox,
    width,
    height: Math.ceil(box[3]! * SCALE),
    role: 'img',
    ariaLabel: source.description,
    className: ['diagram'],
  };
  return { svg, width };
}

export const rehypeDiagrams: Plugin<[], Root> = () => (tree, file) => {
  const fences: { pre: Element; code: Element; parent: Element | Root }[] = [];
  visit(tree, 'element', (node, _index, parent) => {
    const code = node.children[0];
    if (node.tagName !== 'pre' || !parent || node.children.length !== 1 || !isElement(code, 'code')) return;
    if (classes(code).includes('language-mermaid')) fences.push({ pre: node, code, parent });
  });

  fences.forEach(({ pre, code, parent }, index) => {
    let source: Source;
    let rendered: { svg: Element; width: number };
    try {
      source = readSource(toString(code));
      rendered = renderDiagram(source, `diagram-${index + 1}`);
    } catch (error) {
      if (error instanceof DiagramError) return file.fail(error.message, code);
      throw error;
    }
    const { svg, width } = rendered;

    const floor = Math.min(FLOOR_MAX, Math.ceil((width * FLOOR) / FLOOR_STEP) * FLOOR_STEP);
    const figureClasses = ['figure', 'figure-diagram'];
    if (width > COLUMN) figureClasses.push('figure-wide');
    if (floor >= FLOOR_MIN) figureClasses.push(`diagram-min-${floor}`);

    const siblings = parent.children;
    const captionIndex = captionBefore(siblings, siblings.indexOf(pre));
    let caption: ElementContent[] = [];
    if (captionIndex !== -1) {
      const paragraph = siblings[captionIndex] as Element;
      const first = paragraph.children[0] as { value: string };
      first.value = first.value.replace(CAPTION, '');
      caption = paragraph.children;
    }

    const legend = legendList(source);
    const scrolls = floor >= FLOOR_MIN;
    // A figure that may scroll sideways must be reachable by keyboard.
    const scroll = el('div', { className: ['diagram-scroll'], ...(scrolls && { tabIndex: 0 }) }, [svg]);
    // Shown by figures.css only while the figure is narrower than its floor.
    // Hidden from screen readers, which read the SVG's label, not its pixels.
    const hint = el('p', { className: ['scroll-hint'], ariaHidden: 'true' }, [text('Scroll sideways to see the whole figure.')]);
    const figure = el('figure', { className: figureClasses }, [
      scroll,
      ...(scrolls ? [hint] : []),
      ...(legend ? [legend] : []),
      ...(caption.length > 0 ? [el('figcaption', {}, caption)] : []),
    ]);
    const position = siblings.indexOf(pre);
    siblings[position] = figure;
    // The caption paragraph and the blank lines up to the fence.
    if (captionIndex !== -1) siblings.splice(captionIndex, position - captionIndex);
  });
};

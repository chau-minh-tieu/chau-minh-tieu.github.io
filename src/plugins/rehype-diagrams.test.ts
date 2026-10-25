/**
 * Diagrams end to end, through createMarkdownProcessor and the options
 * astro.config.mjs uses, plus the SVG allowlist on its own.
 */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { Root } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { sanitize } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import { readFileSync } from 'node:fs';
import { visit } from 'unist-util-visit';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './diagram-theme.ts';
import { markdownOptions } from './markdown.ts';
import { svgSchema } from './rehype-diagrams.ts';

const processor = await createMarkdownProcessor({ syntaxHighlight: false, ...markdownOptions });
const render = async (markdown: string) => (await processor.render(markdown)).code;
const md = (...lines: string[]) => lines.join('\n');
const fence = (...lines: string[]) => md('```mermaid', ...lines, '```');

const flow = fence(
  'flowchart LR',
  '  accDescr: A question goes to the model, which asks the database.',
  '  Q["**Question**<br>from an engineer"]:::slate --> M["Model"]:::violet -->|read-only| D[("Database")]:::blue',
);

describe('diagrams', () => {
  it('renders a fence as a figure with an accessible SVG and a caption', async () => {
    const html = await render(md('Figure: The model writes *queries*.', '', flow));
    expect(html).toMatch(/^<figure class="figure figure-diagram[^"]*"><div class="diagram-scroll"[^>]*><svg viewBox="[^"]+" width="\d+" height="\d+" role="img" aria-label="A question goes to the model, which asks the database." class="diagram">/);
    expect(html).toContain('<figcaption><span class="figure-num">Fig. 1</span> The model writes <em>queries</em>.</figcaption></figure>');
    expect(html).not.toContain('Figure:');
    expect(html).toContain('<tspan font-weight="bold">Question</tspan>');
  });

  it('numbers images and diagrams with one counter, and leaves uncaptioned diagrams unnumbered', async () => {
    const html = await render(md('![A chart](./chart.png "An image.")', '', 'Figure: A diagram.', '', flow, '', flow));
    expect(html).toContain('<span class="figure-num">Fig. 1</span> An image.');
    expect(html).toContain('<span class="figure-num">Fig. 2</span> A diagram.');
    expect(html.match(/<figure /g)).toHaveLength(3);
    expect(html).not.toContain('Fig. 3');
  });

  it('colours by class: no colour values, styles, renderer variables or data attributes', async () => {
    const html = await render(flow);
    expect(html).toContain('class="fig-fill-violet fig-stroke-violet"');
    expect(html).toContain('class="fig-fill-violet-text"');
    expect(html).toContain('class="fig-edge fig-stroke-line"');
    expect(html).not.toMatch(/style|#[0-9a-f]{6}|var\(|googleapis|data-|fill="fig-|stroke="fig-/i);
  });

  it('renders hostile labels as text', async () => {
    const html = await render(
      fence(
        'flowchart LR',
        '  accDescr: Hostile labels.',
        '  A["<script>alert(1)</script>"] --> B["<img src=x onerror=alert(2)>"] --> C["<a href=\'javascript:alert(3)\'>x</a>"]',
      ),
    );
    const tags = new Set<string>();
    const properties = new Set<string>();
    visit(fromHtml(html, { fragment: true }), 'element', (node) => {
      tags.add(node.tagName);
      for (const key of Object.keys(node.properties)) properties.add(key);
    });
    expect([...tags].filter((tag) => ['script', 'img', 'a', 'foreignObject'].includes(tag))).toEqual([]);
    expect([...properties].filter((key) => /^on|^href$|^src$|^style$/i.test(key))).toEqual([]);
    expect(html).toContain('&#x3C;script>alert(1)&#x3C;/script>');
  });

  it('keeps ids unique when a page has several diagrams', async () => {
    const html = await render(md(flow, '', flow));
    expect(html).toContain('<marker id="diagram-1-arrowhead"');
    expect(html).toContain('<marker id="diagram-2-arrowhead"');
    expect(html).toContain('marker-end="url(#diagram-2-arrowhead)"');
    const ids = Array.from(html.matchAll(/ id="([^"]+)"/g), (m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points a start arrow at its node', async () => {
    const html = await render(fence('flowchart TB', '  accDescr: Both ways.', '  A <--> B'));
    expect(html).toContain('marker-start="url(#diagram-1-arrowhead-start)"');
    expect(html).toMatch(/<marker id="diagram-1-arrowhead-start"[^>]* refX="7"[^>]*>\s*<polygon points="0 0, 8 2.5, 0 5"/);
  });

  it('adds a legend of the categories used, in palette order, with renames', async () => {
    const html = await render(md(flow.replace('```\n', '').replace(/```$/, '%% legend\n%% legend violet=Model\n```')));
    expect(html).toContain(
      '<ul class="legend" aria-label="Legend"><li><span class="legend-swatch fig-swatch-slate" aria-hidden="true"></span>Person</li><li><span class="legend-swatch fig-swatch-violet" aria-hidden="true"></span>Model</li><li><span class="legend-swatch fig-swatch-blue" aria-hidden="true"></span>Data store</li></ul>',
    );
    expect(await render(flow)).not.toContain('legend');
  });

  it('sizes figures: wide past the column, a scroll floor, nothing for small ones', async () => {
    const wide = await render(fence('flowchart LR', '  accDescr: Long.', '  A[One] --> B[Two] --> C[Three] --> D[Four] --> E[Five] --> F[Six] --> G[Seven]'));
    expect(wide).toMatch(/^<figure class="figure figure-diagram figure-wide diagram-min-\d+"><div class="diagram-scroll" tabindex="0">/);
    expect(wide).toContain('</svg></div><p class="scroll-hint" aria-hidden="true">Scroll sideways to see the whole figure.</p>');
    const small = await render(fence('flowchart TB', '  accDescr: Short.', '  A --> B'));
    expect(small).toMatch(/^<figure class="figure figure-diagram"><div class="diagram-scroll"><svg/);
    expect(small).not.toContain('scroll-hint');

    // The floor keeps at least 75% of the natural width, and never more than all of it.
    const medium = await render(fence('flowchart LR', '  accDescr: Medium.', '  A[One] --> B[Two] --> C[Three]'));
    const floor = Number(/diagram-min-(\d+)/.exec(medium)?.[1]);
    const width = Number(/<svg [^>]*width="(\d+)"/.exec(medium)?.[1]);
    expect(floor).toBeGreaterThanOrEqual(width * 0.75);
    expect(floor).toBeLessThanOrEqual(width);
  });

  it('has a CSS rule for every floor step, and a scroll hint that shows below it', () => {
    const css = readFileSync(new URL('../styles/figures.css', import.meta.url), 'utf8');
    for (let step = 280; step <= 920; step += 40) {
      expect(css).toContain(`.diagram-min-${step} .diagram { min-width: ${step}px; }`);
      expect(css).toContain(`@container (width < ${step}px) { .diagram-min-${step} .scroll-hint { display: block; } }`);
    }
  });

  it('renders sequence diagrams', async () => {
    const html = await render(
      fence('sequenceDiagram', '  accDescr: Two messages.', '  participant E as Engineer', '  participant A as Assistant', '  E->>A: Question', '  A-->>E: Answer'),
    );
    expect(html).toContain('class="fig-actor"');
    expect(html.match(/class="fig-message"/g)).toHaveLength(2);
    expect(html).toContain('>Answer</text>');
  });
});

describe('diagram errors fail the build', () => {
  const fails = (name: string, lines: string[], message: string) =>
    it(name, async () => {
      await expect(render(fence(...lines))).rejects.toThrow(message);
    });

  fails('an unsupported type', ['pie', '  accDescr: x', '  "a": 1'], 'Diagram type "pie" is not supported');
  fails('a missing description', ['flowchart LR', '  A --> B'], 'Diagram needs an accessible description');
  fails('an unknown palette class', ['flowchart LR', '  accDescr: x', '  A:::violett --> B'], 'Unknown palette class "violett"');
  fails('a colour statement', ['flowchart LR', '  accDescr: x', '  A --> B', '  style A fill:#f00'], 'not "style"');
  fails('an empty diagram', ['flowchart LR', '  accDescr: x'], 'Diagram is empty');
  fails('a line half understood', ['flowchart LR', '  accDescr: x', '  A[unclosed --> B'], 'Diagram line "A[unclosed --> B" was not understood');
  fails('an arrow to nowhere', ['flowchart LR', '  accDescr: x', '  A -->'], 'Diagram line "A -->" was not understood');
  fails('a line not understood', ['sequenceDiagram', '  accDescr: x', '  A->>B no colon'], 'Diagram line "A->>B no colon" was not understood');
  fails('a click link', ['flowchart LR', '  accDescr: x', '  A --> B', '  click A "https://example.com"'], 'was not understood');
});

describe('SVG allowlist', () => {
  it('keeps drawing elements and drops everything active', () => {
    const svg = [
      '<svg viewBox="0 0 10 10" width="10" height="10" onload="alert(1)" style="color:red">',
      '<style>@import url(https://example.com/x.css);</style>',
      '<script>alert(2)</script>',
      '<foreignObject><div>html</div></foreignObject>',
      '<a href="javascript:alert(3)"><text x="1" y="2">link text</text></a>',
      '<image href="https://example.com/x.png"/>',
      '<rect x="1" y="1" width="5" height="5" fill="url(https://example.com/#x)" onclick="alert(4)"/>',
      '<polyline points="0,0 5,5" marker-end="url(https://example.com/#m)"/>',
      '<line x1="javascript:alert(5)" y1="0" x2="1" y2="1" fill="var(--_line)"/>',
      '</svg>',
    ].join('');
    const html = toHtml(sanitize(fromHtml(svg, { fragment: true }), svgSchema) as Root);
    expect(html).toBe(
      '<svg viewBox="0 0 10 10" width="10" height="10"><text x="1" y="2">link text</text><rect x="1" y="1" width="5" height="5"></rect><polyline points="0,0 5,5"></polyline><line y1="0" x2="1" y2="1" fill="var(--_line)"></line></svg>',
    );
  });
});

describe('diagram palette', () => {
  // HANDOFF.md 5.1, figure palette: fill / stroke / text, light then dark.
  const HANDOFF: Record<string, [string, string, string, string, string, string]> = {
    slate: ['#ece9e2', '#6b665d', '#2e2b26', '#26241f', '#8a857b', '#e6e1d6'],
    teal: ['#dfeeea', '#2f7468', '#1d4d45', '#1a2a27', '#6fb3a5', '#c4e3dc'],
    violet: ['#ece4f3', '#6e54a0', '#45326b', '#261e33', '#a68fd0', '#ddd0f0'],
    blue: ['#e3eaf4', '#3b5b8a', '#1f3a5f', '#1c2533', '#7e9fcc', '#c9d8ec'],
    amber: ['#f6ead2', '#a87a22', '#5e430d', '#2e2614', '#d4a64e', '#f0ddb4'],
    green: ['#e4efdf', '#4a7a3a', '#2c4f22', '#1e2a1a', '#86b373', '#d2e5c8'],
    rose: ['#f4e1e2', '#9a3d49', '#6e2430', '#30191c', '#d08a92', '#f0cdd1'],
  };

  it('matches the handoff in tokens.css', () => {
    const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
    for (const [name, [fill, stroke, text, darkFill, darkStroke, darkText]] of Object.entries(HANDOFF)) {
      expect(tokens).toContain(`--fig-${name}-fill: light-dark(${fill}, ${darkFill});`);
      expect(tokens).toContain(`--fig-${name}-stroke: light-dark(${stroke}, ${darkStroke});`);
      expect(tokens).toContain(`--fig-${name}-text: light-dark(${text}, ${darkText});`);
    }
    expect(tokens).toContain('--fig-line: #8a857b;');
  });

  it('has a rule in figures.css for every class a diagram can carry', async () => {
    const css = readFileSync(new URL('../styles/figures.css', import.meta.url), 'utf8');
    const nodes = CATEGORIES.map((name, i) => `N${i}["${name}"]:::${name}`).join(' --> ');
    const html = [
      await render(fence('flowchart LR', '  accDescr: Every category.', `  ${nodes}`, '  subgraph S [Group]', '    X -->|label| Y', '  end', '%% legend')),
      await render(fence('sequenceDiagram', '  accDescr: x', '  A->>B: Hi', '  B-->>A: Hello', '  Note right of B: A note')),
    ].join('');
    const used = new Set(Array.from(html.matchAll(/class="([^"]+)"/g), (m) => m[1]!.split(' ')).flat());
    for (const name of used) {
      if (/^(figure|figure-diagram|figure-wide|figcaption|diagram|diagram-scroll|legend|legend-swatch|figure-num|fig-node|fig-edge|fig-message|fig-actor|fig-lifeline|fig-edge-label|fig-group|fig-note|fig-block)$/.test(name)) continue;
      expect(css, name).toMatch(new RegExp(`\\.${name}[\\s{]`));
    }
    for (const name of CATEGORIES) expect(used, name).toContain(`fig-swatch-${name}`);
  });
});

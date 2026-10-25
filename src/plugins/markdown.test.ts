/**
 * The Markdown pipeline end to end, through createMarkdownProcessor: the same
 * unified pipeline Astro runs for posts, with the options astro.config.mjs uses.
 */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CODE_TOKENS } from './code-theme.ts';
import { markdownOptions } from './markdown.ts';

const processor = await createMarkdownProcessor({ syntaxHighlight: false, ...markdownOptions });
const render = async (markdown: string) => (await processor.render(markdown)).code;
const md = (...lines: string[]) => lines.join('\n');

describe('sanitising', () => {
  it('removes scripts, styles, frames and event handlers from raw HTML', async () => {
    const html = await render(
      md(
        '<script>alert(1)</script>',
        '',
        '<style>body { display: none }</style>',
        '',
        '<iframe src="https://example.com/"></iframe>',
        '',
        '<p onclick="alert(1)" style="color: red">Text <img src="x.png" alt="x" onerror="alert(1)"></p>',
      ),
    );
    expect(html).not.toMatch(/<script|alert|<style|display: none|<iframe|onclick|onerror|style=/);
    expect(html).toContain('<p>Text <img src="x.png" alt="x"></p>');
  });

  it('drops javascript: and mailto: links in Markdown and in HTML', async () => {
    const html = await render(
      md('[one](javascript:alert(1)) [two](mailto:someone) <a href="javascript:alert(1)">three</a>'),
    );
    expect(html).not.toMatch(/javascript|mailto/);
    expect(html).toContain('<a>one</a>');
  });

  it('keeps harmless HTML and prefixes author ids', async () => {
    const html = await render(md('<details><summary>More</summary>Press <kbd>Esc</kbd>.</details>', '', '<h3 id="x">Hi</h3>'));
    expect(html).toContain('<details><summary>More</summary>Press <kbd>Esc</kbd>.</details>');
    expect(html).toContain('<h3 id="user-content-x">Hi</h3>');
  });
});

describe('notes', () => {
  it('turns each GitHub alert type into a labelled note', async () => {
    for (const [marker, label] of [
      ['NOTE', 'Note'],
      ['TIP', 'Tip'],
      ['IMPORTANT', 'Important'],
      ['WARNING', 'Warning'],
      ['CAUTION', 'Caution'],
    ]) {
      const html = await render(md(`> [!${marker}]`, '> Body text.'));
      expect(html).toContain(`<div class="callout" data-kind="${marker.toLowerCase()}" role="note">`);
      expect(html).toContain(`<p class="callout-label">${label}</p>`);
      expect(html).toContain('<p>Body text.</p>');
      expect(html).not.toContain('[!');
    }
  });

  it('leaves a plain blockquote alone: it is the pull quote', async () => {
    expect(await render('> A line worth quoting.')).toBe('<blockquote>\n<p>A line worth quoting.</p>\n</blockquote>');
  });
});

describe('sidenotes', () => {
  const source = md(
    'First.[^a] Second.[^b]',
    '',
    'Third refers back.[^a]',
    '',
    '[^a]: Note A.',
    '[^b]: Note B with `code`.',
  );

  it('places notes right after the block that first cites them', async () => {
    const html = await render(source);
    expect(html).toContain(
      '<aside class="sidenotes"><div class="sidenote" id="sn-1"><p><span class="sidenote-num">1</span>Note A.</p></div>' +
        '<div class="sidenote" id="sn-2"><p><span class="sidenote-num">2</span>Note B with <code>code</code>.</p></div></aside>',
    );
    expect(html.indexOf('sn-1"')).toBeLessThan(html.indexOf('Third'));
  });

  it('links references to their note and drops the footnote list', async () => {
    const html = await render(source);
    expect(html).toContain('<sup class="sidenote-ref"><a href="#sn-1" aria-label="Note 1">1</a></sup>');
    expect(html.match(/href="#sn-1"/g)).toHaveLength(2);
    expect(html.match(/id="sn-1"/g)).toHaveLength(1);
    expect(html).not.toMatch(/footnote|user-content|↩/);
  });
});

describe('figures', () => {
  it('numbers titled images and moves the title into the caption', async () => {
    const html = await render(md('![A chart](./chart.png "First caption.")', '', '![A table](./table.png "Second.")'));
    expect(html).toContain(
      '<figure class="figure"><img src="./chart.png" alt="A chart"><figcaption><span class="figure-num">Fig. 1</span> First caption.</figcaption></figure>',
    );
    expect(html).toContain('<span class="figure-num">Fig. 2</span> Second.');
    expect(html).not.toContain('title=');
  });

  it('frames screenshots, widens wide- images, and leaves untitled or inline images alone', async () => {
    expect(await render('![The app](./screenshot-app.png "The app.")')).toMatch(
      /<figure class="figure figure-frame"><div class="frame"><div class="frame-bar" aria-hidden="true">/,
    );
    expect(await render('![A chart](./wide-chart.png "Wide.")')).toMatch(/^<figure class="figure figure-wide"><img /);
    expect(await render('![A chart](./chart.png)')).toBe('<p><img src="./chart.png" alt="A chart"></p>');
    expect(await render('Inline ![icon](./i.png "t") here.')).not.toContain('<figure');
  });

  it('fails without alt text, naming the image', async () => {
    await expect(render('![](./chart.png "Caption.")')).rejects.toThrow('Image "./chart.png" needs alt text');
  });
});

describe('tables', () => {
  const table = md(
    'Table: Who computes the number?',
    '',
    '|  | Model | Postgres |',
    '| --- | --- | ---: |',
    '| Accuracy | Approximate | Exact |',
    '| Verdict | Avoid | **Use this** |',
  );

  it('turns a "Table:" line into a numbered caption and wraps the table', async () => {
    const html = await render(md(table, '', 'Between.', '', table));
    expect(html.trimStart()).toMatch(/^<div class="table-scroll"><table><caption><span class="table-num">Table 1<\/span> Who computes the number\?<\/caption>/);
    expect(html).toContain('<span class="table-num">Table 2</span>');
    expect(html).not.toContain('Table:');
  });

  it('adds row headers under an empty corner cell and marks the verdict row', async () => {
    const html = await render(table);
    expect(html).toContain('<th scope="col"></th>');
    expect(html).toContain('<th scope="row">Accuracy</th>');
    expect(html).toContain('<tr class="verdict"><th scope="row">Verdict</th><td>Avoid</td><td align="right"><strong>Use this</strong></td></tr>');
    expect(html).not.toMatch(/>\s+</);
  });

  it('keeps data cells when the corner cell has text, and needs no caption', async () => {
    const html = await render(md('| Name | Value |', '| --- | --- |', '| a | 1 |'));
    expect(html).toContain('<td>a</td>');
    expect(html).not.toContain('<caption>');
  });
});

describe('code blocks', () => {
  const sql = md('```sql title="roles.sql" {2}', 'CREATE ROLE analyst NOLOGIN;', "SET ROLE analyst; -- 'quoted'", '```');

  it('highlights with token classes, never inline styles', async () => {
    const html = await render(sql);
    expect(html).toContain('<span class="tok-keyword">CREATE</span>');
    expect(html).toContain('class="tok-comment"');
    expect(html).not.toMatch(/style=|shiki|#[0-9a-f]{6}/i);
  });

  it('renders the header, the highlighted line and a hidden copy button', async () => {
    const html = await render(sql);
    expect(html).toMatch(/^<div class="code"><div class="code-head"><div class="code-meta"><span class="code-file">roles.sql<\/span><span class="code-lang">SQL<\/span><\/div>/);
    expect(html).toContain('<button type="button" class="code-copy" data-copy="" hidden>');
    expect(html.match(/<span class="line[^"]*"/g)).toEqual(['<span class="line"', '<span class="line highlighted"']);
    expect(html).toContain('<pre class="code-body" tabindex="0"><code>');
  });

  it('names languages by their display name and accepts plain text', async () => {
    expect(await render(md('```sh', 'pnpm install', '```'))).toContain('<span class="code-lang">Shell</span>');
    expect(await render(md('```', 'no language', '```'))).toContain('<span class="code-lang">Text</span>');
  });

  it('fails the build on an unknown language', async () => {
    await expect(render(md('```pyhton', 'print(1)', '```'))).rejects.toThrow('Unknown code block language "pyhton"');
  });

  it('uses the same colours as tokens.css', () => {
    const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
    for (const [kind, color] of Object.entries(CODE_TOKENS)) {
      expect(css, kind).toMatch(new RegExp(`--code-${kind}:\\s*${color};`));
    }
  });
});

describe('headings', () => {
  it('reports headings with ids for the contents list', async () => {
    const { metadata } = await processor.render(md('## Asking for numbers', '', '### Detail', '', '## Queries'));
    expect(metadata.headings.map(({ depth, slug }) => [depth, slug])).toEqual([
      [2, 'asking-for-numbers'],
      [3, 'detail'],
      [2, 'queries'],
    ]);
  });
});

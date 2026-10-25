/**
 * Rules checked on the built site in dist/ (run `pnpm build` first):
 * every page carries a CSP that allows each of its inline scripts and styles
 * by hash, nothing is loaded from another origin, no email address is
 * published, served images carry no metadata, drafts are never built,
 * unlisted posts stay out of every list, the sitemap matches the pages, and
 * diagrams are inert SVG with unique ids.
 *
 * Locally the suite is skipped when dist/ is missing; in CI it is required.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findImageMetadata, IMAGE_EXTENSIONS } from '../scripts/lib/image-metadata.ts';
import { findEmails } from '../scripts/lib/privacy.ts';

const DIST = join(import.meta.dirname, '..', 'dist');
const SITE = 'https://chau-minh-tieu.github.io';
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.svg', '.xml', '.txt', '.json']);

const built = existsSync(DIST);
if (!built && process.env.CI) {
  throw new Error('dist/ is missing: run `pnpm build` before `pnpm test`');
}

function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const files = built ? filesIn(DIST) : [];
const pages = files.filter((file) => file.endsWith('.html'));
const read = (file: string) => readFileSync(file, 'utf8');
const name = (file: string) => relative(DIST, file);

function cspOf(html: string): string | undefined {
  return html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/)?.[1];
}

function sha256(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('base64')}`;
}

describe.skipIf(!built)('build output', () => {
  it('has pages', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map(name))('%s has a CSP starting with default-src self', (page) => {
    const csp = cspOf(read(join(DIST, page)));
    expect(csp).toBeDefined();
    expect(csp!.startsWith("default-src 'self';")).toBe(true);
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  it.each(pages.map(name))('%s allows each inline script and style by hash', (page) => {
    const html = read(join(DIST, page));
    const csp = cspOf(html) ?? '';
    const directive = (key: string) => csp.split(';').find((d) => d.trim().startsWith(`${key} `)) ?? '';
    const inline = (tag: string) =>
      Array.from(html.matchAll(new RegExp(`<${tag}(?![^>]*\\ssrc=)[^>]*>([\\s\\S]*?)</${tag}>`, 'g')), (m) => m[1]!);

    for (const script of inline('script')) expect(directive('script-src')).toContain(sha256(script));
    for (const style of inline('style')) expect(directive('style-src')).toContain(sha256(style));
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/\son[a-z]+="/);
  });

  it.each(pages.map(name))('%s loads nothing from another origin', (page) => {
    const html = read(join(DIST, page));
    // Resource-loading attributes; <a href> links to other sites are fine.
    const tags = html.matchAll(/<(script|link|img|source|iframe|video|audio|embed|object)\b[^>]*>/g);
    for (const [tag] of tags) {
      for (const [, , url] of tag.matchAll(/\s(src|href|srcset|data|poster)="([^"]*)"/g)) {
        const external = /^(https?:)?\/\//.test(url!) && !url!.startsWith(`${SITE}/`);
        expect(external, `${page}: ${tag}`).toBe(false);
      }
    }
  });

  it('stylesheets import nothing from another origin', () => {
    for (const file of files.filter((f) => f.endsWith('.css'))) {
      const css = read(file);
      expect(css, name(file)).not.toMatch(/@import/);
      expect(css, name(file)).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
    }
  });

  it('publishes no email address', () => {
    for (const file of files.filter((f) => TEXT_EXTENSIONS.has(extname(f)))) {
      expect(findEmails(read(file)), name(file)).toEqual([]);
    }
  });

  it('serves SVGs without metadata', () => {
    for (const file of files.filter((f) => f.endsWith('.svg'))) {
      expect(read(file), name(file)).not.toMatch(/<metadata|c2pa|xmp|xpacket|exif/i);
    }
  });

  it('writes the commit it was built from to /version.txt', () => {
    // GitHub Actions sets GITHUB_SHA for the build and the tests alike.
    expect(read(join(DIST, 'version.txt'))).toBe(`${process.env.GITHUB_SHA || 'local'}\n`);
  });
});

/** The URL a built page is served at: dist/tags/ai/index.html → https://…/tags/ai/ */
function urlOf(page: string): string {
  return `${SITE}/${name(page).split(sep).join('/').replace(/(^|\/)index\.html$/, '$1')}`;
}

const DRAFT = 'draft-fixture';
const UNLISTED = '/posts/kitchen-sink/';

describe.skipIf(!built)('statuses and feeds', () => {
  it('never builds a draft', () => {
    expect(files.filter((file) => file.includes(DRAFT)).map(name)).toEqual([]);
    for (const file of files.filter((f) => TEXT_EXTENSIONS.has(extname(f)))) {
      expect(read(file), name(file)).not.toContain(DRAFT);
    }
  });

  it('builds unlisted posts with noindex', () => {
    const html = read(join(DIST, 'posts', 'kitchen-sink', 'index.html'));
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it('keeps unlisted posts out of home, tag pages, RSS and the sitemap', () => {
    const lists = [
      join(DIST, 'index.html'),
      ...pages.filter((page) => name(page).startsWith(`tags${sep}`)),
      join(DIST, 'rss.xml'),
      join(DIST, 'sitemap.xml'),
    ];
    expect(lists.length).toBeGreaterThan(4);
    for (const file of lists) expect(read(file), name(file)).not.toContain(UNLISTED);
  });

  it('lists exactly the indexable pages in the sitemap', () => {
    const sitemap = read(join(DIST, 'sitemap.xml'));
    const listed = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]).sort();
    const indexable = pages
      .filter((page) => !page.endsWith(`${sep}404.html`) && !read(page).includes('name="robots" content="noindex"'))
      .map(urlOf)
      .sort();
    expect(listed).toEqual(indexable);
  });
});

describe.skipIf(!built)('post content', () => {
  const post = built ? read(join(DIST, 'posts', 'kitchen-sink', 'index.html')) : '';

  it('renders every component of the kitchen-sink post', () => {
    for (const marker of [
      'class="toc"',
      'class="sidenotes"',
      'class="callout"',
      '<caption><span class="table-num">Table 1</span>',
      'class="verdict"',
      '<span class="figure-num">Fig. 2</span>',
      'class="figure figure-frame"',
      '<span class="code-file">roles.sql</span>',
      'class="line highlighted"',
      'class="tok-keyword"',
      'data-copy=""',
      '<blockquote>',
    ]) {
      expect(post, marker).toContain(marker);
    }
  });

  it('renders hostile HTML from the post body inert', () => {
    expect(post).not.toMatch(/alert\(|javascript:|<iframe/);
  });

  it('renders the diagrams as numbered figures with accessible SVG', () => {
    const diagrams = Array.from(post.matchAll(/<figure class="figure figure-diagram[^"]*">[\s\S]*?<\/figure>/g), (m) => m[0]);
    expect(diagrams).toHaveLength(3);
    for (const figure of diagrams) {
      expect(figure).toMatch(/<svg viewBox="[^"]+" width="\d+" height="\d+" role="img" aria-label="[^"]{20,}" class="diagram">/);
      expect(figure).toContain('<span class="figure-num">Fig. ');
    }
    expect(diagrams[0]).toContain('figure-wide');
    expect(diagrams[1]).toContain('<ul class="legend" aria-label="Legend">');
    const numbers = Array.from(post.matchAll(/<span class="figure-num">Fig\. (\d+)<\/span>/g), (m) => Number(m[1]));
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
    expect(post).toContain('<figure class="figure figure-wide"><img ');
  });
});

describe.skipIf(!built)('diagrams on every page', () => {
  it.each(pages.map(name))('%s has unique ids', (page) => {
    const ids = Array.from(read(join(DIST, page)).matchAll(/\sid="([^"]+)"/g), (m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it.each(pages.map(name))('%s keeps inline SVG inert', (page) => {
    for (const [svg] of read(join(DIST, page)).matchAll(/<svg[\s\S]*?<\/svg>/g)) {
      expect(svg).not.toMatch(/<(script|style|foreignObject|a|image)\b|\son[a-z]+=|\s(href|style)=|url\((?!#)/i);
    }
  });

  it('serves images without metadata', () => {
    const images = files.filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()));
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(findImageMetadata(readFileSync(image)), name(image)).toEqual([]);
  });
});

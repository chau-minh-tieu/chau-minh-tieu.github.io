/**
 * Rules checked on the built site in dist/ (run `pnpm build` first):
 * every page carries a CSP that allows each of its inline scripts and styles
 * by hash, nothing is loaded from another origin, no email address is
 * published, served images carry no metadata, drafts are never built,
 * unlisted posts stay out of every list, the sitemap matches the pages,
 * diagrams are inert SVG with unique ids, every internal link resolves, and
 * every page carries the Open Graph defaults and the icons.
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

/** The value of `name` on each `<tag …>` in the page, entities decoded. */
function attributeValues(html: string, tag: string, attribute: string): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}\\b[^>]*\\s${attribute}="([^"]*)"`, 'g')), (m) =>
    m[1]!.replace(/&amp;/g, '&'),
  );
}

/** <meta property="og:…" content="…"> and <meta name="twitter:…" content="…">. */
function metaOf(html: string, key: string): string[] {
  return Array.from(html.matchAll(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`, 'g')), (m) =>
    m[1]!.replace(/&amp;/g, '&'),
  );
}

/** The file in dist/ that serves a same-origin URL: /about/ → about/index.html. */
function fileFor(url: URL): string {
  const path = decodeURIComponent(url.pathname);
  return join(DIST, ...path.split('/').filter(Boolean), ...(path.endsWith('/') ? ['index.html'] : []));
}

/** The external sites HANDOFF.md 3.1 allows outside posts (posts cite sources of their own). */
const ALLOWED_LINKS = [
  'https://github.com/chau-minh-tieu',
  'https://www.linkedin.com/in/tieuminhchau',
  'https://www.reignedge.com',
];

describe.skipIf(!built)('pages and brand', () => {
  it.each(pages.map(name))('%s links only to files and anchors that exist', (page) => {
    const html = read(join(DIST, page));
    const base = new URL(urlOf(join(DIST, page)));
    const hrefs = [...attributeValues(html, 'a', 'href'), ...attributeValues(html, 'link', 'href')];
    for (const href of hrefs) {
      const url = new URL(href, base);
      if (url.origin !== base.origin) continue;
      const target = fileFor(url);
      expect(existsSync(target), `${page}: ${href}`).toBe(true);
      if (url.hash) expect(read(target), `${page}: ${href}`).toContain(` id="${decodeURIComponent(url.hash.slice(1))}"`);
    }
  });

  it.each(pages.filter((page) => !name(page).startsWith(`posts${sep}`)).map(name))(
    '%s links only to allowlisted sites',
    (page) => {
      for (const href of attributeValues(read(join(DIST, page)), 'a', 'href')) {
        if (!/^https?:/.test(href) || href.startsWith(`${SITE}/`)) continue;
        expect(
          ALLOWED_LINKS.some((prefix) => href === prefix || href.startsWith(`${prefix}/`)),
          `${page}: ${href}`,
        ).toBe(true);
      }
    },
  );

  it.each(pages.map(name))('%s carries the Open Graph and X card defaults', (page) => {
    const html = read(join(DIST, page));
    for (const key of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:image:alt']) {
      expect(metaOf(html, key), key).toHaveLength(1);
    }
    expect(metaOf(html, 'og:image')).toEqual([`${SITE}/og.png`]);
    expect(metaOf(html, 'og:image:type')).toEqual(['image/png']);
    expect([...metaOf(html, 'og:image:width'), ...metaOf(html, 'og:image:height')]).toEqual(['1200', '630']);
    expect(metaOf(html, 'twitter:card')).toEqual(['summary_large_image']);
    // og:url is the canonical URL; a page without one (404) has neither.
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    expect(metaOf(html, 'og:url')).toEqual(canonical ? [canonical] : []);
    expect(canonical === undefined).toBe(page === '404.html');
    const isPost = page.startsWith(`posts${sep}`);
    expect(metaOf(html, 'og:type')).toEqual([isPost ? 'article' : 'website']);
    expect(metaOf(html, 'article:published_time')).toHaveLength(isPost ? 1 : 0);
  });

  it('serves the 404 page without a canonical URL and with noindex', () => {
    const html = read(join(DIST, '404.html'));
    expect(html).toContain('Page not found');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('rel="canonical"');
    expect(metaOf(html, 'og:url')).toEqual([]);
  });

  it('links every page to the icons', () => {
    for (const page of pages) {
      const html = read(page);
      expect(html, name(page)).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32">');
      expect(html, name(page)).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
      expect(html, name(page)).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    }
  });

  it('serves the icons and the social image at their sizes', () => {
    const size = (file: string) => {
      const bytes = readFileSync(join(DIST, file));
      expect(bytes.subarray(1, 4).toString('latin1'), file).toBe('PNG');
      return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    };
    expect(size('apple-touch-icon.png')).toEqual([180, 180]);
    expect(size('og.png')).toEqual([1200, 630]);
    const icon = readFileSync(join(DIST, 'favicon.ico'));
    // ICO header (type 1, one image), a 32×32 entry, and a PNG at the entry's offset.
    expect([icon.readUInt16LE(2), icon.readUInt16LE(4), icon[6], icon[7]]).toEqual([1, 1, 32, 32]);
    expect(icon.subarray(icon.readUInt32LE(18) + 1, icon.readUInt32LE(18) + 4).toString('latin1')).toBe('PNG');
    expect(read(join(DIST, 'favicon.svg'))).toMatch(/^<svg [^>]*viewBox="0 0 1024 1024"[^>]*><circle /);
  });

  it('carries the About copy of HANDOFF.md 5.3 verbatim', () => {
    const handoff = readFileSync(join(import.meta.dirname, '..', 'HANDOFF.md'), 'utf8');
    const block = handoff.split('**About** (`/about/`)')[1]!.split('\nThen:')[0]!;
    const quoted = block.split('\n').filter((line) => line.startsWith('>'));
    const paragraphs = quoted
      .map((line) => line.replace(/^>\s?/, ''))
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim())
      .filter(Boolean);
    expect(paragraphs).toHaveLength(5);
    const text = (html: string) =>
      html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/’/g, "'").replace(/&amp;/g, '&');
    const about = text(read(join(DIST, 'about', 'index.html')));
    for (const paragraph of paragraphs) expect(about).toContain(paragraph.replace(/\s+/g, ' '));
  });

  it('shows the selected projects on the home page and the Now list on About', () => {
    const home = read(join(DIST, 'index.html'));
    expect(home).toContain('Selected projects');
    expect(home.match(/<article class="project"/g)).toHaveLength(2);
    const now = read(join(DIST, 'about', 'index.html')).split('id="now-title"')[1]!.split('</section>')[0]!;
    expect(now.match(/<li/g)).toHaveLength(3);
    expect(now).toMatch(/Updated [A-Z][a-z]+ \d{4}/);
  });
});

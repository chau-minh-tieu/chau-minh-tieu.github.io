import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cspOf,
  cssUrls,
  type Fetch,
  isLocal,
  ogImageOf,
  resourceUrls,
  siteRoot,
  smokeChecks,
} from './smoke.ts';

const ROOT = new URL('https://example.github.io/');
const hrefs = (urls: URL[]) => urls.map((url) => url.href);

describe('siteRoot', () => {
  it('keeps only the origin', () => {
    expect(siteRoot('https://example.github.io/posts/x/?a=1').href).toBe('https://example.github.io/');
    expect(siteRoot('http://localhost:4321').href).toBe('http://localhost:4321/');
  });

  it('refuses anything but http(s)', () => {
    expect(() => siteRoot('file:///tmp/dist/')).toThrow('not an http(s) URL');
  });
});

describe('isLocal', () => {
  it('knows local preview hosts', () => {
    expect(isLocal(new URL('http://localhost:4321/'))).toBe(true);
    expect(isLocal(new URL('http://127.0.0.1:4321/'))).toBe(true);
    expect(isLocal(new URL('http://[::1]:4321/'))).toBe(true);
    expect(isLocal(ROOT)).toBe(false);
  });
});

describe('resourceUrls', () => {
  const page = new URL('https://example.github.io/posts/a/');

  it('finds scripts, loading links, images, srcsets and fonts in inline styles', () => {
    const html = [
      '<script type="module" src="/_astro/page.js"></script>',
      '<script>inline()</script>',
      '<link rel="stylesheet" href="/_astro/page.css">',
      '<link rel="preload" href="/_astro/fonts/a.woff2" as="font" crossorigin>',
      '<link rel="icon" href="/favicon.svg">',
      '<img src="chart.webp" srcset="chart.webp 1x, chart-2x.webp 2x" alt="">',
      '<style>@font-face{src:url("/_astro/fonts/b.woff2")}</style>',
    ].join('');
    expect(hrefs(resourceUrls(html, page))).toEqual([
      'https://example.github.io/_astro/page.js',
      'https://example.github.io/_astro/page.css',
      'https://example.github.io/_astro/fonts/a.woff2',
      'https://example.github.io/favicon.svg',
      'https://example.github.io/posts/a/chart.webp',
      'https://example.github.io/posts/a/chart.webp',
      'https://example.github.io/posts/a/chart-2x.webp',
      'https://example.github.io/_astro/fonts/b.woff2',
    ]);
  });

  it('leaves out navigation links, canonical and alternate links, and data: URLs', () => {
    const html = [
      '<a href="https://github.com/">GitHub</a>',
      '<link rel="canonical" href="https://example.github.io/">',
      '<link rel="alternate" type="application/rss+xml" href="/rss.xml">',
      '<img src="data:image/png;base64,AAAA" alt="">',
    ].join('');
    expect(resourceUrls(html, page)).toEqual([]);
  });

  it('keeps other origins, so the check can reject them', () => {
    const html = '<script src="https://cdn.example.com/x.js"></script>';
    expect(hrefs(resourceUrls(html, page))).toEqual(['https://cdn.example.com/x.js']);
  });

  it('decodes entities in attribute values', () => {
    const html = '<img src="/_image?href=a.png&amp;w=600" alt="">';
    expect(hrefs(resourceUrls(html, page))).toEqual(['https://example.github.io/_image?href=a.png&w=600']);
  });
});

describe('cssUrls', () => {
  it('resolves against the stylesheet and skips data: URLs', () => {
    const css = `a{background:url(img/a.png)} b{src:url('/f.woff2')} c{mask:url("data:image/svg+xml,x")}`;
    expect(hrefs(cssUrls(css, new URL('https://example.github.io/_astro/x.css')))).toEqual([
      'https://example.github.io/_astro/img/a.png',
      'https://example.github.io/f.woff2',
    ]);
  });
});

describe('cspOf and ogImageOf', () => {
  it('read the meta tags Astro writes', () => {
    expect(ogImageOf('<meta property="og:image" content="https://example.github.io/og.png?v=1&amp;x=2">')).toBe(
      'https://example.github.io/og.png?v=1&x=2',
    );
    expect(ogImageOf('<p>none</p>')).toBeUndefined();
    const html = `<meta http-equiv="content-security-policy" content="default-src 'self'; object-src 'none'">`;
    expect(cspOf(html)).toBe("default-src 'self'; object-src 'none'");
    expect(cspOf('<p>none</p>')).toBeUndefined();
  });
});

/** A fake deployed site: path → response. Anything else is a 404. */
type Site = Record<string, { status?: number; type?: string; location?: string; body?: string }>;

const CSP = `<meta http-equiv="content-security-policy" content="default-src 'self'; object-src 'none'">`;
const NOINDEX = '<meta name="robots" content="noindex, nofollow">';
/** The fake site serves the real robots.txt. */
const ROBOTS = readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8');

function goodSite(): Site {
  return {
    'https://example.github.io/': {
      type: 'text/html',
      body: `${CSP}${NOINDEX}<link rel="stylesheet" href="/_astro/a.css"><meta property="og:image" content="https://chau-minh-tieu.github.io/og.png">`,
    },
    'https://example.github.io/projects/': { type: 'text/html', body: CSP + NOINDEX },
    'https://example.github.io/about/': { type: 'text/html', body: CSP + NOINDEX },
    'https://example.github.io/favicon.ico': { type: 'image/vnd.microsoft.icon', body: 'x' },
    'https://example.github.io/favicon.svg': { type: 'image/svg+xml', body: '<svg/>' },
    'https://example.github.io/apple-touch-icon.png': { type: 'image/png', body: 'x' },
    'https://example.github.io/og.png': { type: 'image/png', body: 'x' },
    'https://example.github.io/smoke-check-missing-page/': {
      status: 404,
      body: `${NOINDEX}<h1>Page not found</h1>`,
    },
    'https://example.github.io/_astro/a.css': { type: 'text/css', body: 'b{src:url(/_astro/fonts/f.woff2)}' },
    'https://example.github.io/_astro/fonts/f.woff2': { type: 'font/woff2', body: 'x' },
    'https://example.github.io/posts/kitchen-sink/': {
      type: 'text/html',
      body: `${CSP}${NOINDEX}<script type="module" src="/_astro/p.js"></script>`,
    },
    'https://example.github.io/_astro/p.js': { type: 'text/javascript', body: '' },
    'https://example.github.io/version.txt': { type: 'text/plain', body: 'abc123\n' },
    'https://example.github.io/rss.xml': { type: 'application/xml', body: '<rss version="2.0"></rss>' },
    'https://example.github.io/robots.txt': { type: 'text/plain', body: ROBOTS },
    'http://example.github.io/': { status: 301, location: 'https://example.github.io/' },
    'https://example.github.io/posts/kitchen-sink': { status: 301, location: 'https://example.github.io/posts/kitchen-sink/' },
  };
}

function fakeFetch(site: Site): Fetch {
  return async (url) => {
    const entry = site[url];
    if (!entry) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/html' } });
    const headers: Record<string, string> = { 'content-type': entry.type ?? 'text/html' };
    if (entry.location) headers.location = entry.location;
    return new Response(entry.status === 301 ? null : (entry.body ?? ''), { status: entry.status ?? 200, headers });
  };
}

/** Runs every check once and returns the names of the failed ones with their reasons. */
async function failures(site: Site, root = ROOT, version: string | undefined = 'abc123') {
  const failed: Record<string, string> = {};
  for (const check of smokeChecks(root, version)) {
    try {
      await check.run(fakeFetch(site));
    } catch (error) {
      failed[check.name] = (error as Error).message;
    }
  }
  return failed;
}

describe('smokeChecks', () => {
  it('passes on a site that behaves', async () => {
    expect(await failures(goodSite())).toEqual({});
  });

  it('runs Pages redirect checks only against a non-local host', () => {
    const names = (root: URL) => smokeChecks(root).map((check) => check.name);
    const everywhere = ['version', 'home', 'pages', 'assets', 'brand', 'feeds', 'robots', 'unlisted', 'draft', 'not found'];
    expect(names(ROOT)).toEqual([...everywhere, 'https redirect', 'trailing slash']);
    expect(names(new URL('http://localhost:4321/'))).toEqual(everywhere);
  });

  it('fails until the expected version is served', async () => {
    expect((await failures(goodSite(), ROOT, 'def456')).version).toBe('/version.txt serves abc123, expected def456');
    expect((await failures(goodSite(), ROOT, undefined)).version).toBeUndefined();
  });

  it('fails when a page loads a file from another origin', async () => {
    const site = goodSite();
    site['https://example.github.io/']!.body += '<script src="https://cdn.example.com/x.js"></script>';
    expect((await failures(site)).assets).toBe('/ loads https://cdn.example.com/x.js from another origin');
  });

  it('fails when a stylesheet points at a missing font', async () => {
    const site = goodSite();
    delete site['https://example.github.io/_astro/fonts/f.woff2'];
    expect((await failures(site)).assets).toBe('GET /_astro/fonts/f.woff2: 404, expected 200');
  });

  it('fails when the home page has no CSP', async () => {
    const site = goodSite();
    site['https://example.github.io/']!.body = '<p>no policy</p>';
    expect((await failures(site)).home).toBe("GET /: no CSP starting with default-src 'self'");
  });

  it('fails when the unlisted post is indexable or listed', async () => {
    const site = goodSite();
    site['https://example.github.io/posts/kitchen-sink/']!.body = CSP;
    site['https://example.github.io/rss.xml']!.body = '<rss><link>https://example.github.io/posts/kitchen-sink/</link></rss>';
    const failed = await failures(site);
    expect(failed.unlisted).toBe('GET /posts/kitchen-sink/: robots meta is missing, expected "noindex, nofollow"');
    expect(failed.feeds).toBe('/rss.xml lists the unlisted post');
  });

  it('fails when any checked page may be indexed', async () => {
    const site = goodSite();
    site['https://example.github.io/']!.body = site['https://example.github.io/']!.body!.replace(NOINDEX, '<meta name="robots" content="noindex">');
    site['https://example.github.io/about/']!.body = CSP;
    site['https://example.github.io/smoke-check-missing-page/']!.body = '<h1>Page not found</h1>';
    const failed = await failures(site);
    expect(failed.home).toBe('GET /: robots meta is "noindex", expected "noindex, nofollow"');
    expect(failed.pages).toBe('GET /about/: robots meta is missing, expected "noindex, nofollow"');
    expect(failed['not found']).toBe('GET /smoke-check-missing-page/: robots meta is missing, expected "noindex, nofollow"');
  });

  it('fails when robots.txt hides the tag, or a sitemap is still served', async () => {
    const site = goodSite();
    site['https://example.github.io/robots.txt']!.body = ROBOTS.replace('Allow: /', 'Disallow: /');
    expect((await failures(site)).robots).toMatch(/^\/robots\.txt: \* may not crawl \/, so it cannot read the noindex tag; /);
    const stale = goodSite();
    stale['https://example.github.io/sitemap.xml'] = { type: 'application/xml', body: '<urlset></urlset>' };
    expect((await failures(stale)).robots).toBe('GET /sitemap.xml: 200, expected 404');
  });

  it('fails when the draft is served', async () => {
    const site = goodSite();
    site['https://example.github.io/posts/draft-fixture/'] = { body: 'draft' };
    expect((await failures(site)).draft).toBe('GET /posts/draft-fixture/: 200, expected 404');
  });

  it('fails when a page is missing or has no CSP', async () => {
    const site = goodSite();
    delete site['https://example.github.io/projects/'];
    expect((await failures(site)).pages).toBe('GET /projects/: 404, expected 200');
    site['https://example.github.io/projects/'] = { body: '<p>no policy</p>' };
    expect((await failures(site)).pages).toBe('GET /projects/: no CSP');
  });

  it('fails when an icon or the Open Graph image is wrong', async () => {
    const site = goodSite();
    site['https://example.github.io/favicon.svg']!.type = 'text/plain';
    expect((await failures(site)).brand).toBe('GET /favicon.svg: content type text/plain');
    const relative = goodSite();
    relative['https://example.github.io/']!.body = `${CSP}<meta property="og:image" content="/og.png">`;
    expect((await failures(relative)).brand).toBe('GET /: og:image is /og.png, expected an https URL');
    const missing = goodSite();
    delete missing['https://example.github.io/og.png'];
    expect((await failures(missing)).brand).toBe('GET /og.png: 404, expected 200');
  });

  it("fails when a missing path does not get the site's 404 page", async () => {
    const site = goodSite();
    delete site['https://example.github.io/smoke-check-missing-page/'];
    expect((await failures(site))['not found']).toBe("GET /smoke-check-missing-page/: 404 without the site's own 404 page");
  });

  it('fails when a redirect is missing or points elsewhere', async () => {
    const site = goodSite();
    site['http://example.github.io/'] = { body: 'plain http' };
    site['https://example.github.io/posts/kitchen-sink'] = { status: 301, location: '/elsewhere/' };
    const failed = await failures(site);
    expect(failed['https redirect']).toBe(
      'GET http://example.github.io/: 200 to nowhere, expected 301 to https://example.github.io/',
    );
    expect(failed['trailing slash']).toContain('301 to https://example.github.io/elsewhere/, expected 301');
  });
});

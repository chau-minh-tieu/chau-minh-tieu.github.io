/**
 * Smoke checks for a deployed copy of the site (F3), shared by
 * scripts/smoke.ts and the tests. Each check fetches a few URLs and throws
 * with the reason when the site does not behave as the build-output tests
 * promise for dist/. Requests never follow redirects: a 200 must be a real 200.
 */

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface Check {
  name: string;
  /** Resolves with a short detail for the report, or throws with the reason. */
  run: (fetch: Fetch) => Promise<string>;
}

/** The unlisted regression post and the draft that must never be built (F2). */
const UNLISTED = 'posts/kitchen-sink/';
const DRAFT = 'posts/draft-fixture/';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** `pnpm preview` and other local servers: Pages' own redirects are not there. */
export function isLocal(url: URL): boolean {
  return LOCAL_HOSTS.has(url.hostname);
}

/** The site root for any URL on it: https://host/posts/x → https://host/. */
export function siteRoot(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`not an http(s) URL: ${input}`);
  }
  return new URL('/', url);
}

const decode = (value: string) =>
  value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const TAG = /<(script|link|img|source)\b([^>]*)>/gi;
const ATTRIBUTE = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;

/** Link types that make the browser load something; canonical, alternate and the like do not. */
const LOADING_RELS = new Set(['stylesheet', 'preload', 'modulepreload', 'icon', 'apple-touch-icon', 'manifest']);

function attributes(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, key, double, single, bare] of source.matchAll(ATTRIBUTE)) {
    map.set(key!.toLowerCase(), decode(double ?? single ?? bare ?? ''));
  }
  return map;
}

/** URLs in a srcset: "a.webp 1x, b.webp 2x" → a.webp, b.webp. */
function srcset(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0] ?? '').filter(Boolean);
}

function resolve(refs: (string | undefined)[], base: URL): URL[] {
  return refs
    .filter((ref): ref is string => ref !== undefined && ref.trim() !== '' && !ref.trim().startsWith('data:'))
    .map((ref) => new URL(ref.trim(), base));
}

/** Every url(…) in a stylesheet, resolved against the stylesheet's URL; data: URLs skipped. */
export function cssUrls(css: string, base: URL): URL[] {
  return resolve(
    Array.from(css.matchAll(CSS_URL), ([, double, single, bare]) => double ?? single ?? bare),
    base,
  );
}

/**
 * Everything a page makes the browser load: scripts, loading links
 * (stylesheets, preloads, icons), images and their srcsets, and url(…) in
 * inline <style> blocks (Astro inlines the @font-face rules). Plain links
 * (<a href>) are navigation, not loads, and are left out.
 */
export function resourceUrls(html: string, page: URL): URL[] {
  const refs: (string | undefined)[] = [];
  for (const [, tag, source] of html.matchAll(TAG)) {
    const attrs = attributes(source!);
    switch (tag!.toLowerCase()) {
      case 'script':
        refs.push(attrs.get('src'));
        break;
      case 'link': {
        const rels = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
        if (rels.some((rel) => LOADING_RELS.has(rel))) refs.push(attrs.get('href'));
        break;
      }
      default:
        refs.push(attrs.get('src'), ...srcset(attrs.get('srcset')));
    }
  }
  const urls = resolve(refs, page);
  for (const [, css] of html.matchAll(STYLE_BLOCK)) urls.push(...cssUrls(css!, page));
  return urls;
}

/** The policy in the page's CSP <meta> tag, as Astro writes it. */
export function cspOf(html: string): string | undefined {
  const value = html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/i)?.[1];
  return value === undefined ? undefined : decode(value);
}

export function hasNoindex(html: string): boolean {
  return /<meta name="robots" content="[^"]*\bnoindex\b/i.test(html);
}

interface Page {
  status: number;
  type: string;
  location: string | null;
  text: string;
}

async function get(fetch: Fetch, url: URL): Promise<Page> {
  let response: Response;
  try {
    response = await fetch(url.href, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    throw new Error(`GET ${url.href}: ${cause?.code ?? cause?.message ?? (error as Error).message}`);
  }
  return {
    status: response.status,
    type: response.headers.get('content-type') ?? '',
    location: response.headers.get('location'),
    text: await response.text(),
  };
}

async function expectStatus(fetch: Fetch, url: URL, status: number): Promise<Page> {
  const page = await get(fetch, url);
  if (page.status !== status) throw new Error(`GET ${url.pathname}: ${page.status}, expected ${status}`);
  return page;
}

async function expectRedirect(fetch: Fetch, from: URL, to: URL): Promise<string> {
  const page = await get(fetch, from);
  const target = page.location === null ? null : new URL(page.location, from).href;
  if (page.status !== 301 || target !== to.href) {
    throw new Error(`GET ${from.href}: ${page.status} to ${target ?? 'nowhere'}, expected 301 to ${to.href}`);
  }
  return `${from.href} → 301 → ${to.href}`;
}

/**
 * The checks for the site at `root`, in the order they run. With `version`,
 * the first check passes only once /version.txt serves that commit.
 */
export function smokeChecks(root: URL, version?: string): Check[] {
  const at = (path: string) => new URL(path, root);

  const checks: Check[] = [
    {
      name: 'version',
      run: async (fetch) => {
        const served = (await expectStatus(fetch, at('version.txt'), 200)).text.trim();
        if (version !== undefined && served !== version) {
          throw new Error(`/version.txt serves ${served.slice(0, 40)}, expected ${version}`);
        }
        return served;
      },
    },
    {
      name: 'home',
      run: async (fetch) => {
        const home = await expectStatus(fetch, root, 200);
        if (!home.type.startsWith('text/html')) throw new Error(`GET /: content type ${home.type}`);
        const csp = cspOf(home.text);
        if (!csp?.startsWith("default-src 'self';")) throw new Error("GET /: no CSP starting with default-src 'self'");
        return 'HTML with the CSP meta tag';
      },
    },
    {
      name: 'assets',
      run: async (fetch) => {
        const queue: URL[] = [];
        const seen = new Set<string>();
        const add = (urls: URL[], from: string) => {
          for (const url of urls) {
            if (url.origin !== root.origin) throw new Error(`${from} loads ${url.href} from another origin`);
            if (!seen.has(url.href)) queue.push(url);
            seen.add(url.href);
          }
        };
        for (const path of ['', UNLISTED]) {
          add(resourceUrls((await expectStatus(fetch, at(path), 200)).text, at(path)), `/${path}`);
        }
        // Stylesheets load fonts and images of their own, so they join the queue.
        for (let url = queue.shift(); url; url = queue.shift()) {
          const file = await expectStatus(fetch, url, 200);
          if (file.type.startsWith('text/css')) add(cssUrls(file.text, url), url.pathname);
        }
        return `${seen.size} file(s), all same-origin`;
      },
    },
    {
      name: 'feeds',
      run: async (fetch) => {
        const rss = await expectStatus(fetch, at('rss.xml'), 200);
        const sitemap = await expectStatus(fetch, at('sitemap.xml'), 200);
        const robots = await expectStatus(fetch, at('robots.txt'), 200);
        if (!rss.text.includes('<rss')) throw new Error('/rss.xml is not an RSS feed');
        if (!sitemap.text.includes('<urlset')) throw new Error('/sitemap.xml is not a sitemap');
        if (!/^Sitemap: /m.test(robots.text)) throw new Error('/robots.txt does not point to the sitemap');
        for (const [path, page] of [['/rss.xml', rss], ['/sitemap.xml', sitemap]] as const) {
          if (page.text.includes(`/${UNLISTED}`)) throw new Error(`${path} lists the unlisted post`);
        }
        return 'RSS, sitemap and robots.txt; no unlisted post';
      },
    },
    {
      name: 'unlisted',
      run: async (fetch) => {
        const post = await expectStatus(fetch, at(UNLISTED), 200);
        if (!hasNoindex(post.text)) throw new Error(`/${UNLISTED} has no noindex`);
        return `/${UNLISTED} with noindex`;
      },
    },
    {
      name: 'draft',
      run: async (fetch) => {
        await expectStatus(fetch, at(DRAFT), 404);
        return `/${DRAFT} is 404`;
      },
    },
  ];

  if (!isLocal(root)) {
    const http = new URL(root);
    http.protocol = 'http:';
    checks.push(
      { name: 'https redirect', run: (fetch) => expectRedirect(fetch, http, root) },
      { name: 'trailing slash', run: (fetch) => expectRedirect(fetch, at(UNLISTED.slice(0, -1)), at(UNLISTED)) },
    );
  }
  return checks;
}

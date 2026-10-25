/**
 * Link check for post pages (F6), shared by scripts/link-check.ts and the
 * tests. It reads a post as the build wrote it, so links the build adds (the
 * sources list) are checked too, and asks each external site whether the link
 * still leads somewhere.
 *
 * Only definite breakage fails: 404, 410 and a host that does not exist.
 * Many sites refuse automated requests (401, 403, 429), and servers and
 * networks have bad minutes (5xx, timeouts), so those are warnings for the
 * reviewer to judge. Internal links and anchors are tested on every page by
 * tests/build-output.test.ts.
 */
import { attributes } from './html.ts';

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export type Verdict = 'ok' | 'warn' | 'fail';

export interface LinkResult {
  url: string;
  verdict: Verdict;
  detail: string;
}

export interface CheckOptions {
  /** Per request. */
  timeoutMs: number;
  /** Extra GET attempts after a warning, with `delayMs`, then twice that, between them. */
  retries: number;
  delayMs: number;
}

export const DEFAULTS: CheckOptions = { timeoutMs: 10_000, retries: 2, delayMs: 2_000 };

const ARTICLE = /<article\b[^>]*>([\s\S]*?)<\/article>/i;
const ANCHOR = /<a\b([^>]*)>/gi;

/**
 * External web links in the post: the body and the sources inside <article>,
 * without the discussion link every post carries, without links to the site
 * itself, once each (fragments ignored).
 */
export function postLinks(html: string, site: URL): URL[] {
  const article = html.match(ARTICLE)?.[1] ?? '';
  const links = new Map<string, URL>();
  for (const [, source] of article.matchAll(ANCHOR)) {
    const attrs = attributes(source!);
    const href = attrs.get('href')?.trim();
    if (!href || (attrs.get('class') ?? '').split(/\s+/).includes('discuss')) continue;
    let url: URL;
    try {
      url = new URL(href, site);
    } catch {
      continue;
    }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.origin === site.origin) continue;
    url.hash = '';
    if (!links.has(url.href)) links.set(url.href, url);
  }
  return [...links.values()];
}

export function verdictForStatus(status: number): Verdict {
  if (status >= 200 && status < 400) return 'ok';
  return status === 404 || status === 410 ? 'fail' : 'warn';
}

/** A request that got no response: only a host that does not exist is definite. */
export function verdictForError(code: string): Verdict {
  return code === 'ENOTFOUND' ? 'fail' : 'warn';
}

const HEADERS = {
  'user-agent': 'chau-minh-tieu.github.io link check (+https://github.com/chau-minh-tieu/chau-minh-tieu.github.io)',
  accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
};

interface Answer {
  verdict: Verdict;
  detail: string;
}

async function request(fetch: Fetch, url: URL, method: 'HEAD' | 'GET', timeoutMs: number): Promise<Answer> {
  try {
    const response = await fetch(url.href, {
      method,
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    // The body is not needed; cancelling it frees the connection.
    await response.body?.cancel().catch(() => {});
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    const moved = response.redirected && response.url ? `, redirected to ${response.url}` : '';
    return { verdict: verdictForStatus(response.status), detail: `${status}${moved}` };
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') {
      return { verdict: 'warn', detail: `no answer within ${timeoutMs / 1000} s` };
    }
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    const code = cause?.code ?? cause?.message ?? (error as Error).message;
    return { verdict: verdictForError(code), detail: code };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HEAD first, the cheap question. Any answer other than success is asked
 * again with GET, which some servers handle differently, and a warning is
 * retried with GET before it stands. A plain-HTTP link that works is a warning.
 */
export async function checkLink(fetch: Fetch, url: URL, options: CheckOptions = DEFAULTS): Promise<LinkResult> {
  let answer = await request(fetch, url, 'HEAD', options.timeoutMs);
  if (answer.verdict !== 'ok') {
    answer = await request(fetch, url, 'GET', options.timeoutMs);
    for (let attempt = 0; answer.verdict === 'warn' && attempt < options.retries; attempt++) {
      await sleep(options.delayMs * 2 ** attempt);
      answer = await request(fetch, url, 'GET', options.timeoutMs);
    }
  }
  if (answer.verdict === 'ok' && url.protocol === 'http:') {
    return { url: url.href, verdict: 'warn', detail: `${answer.detail}; not HTTPS` };
  }
  return { url: url.href, ...answer };
}

/** Checks every URL, `concurrency` at a time; results in the order of `urls`. */
export async function checkLinks(
  fetch: Fetch,
  urls: readonly URL[],
  concurrency = 4,
  options: CheckOptions = DEFAULTS,
): Promise<LinkResult[]> {
  const results: LinkResult[] = new Array(urls.length);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const index = next++;
      results[index] = await checkLink(fetch, urls[index]!, options);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

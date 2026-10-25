import { describe, expect, it } from 'vitest';
import { checkLink, checkLinks, postLinks, verdictForError, verdictForStatus, type Fetch } from './links.ts';

const SITE = new URL('https://chau-minh-tieu.github.io/');
const FAST = { timeoutMs: 1_000, retries: 2, delayMs: 1 };

describe('postLinks', () => {
  const page = [
    '<nav><a href="https://github.com/chau-minh-tieu">GitHub</a></nav>',
    '<article class="post">',
    '<p><a href="https://docs.example.com/guide#setup">a guide</a> and <a href="https://docs.example.com/guide#usage">again</a>',
    '<a href="/about/">About</a> <a href="#user-content-fn-1">1</a> <a href="https://chau-minh-tieu.github.io/posts/other/">a post</a>',
    '<a href="http://plain.example.net/?a=1&amp;b=2">plain</a> <a>no href</a></p>',
    '<section class="sources"><a href="https://spec.example.org/">A spec</a></section>',
    '<a class="discuss" href="https://github.com/chau-minh-tieu/chau-minh-tieu.github.io/discussions/new">Discuss</a>',
    '</article>',
    '<footer><a href="https://example.com/footer">footer</a></footer>',
  ].join('\n');

  it('returns the external links inside the article, once each, without fragments', () => {
    expect(postLinks(page, SITE).map((url) => url.href)).toEqual([
      'https://docs.example.com/guide',
      'http://plain.example.net/?a=1&b=2',
      'https://spec.example.org/',
    ]);
  });

  it('finds nothing in a page without an article', () => {
    expect(postLinks('<a href="https://example.com/">x</a>', SITE)).toEqual([]);
  });
});

describe('verdicts', () => {
  it('fails only definite breakage', () => {
    expect([200, 204, 301, 404, 410, 401, 403, 429, 500, 503, 999].map(verdictForStatus)).toEqual([
      'ok', 'ok', 'ok', 'fail', 'fail', 'warn', 'warn', 'warn', 'warn', 'warn', 'warn',
    ]);
    expect(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'CERT_HAS_EXPIRED'].map(verdictForError)).toEqual([
      'fail', 'warn', 'warn', 'warn',
    ]);
  });
});

/** A fake site: answers per method in order, the last answer repeating. */
function fakeFetch(answers: Record<string, (number | Error)[]>) {
  const calls: string[] = [];
  const fetch: Fetch = async (_url, init) => {
    const method = init?.method ?? 'GET';
    calls.push(method);
    const list = answers[method] ?? [200];
    const answer = list[Math.min(calls.filter((call) => call === method).length - 1, list.length - 1)]!;
    if (answer instanceof Error) throw answer;
    return new Response(null, { status: answer });
  };
  return { fetch, calls };
}

const networkError = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: { code } });

describe('checkLink', () => {
  const url = new URL('https://docs.example.com/guide');

  it('stops at a successful HEAD', async () => {
    const { fetch, calls } = fakeFetch({ HEAD: [200] });
    expect(await checkLink(fetch, url, FAST)).toEqual({ url: url.href, verdict: 'ok', detail: '200' });
    expect(calls).toEqual(['HEAD']);
  });

  it('asks again with GET when a server refuses HEAD', async () => {
    const { fetch, calls } = fakeFetch({ HEAD: [405], GET: [200] });
    expect((await checkLink(fetch, url, FAST)).verdict).toBe('ok');
    expect(calls).toEqual(['HEAD', 'GET']);
  });

  it('fails a page that is gone, without retrying', async () => {
    const { fetch, calls } = fakeFetch({ HEAD: [404], GET: [404] });
    expect(await checkLink(fetch, url, FAST)).toMatchObject({ verdict: 'fail', detail: '404' });
    expect(calls).toEqual(['HEAD', 'GET']);
  });

  it('fails a host that does not exist', async () => {
    const { fetch } = fakeFetch({ HEAD: [networkError('ENOTFOUND')], GET: [networkError('ENOTFOUND')] });
    expect(await checkLink(fetch, url, FAST)).toMatchObject({ verdict: 'fail', detail: 'ENOTFOUND' });
  });

  it('retries a warning and keeps the answer that settles it', async () => {
    const { fetch, calls } = fakeFetch({ HEAD: [503], GET: [503, 200] });
    expect((await checkLink(fetch, url, FAST)).verdict).toBe('ok');
    expect(calls).toEqual(['HEAD', 'GET', 'GET']);
  });

  it('warns when a site keeps refusing automated requests', async () => {
    const { fetch, calls } = fakeFetch({ HEAD: [403], GET: [403] });
    expect(await checkLink(fetch, url, FAST)).toMatchObject({ verdict: 'warn', detail: '403' });
    expect(calls).toEqual(['HEAD', 'GET', 'GET', 'GET']);
  });

  it('warns on a timeout', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const { fetch } = fakeFetch({ HEAD: [timeout], GET: [timeout] });
    expect(await checkLink(fetch, url, FAST)).toMatchObject({ verdict: 'warn', detail: 'no answer within 1 s' });
  });

  it('warns on a working link without HTTPS', async () => {
    const { fetch } = fakeFetch({ HEAD: [200] });
    expect(await checkLink(fetch, new URL('http://plain.example.net/'), FAST)).toMatchObject({
      verdict: 'warn',
      detail: '200; not HTTPS',
    });
  });
});

describe('checkLinks', () => {
  it('keeps the order of the links', async () => {
    const fetch: Fetch = async (url) => new Response(null, { status: url.includes('gone') ? 404 : 200 });
    const urls = ['https://a.example/', 'https://b.example/gone', 'https://c.example/'].map((href) => new URL(href));
    const results = await checkLinks(fetch, urls, 2, FAST);
    expect(results.map((result) => [result.url, result.verdict])).toEqual([
      ['https://a.example/', 'ok'],
      ['https://b.example/gone', 'fail'],
      ['https://c.example/', 'ok'],
    ]);
  });
});

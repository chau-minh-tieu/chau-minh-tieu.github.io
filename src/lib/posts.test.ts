import { describe, expect, it } from 'vitest';
import {
  disclosureOf,
  discussUrl,
  formatDate,
  formatMonth,
  isBuilt,
  isListed,
  isoDate,
  neighbours,
  newestFirst,
  readingTime,
  type PostLike,
} from './posts.ts';
import { postSchema } from './schema.ts';

function post(id: string, pubDate: string, extra: Record<string, unknown> = {}): PostLike {
  const data = postSchema.parse({
    title: `Post ${id}`,
    description: 'About it.',
    pubDate,
    tags: ['leadership'],
    status: 'published',
    ...extra,
  });
  return { id, data };
}

describe('statuses', () => {
  it('builds drafts only on the dev server', () => {
    expect(isBuilt('draft', false)).toBe(false);
    expect(isBuilt('draft', true)).toBe(true);
    expect(isBuilt('unlisted', false)).toBe(true);
    expect(isBuilt('published', false)).toBe(true);
  });

  it('lists published posts only', () => {
    expect(isListed('published')).toBe(true);
    expect(isListed('unlisted')).toBe(false);
    expect(isListed('draft')).toBe(false);
  });
});

describe('ordering and neighbours', () => {
  const posts = newestFirst([post('b', '2026-01-02'), post('c', '2026-03-01'), post('a', '2026-01-02')]);

  it('sorts newest first and breaks ties by id', () => {
    expect(posts.map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('finds the newer and older post', () => {
    expect(neighbours(posts, 'a')).toEqual({ newer: posts[0], older: posts[2] });
    expect(neighbours(posts, 'c').newer).toBeUndefined();
    expect(neighbours(posts, 'unlisted-one')).toEqual({});
  });
});

describe('readingTime', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

  it('counts prose at 230 words per minute, at least one minute', () => {
    expect(readingTime(words(10))).toBe(1);
    expect(readingTime(words(230 * 9))).toBe(9);
  });

  it('ignores code blocks, tags and link targets', () => {
    const code = ['```sql', words(2000), '```'].join('\n');
    const link = `[docs](https://example.com/${'a/'.repeat(500)})`;
    expect(readingTime(`${words(460)}\n\n${code}\n\n<div class="x"></div> ${link}`)).toBe(2);
  });
});

describe('dates', () => {
  it('formats in UTC, so the written day never shifts', () => {
    const date = new Date('2026-11-02T00:00:00Z');
    expect(formatDate(date)).toBe('Nov 2, 2026');
    expect(isoDate(date)).toBe('2026-11-02');
  });

  it('names the month of the "Now" list', () => {
    expect(formatMonth('2026-10')).toBe('October 2026');
    expect(formatMonth('2027-01')).toBe('January 2027');
  });
});

describe('footer', () => {
  it('uses the default disclosure, an override, or none', () => {
    expect(disclosureOf(post('a', '2026-01-01').data)).toMatch(/^Drafted with AI/);
    expect(disclosureOf(post('a', '2026-01-01', { disclosure: 'Mine.' }).data)).toBe('Mine.');
    expect(disclosureOf(post('a', '2026-01-01', { aiAssisted: false }).data)).toBeUndefined();
  });

  it('links to a pre-filled discussion in the Posts category', () => {
    const url = new URL(discussUrl(post('a-post', '2026-01-01')));
    expect(url.pathname).toBe('/chau-minh-tieu/chau-minh-tieu.github.io/discussions/new');
    expect(url.searchParams.get('category')).toBe('posts');
    expect(url.searchParams.get('title')).toBe('Post a-post');
    expect(url.searchParams.get('body')).toContain('https://chau-minh-tieu.github.io/posts/a-post/');
  });
});

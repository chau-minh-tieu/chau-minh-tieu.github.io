import { describe, expect, it } from 'vitest';
import { postSchema } from './schema.ts';

const valid = {
  title: 'A post',
  description: 'What the post is about.',
  pubDate: '2026-11-02',
  tags: ['engineering'],
  status: 'unlisted',
  sources: [{ title: 'Astro docs', url: 'https://docs.astro.build/' }],
};

/** The paths of the fields that fail, as Astro reports them. */
function failures(input: Record<string, unknown>): string[] {
  const result = postSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.') || '(root)');
}

describe('postSchema', () => {
  it('accepts a valid post and fills the defaults', () => {
    const post = postSchema.parse(valid);
    expect(post.pubDate).toEqual(new Date('2026-11-02T00:00:00Z'));
    expect(post.aiAssisted).toBe(true);
  });

  it('requires a description of at most 160 characters', () => {
    const { description: _, ...missing } = valid;
    expect(failures(missing)).toEqual(['description']);
    expect(failures({ ...valid, description: 'x'.repeat(161) })).toEqual(['description']);
  });

  it('limits titles to 120 characters', () => {
    expect(failures({ ...valid, title: 'x'.repeat(121) })).toEqual(['title']);
  });

  it('takes one or two distinct known tags', () => {
    expect(failures({ ...valid, tags: [] })).toEqual(['tags']);
    expect(failures({ ...valid, tags: ['engineering', 'ai', 'leadership'] })).toEqual(['tags']);
    expect(failures({ ...valid, tags: ['ai', 'ai'] })).toEqual(['tags']);
    expect(failures({ ...valid, tags: ['cooking'] })).toEqual(['tags.0']);
  });

  it('requires sources for engineering and ai posts only', () => {
    expect(failures({ ...valid, sources: [] })).toEqual(['sources']);
    expect(failures({ ...valid, tags: ['leadership', 'ai'], sources: [] })).toEqual(['sources']);
    expect(failures({ ...valid, tags: ['leadership'], sources: [] })).toEqual([]);
  });

  it('accepts only web URLs as sources', () => {
    const bad = (url: string) => failures({ ...valid, sources: [{ title: 'x', url }] });
    expect(bad('javascript:alert(1)')).toEqual(['sources.0.url']);
    expect(bad('data:text/html,hi')).toEqual(['sources.0.url']);
    expect(bad('http://example.com/')).toEqual([]);
  });

  it('requires an explicit known status', () => {
    const { status: _, ...missing } = valid;
    expect(failures(missing)).toEqual(['status']);
    expect(failures({ ...valid, status: 'live' })).toEqual(['status']);
  });

  it('rejects unknown keys, including slug', () => {
    expect(failures({ ...valid, pubdate: '2026-11-02' })).toEqual(['(root)']);
    expect(failures({ ...valid, slug: 'elsewhere' })).toEqual(['(root)']);
  });

  it('rejects an updatedDate before the pubDate', () => {
    expect(failures({ ...valid, updatedDate: '2026-11-01' })).toEqual(['updatedDate']);
    expect(failures({ ...valid, updatedDate: '2026-11-03' })).toEqual([]);
  });

  it('takes the brief as a positive issue number', () => {
    expect(failures({ ...valid, brief: 12 })).toEqual([]);
    expect(failures({ ...valid, brief: 0 })).toEqual(['brief']);
  });
});

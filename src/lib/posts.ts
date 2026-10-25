/**
 * Rules about posts that do not need Astro: which statuses are built and
 * listed, ordering, neighbours, reading time, dates and the post footer's
 * links. Pages call these through src/lib/collection.ts; tests call them
 * directly with plain objects.
 */
import type { PostData, Status, Tag } from './schema.ts';

export interface PostLike {
  id: string;
  data: PostData;
}

export const SITE = 'https://chau-minh-tieu.github.io';
export const REPOSITORY = 'chau-minh-tieu/chau-minh-tieu.github.io';

export const TAG_LABELS: Record<Tag, string> = {
  engineering: 'Engineering',
  ai: 'AI',
  leadership: 'Leadership',
};

/** "What I write about" (HANDOFF.md 5.3), used as the tag pages' ledes. */
export const TAG_DESCRIPTIONS: Record<Tag, string> = {
  engineering: 'Backend systems, system design, data, and the occasional deep dive into a tool I had to understand.',
  ai: 'Agents, LLM tooling, and building software with a model in the loop, including where it goes wrong.',
  leadership: 'Hiring, growing engineers, and making technical decisions as a team — lessons, never stories about people.',
};

const DEFAULT_DISCLOSURE = 'Drafted with AI from my notes and the project’s code. Reviewed and edited by me.';
const WORDS_PER_MINUTE = 230;

/** Drafts exist only on the dev server; unlisted and published posts are built. */
export function isBuilt(status: Status, dev: boolean): boolean {
  return status !== 'draft' || dev;
}

/** Only published posts appear on home, tag pages, RSS, the sitemap and next/previous. */
export function isListed(status: Status): boolean {
  return status === 'published';
}

/** Newest first; the id breaks ties, so the order never depends on the file system. */
export function newestFirst<T extends PostLike>(posts: readonly T[]): T[] {
  return [...posts].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id),
  );
}

/** The listed posts before and after `id` in newest-first order; none for an unlisted post. */
export function neighbours<T extends PostLike>(listed: readonly T[], id: string): { newer?: T; older?: T } {
  const index = listed.findIndex((post) => post.id === id);
  if (index === -1) return {};
  return { newer: listed[index - 1], older: listed[index + 1] };
}

export function primaryTag(post: PostLike): Tag {
  return post.data.tags[0]!;
}

/**
 * Minutes to read the prose at 230 words per minute, at least 1. Code blocks,
 * HTML tags, link targets and Markdown punctuation are not words.
 */
export function readingTime(markdown: string): number {
  const prose = markdown
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ' ');
  const words = prose.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  return Math.max(1, Math.round(words.length / WORDS_PER_MINUTE));
}

// A YAML date such as 2026-11-02 is midnight UTC. Formatting in UTC keeps the
// day the author wrote; local time west of UTC would show the day before.
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** "Nov 2, 2026" */
export function formatDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

/** "2026-11-02", for <time datetime>. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function postPath(post: PostLike): string {
  return `/posts/${post.id}/`;
}

/** The footer's disclosure sentence, or undefined when the post was not drafted with AI. */
export function disclosureOf(data: PostData): string | undefined {
  if (!data.aiAssisted) return undefined;
  return data.disclosure ?? DEFAULT_DISCLOSURE;
}

/** A new GitHub Discussion in the "Posts" category, with the post's title and link filled in. */
export function discussUrl(post: PostLike): string {
  const url = new URL(`https://github.com/${REPOSITORY}/discussions/new`);
  url.searchParams.set('category', 'posts');
  url.searchParams.set('title', post.data.title);
  url.searchParams.set('body', `About ${SITE}${postPath(post)}\n\n`);
  return url.href;
}

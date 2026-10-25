/**
 * The posts collection as pages see it. Drafts are left out of production
 * builds here, in one place, so no page can forget the rule.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { isBuilt, isListed, newestFirst } from './posts.ts';

export type Post = CollectionEntry<'posts'>;

/** Every post that gets a page: unlisted and published, plus drafts in `astro dev`. */
export async function builtPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => isBuilt(data.status, import.meta.env.DEV));
  return newestFirst(posts);
}

/** Published posts, newest first: home, tag pages, RSS, sitemap, next/previous. */
export async function listedPosts(): Promise<Post[]> {
  return (await builtPosts()).filter(({ data }) => isListed(data.status));
}

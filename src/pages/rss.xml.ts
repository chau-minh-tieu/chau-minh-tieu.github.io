// /rss.xml: published posts only. https://docs.astro.build/en/recipes/rss/
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { listedPosts } from '../lib/collection.ts';
import { TAG_LABELS, postPath } from '../lib/posts.ts';

export async function GET(context: APIContext) {
  const posts = await listedPosts();
  return rss({
    title: 'Chau Tieu',
    description: 'Notes on software, data & AI, and engineering leadership.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postPath(post),
      categories: post.data.tags.map((tag) => TAG_LABELS[tag]),
    })),
    customData: '<language>en</language>',
  });
}

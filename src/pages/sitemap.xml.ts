/**
 * /sitemap.xml, an endpoint: a route that returns a file instead of a page.
 * https://docs.astro.build/en/guides/endpoints/
 *
 * Lists every static page in src/pages (found with import.meta.glob, so a new
 * page is included without touching this file), every tag page and every
 * published post. 404 and unlisted posts are left out. tests/build-output
 * checks that the result matches the pages actually built.
 */
import type { APIContext } from 'astro';
import { listedPosts } from '../lib/collection.ts';
import { isoDate, postPath } from '../lib/posts.ts';
import { TAGS } from '../lib/schema.ts';

const pages = Object.keys(import.meta.glob('./**/*.astro'));

/** './index.astro' → '/', './about.astro' → '/about/'; dynamic routes ([…]) and 404 are skipped. */
function staticPaths(): string[] {
  return pages
    .filter((file) => !file.includes('[') && !file.endsWith('/404.astro'))
    .map((file) => file.slice(1).replace(/(?:\/index)?\.astro$/, '/').replace(/^\/*/, '/'));
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET({ site }: APIContext) {
  const posts = await listedPosts();
  const entries: { path: string; lastmod?: string }[] = [
    ...staticPaths().map((path) => ({ path })),
    ...TAGS.map((tag) => ({ path: `/tags/${tag}/` })),
    ...posts.map((post) => ({ path: postPath(post), lastmod: isoDate(post.data.updatedDate ?? post.data.pubDate) })),
  ];
  const urls = entries.map(({ path, lastmod }) => {
    const loc = `<loc>${escape(new URL(path, site).href)}</loc>`;
    return `  <url>${loc}${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}

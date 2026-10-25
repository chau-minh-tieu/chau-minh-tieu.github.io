// Content collections: https://docs.astro.build/en/guides/content-collections/
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { nowSchema, postSchema } from './lib/schema.ts';

// One folder per post, images beside it. The glob loader drops the trailing
// /index from the id, so src/content/posts/<slug>/index.md has the id <slug>.
const posts = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/posts' }),
  schema: postSchema,
});

// The "Now" list on About: one entry, keyed `now`, in a YAML file that can be
// edited by hand. The file loader reads YAML without a custom parser.
const now = defineCollection({
  loader: file('src/data/now.yaml'),
  schema: nowSchema,
});

export const collections = { posts, now };

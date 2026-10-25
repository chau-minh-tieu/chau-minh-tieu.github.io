// Content collections: https://docs.astro.build/en/guides/content-collections/
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postSchema } from './lib/schema.ts';

// One folder per post, images beside it. The glob loader drops the trailing
// /index from the id, so src/content/posts/<slug>/index.md has the id <slug>.
const posts = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/posts' }),
  schema: postSchema,
});

export const collections = { posts };

/**
 * Frontmatter schema of a post (HANDOFF.md 6.2). src/content.config.ts hands
 * it to the posts collection, so `astro build` validates every post and a
 * failure names the file and the field. Kept in its own module so unit tests
 * can import it without Astro's virtual modules.
 */
import { z } from 'astro/zod';

export const TAGS = ['engineering', 'ai', 'leadership'] as const;
export type Tag = (typeof TAGS)[number];

export const STATUSES = ['draft', 'unlisted', 'published'] as const;
export type Status = (typeof STATUSES)[number];

/** Tags whose posts must cite sources. */
const NEEDS_SOURCES: readonly Tag[] = ['engineering', 'ai'];

// Sources are rendered as links, so only web URLs pass (no javascript: or data:).
const source = z.strictObject({
  title: z.string().trim().min(1),
  url: z.url({ protocol: /^https?$/ }),
});

export const postSchema = z
  // strictObject rejects unknown keys: a typo such as `pubdate` fails instead
  // of being ignored, and so does `slug`, which would silently change the URL.
  .strictObject({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z
      .array(z.enum(TAGS))
      .min(1)
      .max(2)
      .refine((tags) => new Set(tags).size === tags.length, 'tags must be distinct'),
    status: z.enum(STATUSES),
    brief: z.number().int().positive().optional(),
    sources: z.array(source).default([]),
    aiAssisted: z.boolean().default(true),
    disclosure: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((post, ctx) => {
    if (post.sources.length === 0 && post.tags.some((tag) => NEEDS_SOURCES.includes(tag))) {
      ctx.addIssue({
        code: 'custom',
        path: ['sources'],
        message: 'sources are required when tags include engineering or ai',
      });
    }
    if (post.updatedDate && post.updatedDate < post.pubDate) {
      ctx.addIssue({ code: 'custom', path: ['updatedDate'], message: 'updatedDate is before pubDate' });
    }
  });

export type PostData = z.output<typeof postSchema>;

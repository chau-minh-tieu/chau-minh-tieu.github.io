/**
 * The Markdown pipeline: options for unified() in astro.config.mjs, shared
 * with the tests so they render posts exactly as the build does.
 *
 * Astro's unified processor runs: remark-parse, GFM, smartypants, remark
 * plugins, remark-rehype, [Shiki, off here], OUR REHYPE PLUGINS, images,
 * heading ids, rehype-raw, stringify. Raw HTML in a post is still unparsed
 * text at our turn (rehypeRawImages refuses raw images while it is), so our
 * list parses it first (rehype-raw), sanitises the
 * whole tree, and only then runs our own transforms and highlighting. Nothing
 * after rehype-sanitize parses author text as HTML, with one exception that
 * carries its own sanitiser: rehype-diagrams parses the SVG rendered from a
 * diagram and checks it against an SVG allowlist at once. The final
 * rehype-raw then has no raw HTML left to parse.
 */
import type { UnifiedProcessorOptions } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import { rehypeAlerts } from './rehype-alerts.ts';
import { rehypeCode, rehypeCodeMeta } from './rehype-code.ts';
import { rehypeDiagrams } from './rehype-diagrams.ts';
import { rehypeFigureNumbers, rehypeFigures, rehypeRawImages } from './rehype-figures.ts';
import { rehypeSidenotes } from './rehype-sidenotes.ts';
import { rehypeTables } from './rehype-tables.ts';

/**
 * GitHub's own allowlist (what github.com renders from a README), tightened:
 * <style> is removed with its content instead of being unwrapped into text,
 * and links may only be web or relative URLs (no mailto:, the site publishes
 * no address). ids and names keep GitHub's "user-content-" prefix, so a post
 * cannot clobber DOM globals such as document.querySelector. The one
 * addition is `data-meta` on <code>, the fence meta that rehype-code reads as
 * plain text.
 */
export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  strip: [...(defaultSchema.strip ?? []), 'style'],
  protocols: { ...defaultSchema.protocols, href: ['http', 'https'] },
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'dataMeta'],
  },
};

/** Options for `unified()` from @astrojs/markdown-remark. */
export const markdownOptions: UnifiedProcessorOptions = {
  rehypePlugins: [
    rehypeCodeMeta,
    rehypeRawImages,
    rehypeRaw,
    [rehypeSanitize, sanitizeSchema],
    rehypeAlerts,
    rehypeTables,
    rehypeFigures,
    rehypeDiagrams,
    rehypeFigureNumbers,
    rehypeCode,
    rehypeSidenotes,
  ],
};

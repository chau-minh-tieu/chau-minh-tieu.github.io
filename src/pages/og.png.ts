/**
 * /og.png: the default Open Graph image, 1200×630, used by every page.
 * Per-post images are deferred (HANDOFF.md 8). BaseLayout.astro points
 * og:image at it.
 */
import { OG_WIDTH, lettersOf, png, readMonogram, socialCard } from '../lib/brand.ts';

export async function GET() {
  return new Response(await png(socialCard(lettersOf(readMonogram())), OG_WIDTH), {
    headers: { 'Content-Type': 'image/png' },
  });
}

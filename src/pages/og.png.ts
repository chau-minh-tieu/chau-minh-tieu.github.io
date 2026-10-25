/**
 * /og.png: the default Open Graph image, 1200×630, used by every page until
 * F8 generates one per post. BaseLayout.astro points og:image at it.
 */
import { OG_WIDTH, lettersOf, png, readMonogram, socialCard } from '../lib/brand.ts';

export async function GET() {
  return new Response(await png(socialCard(lettersOf(readMonogram())), OG_WIDTH), {
    headers: { 'Content-Type': 'image/png' },
  });
}

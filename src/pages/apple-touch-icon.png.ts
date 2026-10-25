/**
 * /apple-touch-icon.png: the monogram on an opaque 180px square for iOS home
 * screens. iOS rounds the corners itself and would fill transparent ones
 * with black, so this one is not round.
 */
import { lettersOf, png, readMonogram, squareMark } from '../lib/brand.ts';

export async function GET() {
  return new Response(await png(squareMark(lettersOf(readMonogram())), 180), {
    headers: { 'Content-Type': 'image/png' },
  });
}

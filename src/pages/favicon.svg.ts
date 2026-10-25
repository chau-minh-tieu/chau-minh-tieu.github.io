/**
 * /favicon.svg: the round monogram, sharp at any size. Browsers that support
 * SVG favicons (Safari only since 26) prefer it over /favicon.ico.
 */
import { lettersOf, readMonogram, roundMark } from '../lib/brand.ts';

export function GET() {
  return new Response(roundMark(lettersOf(readMonogram())), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}

/**
 * /favicon.ico: the round monogram as a 32px PNG inside an ICO container. Every
 * browser reads it, and crawlers and feed readers ask for this path even
 * without a <link>.
 */
import { ico, lettersOf, png, readMonogram, roundMark } from '../lib/brand.ts';

export async function GET() {
  const image = await png(roundMark(lettersOf(readMonogram())), 32);
  return new Response(ico([{ size: 32, png: image }]), {
    headers: { 'Content-Type': 'image/x-icon' },
  });
}

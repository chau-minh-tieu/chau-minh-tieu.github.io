/**
 * The brand files derived from the oxblood monogram (HANDOFF.md 5.5): the
 * favicons and the default Open Graph image. public/brand/monogram-oxblood.svg
 * is the only source; the endpoints in src/pages (favicon.svg.ts,
 * favicon.ico.ts, apple-touch-icon.png.ts, og.png.ts) call these functions once
 * at build time, so changing the SVG changes every derived file.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/** --brand and --on-brand in tokens.css: the same in both themes. */
export const BRAND = '#7a2632';
export const ON_BRAND = '#faf8f3';
/** The light page background (--bg), behind the mark on the social image. */
export const PAGE = '#faf8f3';

/** Open Graph image size: the 1.91:1 card most sites crop to. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_ALT = 'The CT monogram of Chau Tieu: ivory letters on an oxblood circle.';

/** The monogram's drawing area: viewBox="0 0 1024 1024". */
const SIZE = 1024;

/** pnpm runs `astro build` and `vitest` from the repository root. */
export function readMonogram(): string {
  return readFileSync(join(process.cwd(), 'public', 'brand', 'monogram-oxblood.svg'), 'utf8');
}

/** The letters: the `d` of the monogram's only <path>. */
export function lettersOf(svg: string): string {
  const paths = Array.from(svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g), (m) => m[1]!);
  if (paths.length !== 1 || !svg.includes(`viewBox="0 0 ${SIZE} ${SIZE}"`)) {
    throw new Error(`expected one <path> in a ${SIZE}×${SIZE} monogram, found ${paths.length}`);
  }
  return paths[0]!;
}

const svg = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;

/** The mark as the nav shows it: letters on a circle. Corners are transparent. */
export function roundMark(letters: string): string {
  const r = SIZE / 2;
  return svg(SIZE, SIZE, `<circle cx="${r}" cy="${r}" r="${r}" fill="${BRAND}"/><path d="${letters}" fill="${ON_BRAND}"/>`);
}

/** The mark on an opaque square, for icons that platforms crop themselves. */
export function squareMark(letters: string): string {
  return svg(SIZE, SIZE, `<rect width="${SIZE}" height="${SIZE}" fill="${BRAND}"/><path d="${letters}" fill="${ON_BRAND}"/>`);
}

/** The default social image: the round mark centred on the page colour, no text. */
export function socialCard(letters: string): string {
  const mark = 280;
  const scale = mark / SIZE;
  const x = (OG_WIDTH - mark) / 2;
  const y = (OG_HEIGHT - mark) / 2;
  const r = SIZE / 2;
  return svg(
    OG_WIDTH,
    OG_HEIGHT,
    `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${PAGE}"/>` +
      `<g transform="translate(${x} ${y}) scale(${scale})">` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="${BRAND}"/><path d="${letters}" fill="${ON_BRAND}"/></g>`,
  );
}

/**
 * Rasterises an SVG to a PNG of the given width (height follows the
 * viewBox). sharp writes no metadata unless asked to, so the PNG has none.
 */
export async function png(source: string, width: number): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await sharp(Buffer.from(source)).resize({ width }).png().toBuffer();
  // A copy with its own ArrayBuffer, which is what a Response body accepts.
  return new Uint8Array(buffer);
}

/**
 * Wraps square PNGs in an ICO container. Since Windows Vista an ICO entry may
 * hold a PNG as it is, and every browser reads that form: a 6-byte header, a
 * 16-byte directory entry per image, then the images.
 * https://learn.microsoft.com/en-us/previous-versions/ms997538(v=msdn.10)
 */
export function ico(images: readonly { size: number; png: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const header = 6;
  const entry = 16;
  let offset = header + entry * images.length;
  const total = offset + images.reduce((sum, image) => sum + image.png.length, 0);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  images.forEach(({ size, png: data }, i) => {
    if (size < 1 || size > 256) throw new Error(`icon size ${size} is outside 1–256`);
    const at = header + entry * i;
    view.setUint8(at, size % 256); // width; 0 means 256
    view.setUint8(at + 1, size % 256); // height
    view.setUint8(at + 2, 0); // no palette
    view.setUint8(at + 3, 0); // reserved
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, data.length, true);
    view.setUint32(at + 12, offset, true);
    bytes.set(data, offset);
    offset += data.length;
  });
  return bytes;
}

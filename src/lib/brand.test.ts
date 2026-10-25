import { describe, expect, it } from 'vitest';
import { findImageMetadata } from '../../scripts/lib/image-metadata.ts';
import { BRAND, OG_HEIGHT, OG_WIDTH, ico, lettersOf, png, readMonogram, roundMark, socialCard, squareMark } from './brand.ts';

/** Width and height from a PNG's IHDR chunk. */
const pngSize = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  return [view.getUint32(16), view.getUint32(20)];
};

describe('brand', () => {
  const letters = lettersOf(readMonogram());

  it('reads the letters of the oxblood monogram', () => {
    expect(letters).toMatch(/^M[\d.]+ [\d.]+C/);
    expect(() => lettersOf('<svg viewBox="0 0 1024 1024"></svg>')).toThrow(/found 0/);
    expect(() => lettersOf('<svg viewBox="0 0 1024 1024"><path d="M0 0"/><path d="M1 1"/></svg>')).toThrow(/found 2/);
  });

  it('draws the round mark, the square mark and the social card from the same letters', () => {
    for (const svg of [roundMark(letters), squareMark(letters), socialCard(letters)]) {
      expect(svg).toContain(`d="${letters}"`);
      expect(svg).toContain(`fill="${BRAND}"`);
      expect(svg).not.toMatch(/<(metadata|style|script)|href=/);
    }
    expect(roundMark(letters)).toContain('<circle');
    expect(squareMark(letters)).not.toContain('<circle');
    expect(socialCard(letters)).toContain(`viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}"`);
  });

  it('rasterises to PNGs of the requested width, without metadata', async () => {
    const icon = await png(squareMark(letters), 180);
    const card = await png(socialCard(letters), OG_WIDTH);
    expect(pngSize(icon)).toEqual([180, 180]);
    expect(pngSize(card)).toEqual([OG_WIDTH, OG_HEIGHT]);
    expect(findImageMetadata(icon)).toEqual([]);
    expect(findImageMetadata(card)).toEqual([]);
  });

  it('wraps PNGs in an ICO container', () => {
    const a = Uint8Array.from([1, 2, 3]);
    const b = Uint8Array.from([4, 5]);
    const file = ico([
      { size: 32, png: a },
      { size: 256, png: b },
    ]);
    const view = new DataView(file.buffer);
    expect([view.getUint16(0, true), view.getUint16(2, true), view.getUint16(4, true)]).toEqual([0, 1, 2]);
    // First entry: 32×32, 32 bits per pixel, 3 bytes at offset 6 + 2 × 16.
    expect([file[6], file[7], view.getUint16(12, true), view.getUint32(14, true), view.getUint32(18, true)]).toEqual([
      32, 32, 32, 3, 38,
    ]);
    // 256 is written as 0.
    expect([file[22], file[23], view.getUint32(30, true), view.getUint32(34, true)]).toEqual([0, 0, 2, 41]);
    expect([...file.subarray(38)]).toEqual([1, 2, 3, 4, 5]);
    expect(() => ico([{ size: 512, png: a }])).toThrow(/outside/);
  });
});

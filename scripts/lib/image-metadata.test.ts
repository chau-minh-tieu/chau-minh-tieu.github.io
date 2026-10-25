import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findImageMetadata } from './image-metadata.ts';

// Minimal synthetic files: just the block structure the detector walks.
const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((part) => (typeof part === 'string' ? [...Buffer.from(part, 'latin1')] : part)));

const u16 = (n: number) => [n >> 8, n & 0xff];
const u32be = (n: number) => [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const u32le = (n: number) => u32be(n).reverse();

const jpegSegment = (marker: number, body: string) => bytes([0xff, marker, ...u16(body.length + 2)], body);
const jpeg = (...segments: Uint8Array[]) =>
  bytes([0xff, 0xd8], ...segments.map((s) => [...s]), [0xff, 0xda, 0, 2], 'Exif\0\0 inside image data', [0xff, 0xd9]);

const pngChunk = (type: string, data: string) => bytes(u32be(data.length), type, data, [0, 0, 0, 0]);
const png = (...chunks: Uint8Array[]) =>
  bytes([0x89], 'PNG\r\n\x1a\n', ...chunks.map((c) => [...c]), [...pngChunk('IEND', '')]);

const webpChunk = (type: string, data: string) => bytes(type, u32le(data.length), data, data.length % 2 ? [0] : []);
const webp = (...chunks: Uint8Array[]) => bytes('RIFF', [0, 0, 0, 0], 'WEBP', ...chunks.map((c) => [...c]));

/** An ICO container around PNGs: header, one 16-byte entry per image, then the images. */
const icoOf = (...images: Uint8Array[]) => {
  let offset = 6 + 16 * images.length;
  const entries = images.map((image) => {
    const entry = [32, 32, 0, 0, 1, 0, 32, 0, ...u32le(image.length), ...u32le(offset)];
    offset += image.length;
    return entry;
  });
  return bytes([0, 0, 1, 0, images.length, 0], ...entries, ...images.map((i) => [...i]));
};

describe('findImageMetadata', () => {
  it('finds EXIF, XMP, IPTC and C2PA blocks in a JPEG', () => {
    const file = jpeg(
      jpegSegment(0xe0, 'JFIF\0'),
      jpegSegment(0xe1, 'Exif\0\0MM'),
      jpegSegment(0xe1, 'http://ns.adobe.com/xap/1.0/\0<x/>'),
      jpegSegment(0xed, 'Photoshop 3.0\0'),
      jpegSegment(0xeb, 'JP\0\0jumb c2pa'),
    );
    expect(findImageMetadata(file)).toEqual(['EXIF', 'XMP', 'IPTC', 'C2PA']);
  });

  it('ignores marker bytes inside compressed image data', () => {
    expect(findImageMetadata(jpeg(jpegSegment(0xe0, 'JFIF\0')))).toEqual([]);
  });

  it('finds eXIf, XMP, text and C2PA chunks in a PNG', () => {
    const file = png(
      pngChunk('IHDR', '0123456789abc'),
      pngChunk('eXIf', 'MM'),
      pngChunk('iTXt', 'XML:com.adobe.xmp\0'),
      pngChunk('tEXt', 'Author\0someone'),
      pngChunk('caBX', 'jumb'),
    );
    expect(findImageMetadata(file)).toEqual(['EXIF', 'XMP', 'text', 'C2PA']);
    expect(findImageMetadata(png(pngChunk('IHDR', '0123456789abc'), pngChunk('IDAT', 'eXIf')))).toEqual([]);
  });

  it('finds EXIF and XMP chunks in a WebP', () => {
    expect(findImageMetadata(webp(webpChunk('VP8 ', 'abc'), webpChunk('EXIF', 'MM'), webpChunk('XMP ', '<x/>')))).toEqual([
      'EXIF',
      'XMP',
    ]);
    expect(findImageMetadata(webp(webpChunk('VP8 ', 'EXIF')))).toEqual([]);
  });

  it('opens ICO files and walks each PNG inside', () => {
    const clean = png(pngChunk('IHDR', '0123456789abc'));
    expect(findImageMetadata(icoOf(clean))).toEqual([]);
    expect(findImageMetadata(icoOf(clean, png(pngChunk('tEXt', 'Software\0x'))))).toEqual(['text']);
  });

  it('detects the fake metadata in the kitchen-sink fixture', () => {
    const fixture = readFileSync(new URL('../../src/content/posts/kitchen-sink/screenshot-fixture.jpg', import.meta.url));
    expect(findImageMetadata(fixture)).toEqual(['EXIF', 'XMP']);
  });
});

/**
 * Finds metadata blocks in raster images (HANDOFF.md 3.1): EXIF (which holds
 * GPS positions, camera serials and timestamps), XMP, IPTC, C2PA content
 * credentials, and PNG text chunks. Used by the privacy check on committed
 * images and by the build-output test on served ones.
 *
 * JPEG, PNG and WebP are walked block by block, so a byte sequence inside
 * compressed image data is never mistaken for metadata. ICO files (the
 * favicon) are opened and each PNG inside is walked. GIF and AVIF are
 * searched for the markers those blocks start with.
 */

export type MetadataKind = 'EXIF' | 'XMP' | 'IPTC' | 'C2PA' | 'text';

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const contains = (bytes: Uint8Array, marker: string) => Buffer.from(bytes).includes(marker, 0, 'latin1');

function jpeg(bytes: Uint8Array): MetadataKind[] {
  const found: MetadataKind[] = [];
  let offset = 2; // after the SOI marker FF D8
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]!;
    if (marker === 0xda || marker === 0xd9) break; // start of scan, end of image
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    const body = offset + 4;
    if (marker === 0xe1 && ascii(bytes, body, 6) === 'Exif\0\0') found.push('EXIF');
    if (marker === 0xe1 && ascii(bytes, body, 28) === 'http://ns.adobe.com/xap/1.0/') found.push('XMP');
    if (marker === 0xed) found.push('IPTC'); // APP13, Photoshop IRB
    if (marker === 0xeb) found.push('C2PA'); // APP11, JUMBF boxes
    offset = body + length - 2;
  }
  return found;
}

function png(bytes: Uint8Array): MetadataKind[] {
  const found: MetadataKind[] = [];
  let offset = 8; // after the signature
  while (offset + 8 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset).getUint32(0);
    const type = ascii(bytes, offset + 4, 4);
    if (type === 'eXIf') found.push('EXIF');
    if (type === 'iTXt' && ascii(bytes, offset + 8, 17) === 'XML:com.adobe.xmp') found.push('XMP');
    else if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') found.push('text');
    if (type === 'caBX') found.push('C2PA');
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  return found;
}

function webp(bytes: Uint8Array): MetadataKind[] {
  const found: MetadataKind[] = [];
  let offset = 12; // after RIFF....WEBP
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4).getUint32(0, true);
    if (type === 'EXIF') found.push('EXIF');
    if (type === 'XMP ') found.push('XMP');
    offset += 8 + length + (length % 2);
  }
  return found;
}

/** An ICO container: a directory of images, each a PNG or a headerless BMP (which has no metadata). */
function ico(bytes: Uint8Array): MetadataKind[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found: MetadataKind[] = [];
  for (let i = 0; i < view.getUint16(4, true); i++) {
    const entry = 6 + 16 * i;
    if (entry + 16 > bytes.length) break;
    const size = view.getUint32(entry + 8, true);
    const offset = view.getUint32(entry + 12, true);
    const image = bytes.subarray(offset, offset + size);
    if (ascii(image, 1, 3) === 'PNG') found.push(...png(image));
  }
  return found;
}

/** The kinds of metadata in an image, without duplicates; empty when it is clean. */
export function findImageMetadata(bytes: Uint8Array): MetadataKind[] {
  let found: MetadataKind[];
  if (bytes[0] === 0xff && bytes[1] === 0xd8) found = jpeg(bytes);
  else if (ascii(bytes, 1, 3) === 'PNG') found = png(bytes);
  else if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') found = webp(bytes);
  else if (bytes.length >= 6 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) found = ico(bytes);
  else {
    found = [];
    if (contains(bytes, 'Exif\0\0')) found.push('EXIF');
    if (contains(bytes, '<x:xmpmeta') || contains(bytes, 'XMP DataXMP')) found.push('XMP');
    if (contains(bytes, 'c2pa')) found.push('C2PA');
  }
  return [...new Set(found)];
}

/** File extensions the privacy check and the build test treat as raster images. */
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.ico']);

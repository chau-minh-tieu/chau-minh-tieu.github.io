/**
 * Just enough HTML reading for checks over pages Astro wrote (smoke checks,
 * link check): attribute values from a tag's source, entities decoded. Not a
 * parser; the pages it reads are our own build output.
 */

/** The five entities Astro writes in attribute values. */
export const decode = (value: string) =>
  value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const ATTRIBUTE = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** A tag's attributes, from the text between its name and `>`; names lower-cased. */
export function attributes(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [, key, double, single, bare] of source.matchAll(ATTRIBUTE)) {
    map.set(key!.toLowerCase(), decode(double ?? single ?? bare ?? ''));
  }
  return map;
}

/**
 * The figure palette of HANDOFF.md 5.1, as diagrams use it.
 *
 * Authors colour a node with a category class (`A:::violet`). Before
 * rendering, rehype-diagrams adds one classDef per category whose "colours"
 * are markers such as `fig-violet`, not real colours. The renderer copies
 * them into fill and stroke attributes; the theme pass turns every paint
 * attribute into a class (`fig-fill-violet`), and figures.css colours those
 * classes with the light-dark() tokens of tokens.css. One SVG serves both
 * themes, and the hex values live only in tokens.css.
 */

/** Palette categories, in legend order. `external` is dashed slate on the page background. */
export const CATEGORIES = ['slate', 'teal', 'violet', 'blue', 'amber', 'green', 'rose', 'external'] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(name: string): name is Category {
  return (CATEGORIES as readonly string[]).includes(name);
}

/** Default legend labels: HANDOFF.md 5.1's meanings, in the mockup's words. */
export const LEGEND_LABELS: Record<Category, string> = {
  slate: 'Person',
  teal: 'Web app',
  violet: 'AI component',
  blue: 'Data store',
  amber: 'Worker',
  green: 'Data',
  rose: 'Risk',
  external: 'External system',
};

/** classDef statements for every category, appended to each flowchart. */
export const CLASS_DEFS = CATEGORIES.map(
  (name) => `classDef ${name} fill:fig-${name},stroke:fig-${name},color:fig-${name}-text`,
).join('\n');

/**
 * The renderer's own neutral colours. Its <style> block defines them, and
 * the theme pass removes that block, so each one maps to a role of ours.
 */
const NEUTRAL_PAINTS: Record<string, string> = {
  'var(--_line)': 'line',
  'var(--_arrow)': 'line',
  'var(--_text)': 'ink',
  'var(--_text-sec)': 'muted',
  'var(--_text-muted)': 'muted',
  'var(--_text-faint)': 'muted',
  'var(--_node-fill)': 'slate',
  'var(--_node-stroke)': 'slate',
  'var(--_group-fill)': 'bg',
  'var(--_group-hdr)': 'bg',
  'var(--_inner-stroke)': 'rule',
  'var(--bg)': 'bg',
};

/**
 * The role of a fill or stroke value the renderer wrote: a category
 * (`violet`), a category's text colour (`violet-text`) or a neutral role.
 * Undefined for anything else, which the theme pass refuses.
 */
export function paintRole(value: string): string | undefined {
  const marker = /^fig-([a-z]+)(-text)?$/.exec(value);
  if (marker) return isCategory(marker[1]!) ? `${marker[1]}${marker[2] ?? ''}` : undefined;
  return NEUTRAL_PAINTS[value];
}

// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig, fontProviders } from 'astro/config';
import { markdownOptions } from './src/plugins/markdown.ts';

// BaseLayout.astro inlines this script verbatim. Astro hashes the scripts it
// bundles but not is:inline ones, so the CSP allows this one by its own hash.
const themeInit = readFileSync(new URL('./src/scripts/theme-init.js', import.meta.url), 'utf8');
const themeInitHash = /** @type {`sha256-${string}`} */ (
  `sha256-${createHash('sha256').update(themeInit).digest('base64')}`
);

// The "latin" unicode-range of the @fontsource-variable CSS files. The site is
// English only; characters outside it fall back to the system font.
const LATIN = [
  'U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC',
  'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193',
  'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD',
];

/**
 * One @font-face for a variable font file inside an @fontsource-variable
 * package, resolved through node_modules like an import.
 * @param {string} file package path, for example '@fontsource-variable/inter/files/x.woff2'
 * @param {'normal' | 'italic'} style
 * @param {string} weight weight range of the variable font
 */
const fontsource = (file, style, weight) => ({
  src: /** @type {[string]} */ ([file]),
  style,
  weight,
  unicodeRange: /** @type {[string, ...string[]]} */ (LATIN),
});

// Reference: https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://chau-minh-tieu.github.io',

  // Self-hosted fonts through Astro's Fonts API: the files come from the
  // @fontsource-variable packages and are copied into the build, so no font is
  // fetched from a CDN at build or run time. Astro also generates fallback
  // fonts with matching metrics, which reduces layout shift while fonts load.
  // The `local` provider is used because the `npm` provider fails in
  // Astro 7.4.2 (see docs/features/01-scaffold.md, Deviations).
  // https://docs.astro.build/en/guides/fonts/
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          // The opsz files carry two axes: weight and optical size.
          fontsource('@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2', 'normal', '100 900'),
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          fontsource('@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'normal', '100 800'),
          // Italic is for code comments (F2); browsers download it only when used.
          fontsource('@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-italic.woff2', 'italic', '100 800'),
        ],
      },
    },
  ],

  // Posts go through the remark/rehype pipeline (unified), not Astro 7's
  // default Sätteri, so the sanitiser and our plugins in src/plugins/ run.
  // Astro's own Shiki is off: it would run before the sanitiser;
  // src/plugins/rehype-code.ts highlights after it instead.
  // https://docs.astro.build/en/reference/markdown-processors/unified/
  markdown: {
    syntaxHighlight: false,
    processor: unified(markdownOptions),
  },

  // Astro writes a <meta http-equiv="content-security-policy"> into every page
  // and adds hashes of the scripts and styles it emits to script-src and
  // style-src. Not active in `astro dev`: test with `pnpm build && pnpm preview`.
  // Relaxations beyond 'self' are documented in docs/features/01-scaffold.md.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      scriptDirective: { hashes: [themeInitHash] },
    },
  },
});

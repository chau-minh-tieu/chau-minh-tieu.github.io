# F2 — Content model and post page

## Brief

**Purpose.** Turn a Markdown file into a finished post page: a typed content collection with the HANDOFF.md 6.2 schema, the mockup's post layout (numbered headings, contents, sidenotes, tables, notes, figures, code blocks with a copy button), statuses that decide what is built and listed, tag pages, RSS and a sitemap. One sample post exercises every component.

**What you will learn**

- `[Content]` Content collections: a typed table of posts validated at build time by a Zod schema, like a Pydantic model. Bad frontmatter fails the build, naming file and field.
- `[Astro]` The Markdown pipeline as a compiler: Markdown → mdast → hast → HTML, plugins as AST passes whose order decides what is safe. Dynamic routes and endpoints.
- `[TS]` Sanitising untrusted HTML with an allowlist, at the right point in the pipeline.
- `[CSS]` One grid for text and margin notes, folding at 960 px; CSS counters.
- `[Astro]` Shiki at build time with a custom theme, emitting classes so the CSP stays strict.

**Decisions** (defaults in bold)

1. **Processor: `@astrojs/markdown-remark` 7.3.4 with `processor: unified()`.** Sätteri, Astro 7's default, runs no remark/rehype plugins. From the package source (the docs are silent): `markdown.shikiConfig` still applies, and Astro runs Shiki *before* our rehype plugins and rehype-raw *after* them.
2. **Sanitise first: our rehype list starts with `rehype-raw` 7.0.0 and `rehype-sanitize` 6.0.0; our transforms and Shiki run after.** The README says to sanitise "after the last unsafe thing", here parsing the author's HTML. Schema: GitHub's default without `<style>` and `mailto:`; `id` and `name` keep the `user-content-` prefix. Astro's own Shiki is off, since sanitising after it would mean allowlisting every class we emit. *The draft sanitised last.*
3. **Collection: `glob()` over `src/content/posts/*/index.md`;** Astro drops `/index` from ids, so the folder name is the slug. Schema in `src/lib/schema.ts`: the 6.2 fields as a strict object (a typo like `pubdate`, or a `slug` key that would change the URL, fails); 1–2 distinct tags; `sources` required with `engineering` or `ai`; `updatedDate` ≥ `pubDate`; `status` required; `brief` optional (F6 requires it on post PRs).
4. **Statuses in `src/lib/posts.ts`:** `draft` is built only by `astro dev`; `unlisted` is built with `noindex` and left out of home, tags, RSS, sitemap and next/previous; only `published` is listed. Dates are formatted in UTC, because a YAML date is UTC midnight.
5. **Code: our `rehype-code.ts` on `shiki` 4.5.0,** with a theme from the 5.1 tokens, `transformerMetaHighlight` (`@shikijs/transformers` 4.5.0) for `{7}`, and a transformer that turns each token colour into a class (`tok-keyword`) and drops `<pre>` styles. Header with file name and language chip, line numbers by CSS counters (always on), horizontal scroll. Unknown languages fail the build; `mermaid` waits for F4.
6. **Copy button rendered `hidden`, revealed by a small bundled script** (hashed by Astro) using `navigator.clipboard`: without JavaScript there is no dead button.
7. **Our plugins in `src/plugins/`, unit-tested through `createMarkdownProcessor`** (Astro's own pipeline): GitHub alerts → notes; footnotes → sidenotes beside their paragraph, below it under 960 px; titled images → "Fig. N", framed as screenshots when named `screenshot-*`; a `Table: …` line above a table → "Table N" caption (Pandoc's convention, readable on GitHub); row headers when the top-left cell is empty; a "Verdict" row with its bold cell in the accent; a plain blockquote → pull quote.
8. **Post page `posts/[slug].astro` with `PostLayout.astro`:** tag, date, reading time (prose words, 230 wpm), title, dek, byline, "On this page" (depth 2), numbered `h2`. One CSS grid with a 680 px column and a 220 px margin replaces the mockup's per-block rows. Accent from the primary tag via `data-tag`. Footer: disclosure, numbered sources, "Discuss on GitHub →" (a pre-filled Discussion in "Posts"), next/previous.
9. **Home gains the Writing list (chips, rows, an empty state); `/tags/<tag>/` exists for all three tags,** so chips never 404. F5 finishes Home.
10. **`@astrojs/rss` 4.0.19 at `/rss.xml`; our own `sitemap.xml.ts` and `robots.txt` instead of `@astrojs/sitemap`,** whose filter sees only URLs and would need a second frontmatter parser to drop unlisted posts. A test checks that the sitemap lists exactly the built pages without `noindex`.
11. **Image metadata, tested:** sharp re-encodes images without it; the kitchen-sink image carries fake EXIF, GPS and XMP, and no served image may. Committed images are public too, so `privacy-check` flags tracked images with metadata (the fixture is allowlisted).
12. **Samples `kitchen-sink` (`unlisted`, fictitious, every component) and `draft-fixture` (`draft`).** Also pinned: `unist-util-visit` 5.1.0 (5.2.0 is younger than pnpm 12's one-day `minimumReleaseAge`), `hast-util-to-string` 3.0.1, `@types/hast` 3.0.5, `unified` 11.0.5. The review loop is recorded in HANDOFF.md 2.1, CLAUDE.md and the plan.

**Acceptance criteria**

- The kitchen-sink post matches `Post.dc.html` in light, dark and at 375 px; screenshots in the PR.
- Schema tests reject a missing `description`, three tags, `engineering` without `sources` and an unknown key; the debrief shows one failing build naming file and field.
- `draft` is absent from `dist/`; `unlisted` has `noindex` and is absent from home, tags, RSS and sitemap.
- Code blocks show theme colours, file name, highlighted line, horizontal scroll and a working copy button; no `style=` in `dist/`, CSP unchanged.
- `<script>`, `<style>`, `<iframe>`, `onerror=` and `javascript:` links in a post render inert.
- No served image carries metadata; `pnpm privacy` flags a tracked image that does.
- `pnpm check`, `build`, `test`, `privacy` green locally; `verify` and `privacy` green on the PR.

**Timebox.** 50 minutes of the owner's time; it may run over, and nothing here is cut (owner decision, 2026-10-25). Highest risk: sidenote placement in the grid and the Shiki class mapping.

**Docs.** [Content collections](https://docs.astro.build/en/guides/content-collections/) · [Markdown processors](https://docs.astro.build/en/guides/markdown-content/) · [Unified reference](https://docs.astro.build/en/reference/markdown-processors/unified/) · [Shiki transformers](https://shiki.style/packages/transformers) · [`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize) · [RSS recipe](https://docs.astro.build/en/recipes/rss/) · [Endpoints](https://docs.astro.build/en/guides/endpoints/) · [pnpm `minimumReleaseAge`](https://pnpm.io/settings/dependency-resolution#minimumreleaseage) · [GitHub alerts and footnotes](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

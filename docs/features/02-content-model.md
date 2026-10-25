# F2 — Content model and post page

## Brief

**Purpose.** Turn a Markdown file into a finished post page: a typed content collection with the HANDOFF.md 6.2 schema, the post layout of the mockup (numbered headings, contents, sidenotes, tables, notes, figures, code blocks with a copy button), statuses that decide what is built and listed, tag pages, RSS and the sitemap. One sample post exercises every component.

**What you will learn**

- `[Content]` Content collections: a typed table of posts, validated at build time by a Zod schema, much like a Pydantic model. Bad frontmatter fails the build and names the file and field.
- `[Astro]` The Markdown pipeline as a compiler: Markdown → mdast (remark) → hast (rehype) → HTML, with plugins as AST transforms. Dynamic routes with `getStaticPaths`.
- `[Astro]` Shiki: highlighting at build time with a custom theme, and transformers that read fence meta such as `title="roles.sql" {7}`.
- `[CSS]` A reading column with a margin for contents and sidenotes, using CSS grid, folding at 960 px.
- `[TS]` Sanitising untrusted HTML with an allowlist schema.

**Decisions** (defaults in bold)

1. **Markdown processor: `@astrojs/markdown-remark` 7.3.4 with `processor: unified()`.** Since Astro 7 the default is Sätteri, a native pipeline with its own plugin API ([Markdown processors](https://docs.astro.build/en/guides/markdown-content/)). HANDOFF.md 4.2 assumes remark/rehype, and the sanitiser and Shiki transformers exist for it. Sätteri is faster but would mean porting each plugin.
2. **Collection in `src/content.config.ts`:** `glob()` over `src/content/posts/*/index.md`, slug = folder name, the 6.2 schema with `astro/zod`. `tags` are 1–2 distinct values; a refinement requires `sources` when tags include `engineering` or `ai`.
3. **Statuses through one helper, `src/lib/posts.ts`.** `draft` is filtered out of production builds. `unlisted` is built with `<meta name="robots" content="noindex">` and left out of lists, tag pages, RSS and the sitemap. Build-output tests assert both.
4. **Code: a custom Shiki theme built from the 5.1 code tokens, plus a small transformer that swaps each token's inline colour for a fixed class (`.tok-keyword`, …) defined in `code.css`.** The CSP then needs no `'unsafe-inline'`. `@shikijs/transformers` 4.5.0 handles highlighted lines; file name, language chip and line numbers come from our transformer and CSS counters. `mermaid` fences skip Shiki and wait for F4.
5. **Copy button** rendered by the transformer, `hidden` until a small bundled script enables it (Astro hashes it for the CSP).
6. **Sanitising: `rehype-sanitize` 6.0.0, run last**, with the default schema extended only for our classes and elements. A test post with `<script>`, `onerror=` and a `javascript:` link must render inert.
7. **Own small plugins in `src/plugins/`, unit-tested:** GitHub alerts to notes (label, surface background, no coloured border), footnotes to sidenotes (margin from 960 px, below the paragraph on phones), titled images to numbered figures ("Fig. N"), table captions ("Table N") and the Verdict row. Alternative for alerts: `rehype-github-alerts` 4.2.0.
8. **Numbered section headings and "On this page"** from the `headings` Astro returns (depth 2); numbers via CSS counters in muted figures.
9. **Feeds: `@astrojs/rss` 4.0.19 at `/rss.xml` (published posts only) and `@astrojs/sitemap` 3.7.4 with a filter that drops unlisted URLs.** Reading time from the word count at 230 words per minute.
10. **Samples: `src/content/posts/kitchen-sink/` with `status: unlisted`**, generic content that exercises every component and stays as a regression page, plus a `draft` fixture that tests prove never reaches `dist/`.

**Acceptance criteria**

- The kitchen-sink post matches `Post.dc.html` in light, dark and at phone width; screenshots in the PR.
- Missing `description`, three tags, or `engineering` without `sources` each fail `pnpm build`, naming the file and field.
- `draft` is absent from `dist/`; `unlisted` is present with `noindex` and absent from home, tag pages, RSS and the sitemap.
- Code blocks show the theme colours, file name, highlighted line, horizontal scroll and a working copy button; `dist/` contains no `style=` attribute and the CSP is unchanged.
- Raw `<script>` and event handlers in a post body are removed.
- `pnpm check`, `pnpm build`, `pnpm test`, `pnpm privacy` green locally; `verify` and `privacy` green on the PR.

**Timebox.** 50 minutes of the owner's time. Highest risk: the Shiki class transformer and the sanitiser schema. If time runs out, sidenotes and the Verdict row move to F5.

**Checkpoint.** In this order the site goes live (F3) at about 3 h 07 min, past the 2 h 30 min checkpoint. F3 does not depend on F2: running it first would put the shell live at about 2 h 17 min.

**Docs.** [Content collections](https://docs.astro.build/en/guides/content-collections/) · [Markdown processors](https://docs.astro.build/en/guides/markdown-content/) · [Syntax highlighting](https://docs.astro.build/en/guides/syntax-highlighting/) · [Shiki transformers](https://shiki.style/packages/transformers) · [`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize) · [RSS recipe](https://docs.astro.build/en/recipes/rss/) · [Sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)

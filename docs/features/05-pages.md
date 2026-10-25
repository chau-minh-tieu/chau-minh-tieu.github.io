# F5 — Pages and brand

## Brief

**Purpose.** Finish the site's own pages with the final copy of HANDOFF.md 5.3: Home gains "Selected projects", and Projects, About and a custom 404 page appear. Today `/projects/`, `/about/`, the footer's `/about/#colophon` and every missing path lead to GitHub's 404. Add the brand around the pages: a monogram component at 28, 32 and 96 px, favicons derived from the oxblood monogram, and Open Graph and X card defaults on every page.

**What you will learn**

- `[Astro]` Layouts and components with typed props: one `BaseLayout` builds every `<head>` from what each page passes in; small components (`Monogram`, project rows) are reused across pages.
- `[Astro]` Static file endpoints: `favicon.ico.ts` is a route that returns bytes instead of HTML, run once at build time, so every icon and the default social image are derived from one SVG.
- `[Content]` Open Graph: the tags crawlers read to draw a link preview, why they must be absolute URLs in the HTML, and how X falls back to them.
- `[Content]` A small data collection: the `file()` loader and a Zod schema for the "Now" list.
- `[CSS]` A content grid with a sidebar that stacks at 960 px, and rows that stack at 640 px.

**Decisions** (defaults in bold)

1. **Copy from HANDOFF.md 5.3 only.** About is verbatim. Where 5.3 is in note form, the sentences use only its facts. delivery-metrics reads: "Self-hosted engineering metrics. The model writes SQL, Postgres computes every number under a read-only role, and local embeddings power semantic search." The site project reads: "This site: Astro on GitHub Pages, with no server and no trackers. Posts start as issue briefs, are drafted by AI, and ship only through a reviewed pull request." The mockup's longer project texts are not used. The same text appears on Home and on Projects.
2. **Projects in a typed module, `src/lib/projects.ts`; Home shows the first two.** Links: delivery-metrics "Source" (public repository, checked) and "Write-up"; this site "Source" (this repository); Reign Edge "Website". The write-up is a post slug and the link appears only when that post is published, so F7 sets the slug and nothing links to a missing post. Project names in mono, except Reign Edge (not a repository), as in the mockup.
3. **"Now" in `src/data/now.yaml`** (month and exactly three items), loaded by a `now` data collection with a Zod schema. It changes monthly and can be edited by hand, even in GitHub's web editor. It ships with the mockup's three placeholders and "Updated October 2026"; send me your three items during the review and I commit them.
4. **About layout from the mockup:** 680 px text and 280 px sidebar, stacked under 960 px. "What I write about" reuses the tag descriptions the tag pages already show. Elsewhere lists GitHub, LinkedIn and RSS; no email. The Colophon section carries `id="colophon"` for the footer link.
5. **404 page** `src/pages/404.astro` → `dist/404.html`, which Pages serves with status 404 for any missing path. Copy: label "404", heading "Page not found", lede "Nothing lives at this address. The link may be old or mistyped.", links to Writing, Projects and About. `noindex`, and no canonical URL or `og:url`, because it answers at every address.
6. **`Monogram.astro`** (28, 32, 96 px; the oxblood SVG as an image, round by CSS) replaces the nav mark and the byline image and adds the About mark. The ivory and ink monograms are copied to `public/brand/` with their C2PA block stripped (kickoff Q9); the mockup copies stay as reference.
7. **Favicons generated at build time from `public/brand/monogram-oxblood.svg`** by endpoints using `sharp` 0.35.5, already in the tree through Astro, now pinned directly: `/favicon.svg` (the round mark), `/favicon.ico` (a 32 px PNG in an ICO container, written by a few lines of our own code), `/apple-touch-icon.png` (180 px, square and opaque, because iOS rounds the corners and fills transparency with black). SVG favicons reached Safari only in version 26, and crawlers and feed readers still ask for `/favicon.ico`. No web manifest: the site is not an installable app.
8. **Open Graph and X defaults in `BaseLayout`:** `og:type` (`website`; `article` with published and modified times and tags on posts), `og:title`, `og:description`, `og:url` (the canonical URL), `og:site_name`, `og:image` with width, height, type and alt, and `twitter:card` `summary_large_image`. X reads the `og:` tags for the rest. The default image is `/og.png`, 1200 × 630, generated at build time: the round oxblood monogram centred on the page ivory, with no text. Rasterising text would need fonts in the image renderer; F8 generates per-post images with titles.
9. **Tests and smoke checks.** Build output: every internal link and `#anchor` on every page resolves to a built file and id, which catches today's dead links for good; Open Graph tags on every page with a same-origin absolute image; icon sizes and types; no metadata in any served image, `.ico` included; 404 has `noindex` and no canonical URL; only allowlisted external links. Smoke: `/projects/` and `/about/` return 200 with the CSP; a random path returns 404 with our page; the favicons and the home page's `og:image` return 200 as images. The sitemap picks up the new pages by itself; 404 stays out.

**Acceptance criteria**

- Home, Projects, About and 404 match HANDOFF.md 5.3 and the mockup in light, dark and at 375 px; screenshots in the PR.
- No internal link or anchor on the site leads to a 404, proven by a test; the footer's Colophon link lands on About's colophon.
- The favicon shows in the browser tab; every page carries the Open Graph and X tags with an absolute image URL; served icons and images carry no metadata.
- No email address, only allowlisted links; CSP unchanged; still only the theme and copy scripts; no `style=` attribute.
- `pnpm check`, `build`, `test`, `privacy` green locally, `pnpm smoke http://localhost:4321` green against `pnpm preview`; `verify` and `privacy` green on the PR.
- After the merge: Deploy green including the new smoke checks; the live 404 page appears for a missing path; all four pages render in both themes without CSP errors.

**Timebox.** 25 minutes of the owner's time; it may run over, and nothing here is cut (owner decision, 2026-10-25). Risk: link previews can only be seen once the site is live, since crawlers cannot reach `localhost`; the tags and the image are checked locally and on the live site.

**Versions** (checked 2026-10-25): Astro 7.4.2 is still the latest release; `sharp` 0.35.5 is the latest and the version Astro already installs. TypeScript stays on 6.0.3 (deviation 3).

**Docs.** [Astro pages: custom 404](https://docs.astro.build/en/basics/astro-pages/) · [Endpoints: static files](https://docs.astro.build/en/guides/endpoints/) · [Layouts](https://docs.astro.build/en/basics/layouts/) · [Content collections: `file()` loader](https://docs.astro.build/en/guides/content-collections/) · [Pages: custom 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site) · [The Open Graph protocol](https://ogp.me/) · [X cards markup](https://developer.x.com/cards/markup) · [Can I use: SVG favicons](https://caniuse.com/link-icon-svg) · [MDN: `rel="icon"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#icon) · [sharp: input options](https://sharp.pixelplumbing.com/api-constructor)

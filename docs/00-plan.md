# Plan

Status: approved on 2026-10-25. The owner accepted the default for every question below. `HANDOFF.md` is the source of truth; this page records how its decisions are implemented, where current documentation forced a change, and the decisions taken at kickoff.

## Architecture

```mermaid
flowchart LR
  I["Brief issue<br/>(locked, collaborators only)"] --> D["AI draft on post/&lt;slug&gt;"]
  D --> PR["Pull request<br/>CI gates"]
  PR -->|owner merges| M["main"]
  M --> B["astro build → dist/"]
  B --> A["Pages artifact"] --> P["GitHub Pages"]
```

Three workflows: `pr.yml` (typecheck, build, tests, privacy check; content gates on `post/*` PRs), `deploy.yml` (build on `main`, upload the Pages artifact, deploy through the `github-pages` environment) and `lock-briefs.yml`.

## Versions

Checked on 2026-10-25 against the npm registry and official release pages. Pinned exactly when F1 scaffolds.

| Tool | Version | Note |
|---|---|---|
| Node | 26.x (26.12.1 today) | Active LTS from 2026-10-28; 24 entered maintenance on 2026-10-20 ([schedule](https://github.com/nodejs/Release#release-schedule)). Q1 |
| pnpm | 12.15.0 via corepack 0.36.0 | Node 25 and later no longer bundle [corepack](https://github.com/nodejs/corepack); install it from npm. Q2 |
| Astro | 7.4.2 | [Docs](https://docs.astro.build); requires Node ≥ 22.23 |
| TypeScript | 6.0.3 | Not 7.x: `@astrojs/check` 0.9.12 supports TypeScript 5–6 only |
| `@astrojs/check` · `rss` · `sitemap` | 0.9.12 · 4.0.19 · 3.7.4 | |
| Shiki, `@shikijs/transformers` | 4.5.0 | [Transformers](https://shiki.style/packages/transformers) |
| Zod | from `astro/zod` (Zod 4) | No separate dependency ([collections](https://docs.astro.build/en/guides/content-collections/)) |
| Vitest | 5.0.5 | |
| Fonts | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` 5.3.0 | OFL, self-hosted |
| `@astrojs/markdown-remark` | 7.3.4 | F2: keeps the remark/rehype pipeline (deviation 6) |
| `rehype-sanitize` | 6.0.0 | |
| GitHub actions | `checkout` v7.0.1 · `setup-node` v7.1.0 · `cache` v6.1.0 · `configure-pages` v6.0.0 · `upload-pages-artifact` v5.0.0 · `deploy-pages` v5.0.1 | Pinned by commit SHA. Q5 |

## Fixed decisions (HANDOFF.md 4.2): implementation notes

| Concern | How |
|---|---|
| Framework | Astro 7, static output, `tsconfig` extends `astro/tsconfigs/strict` |
| Packages | Single package; `packageManager` field and `.nvmrc` pin pnpm and Node |
| Content | `src/content.config.ts`, `glob()` loader over `src/content/posts/**/index.md`, schema of section 6.2 |
| Code highlighting | Custom Shiki theme from the 5.1 code tokens; meta-highlight, title and line-number transformers; `transformerStyleToClass` so highlighted code carries classes, not inline styles (see CSP) |
| CSP | Astro's built-in `security.csp` (stable since Astro 6) writes the `<meta>` tag with hashes for the scripts and styles it emits; `default-src 'self'` and the other directives are added through `directives`. It does not hash `is:inline` scripts, so `astro.config.mjs` hashes the theme script itself. Astro documents that it does not cover Shiki's inline styles, which F2 replaces with classes ([reference](https://docs.astro.build/en/reference/configuration-reference/)) |
| Styling | Plain CSS with custom properties; F1 makes the case against a framework |
| Fonts | Astro's Fonts API, `fontProviders.local()` over the woff2 files of the `@fontsource-variable` packages, Latin subset: no CDN at build or run time, generated fallback metrics, Inter preloaded ([guide](https://docs.astro.build/en/guides/fonts/)). Deviation 5 |
| Privacy check | `scripts/privacy-check.ts`, run by Node's built-in TypeScript type stripping (no `tsx`); pre-commit hook in `.githooks/`, enabled by a `prepare` script setting `core.hooksPath`. Q10 |
| Tests | Vitest for utilities and plugins; a build-output test over `dist/` for privacy and metadata rules |

## Proposed defaults (HANDOFF.md 4.3)

**Diagrams.** Posts keep Mermaid in ```` ```mermaid ```` fences, which GitHub's PR preview renders natively. Only the build-time renderer is open. Q3.

| Option | C4 (mockup Fig. 2) | CI cost | Light and dark | Verdict |
|---|---|---|---|---|
| `beautiful-mermaid` 1.1.3 (pure TypeScript, no browser) | No C4 type: draw Fig. 2 as a flowchart with boundary subgraphs | Negligible | One SVG themed by CSS custom properties | **Try first.** Young library, last release Feb 2026 |
| `rehype-mermaid` 3.0 + Playwright Chromium | Yes (Mermaid's C4 is experimental) | Browser download, roughly 30–60 s per run, cacheable | Two renders, or `themeCSS` mapped to variables | Fallback |
| D2 CLI | Through containers | Binary download in CI | Own themes, mapped by hand | No: GitHub's preview shows only the source |
| Pre-rendered SVGs, committed | Any | None | Manual | Last resort |

**Comments.** None on the site; each post ends with "Discuss on GitHub →", a link to a pre-filled new Discussion in the "Posts" category. Rejected: giscus and utterances, which load third-party scripts and iframes (section 3.4). Q4.

**Tag filtering.** Static `/tags/<tag>/` pages: no JavaScript, crawlable, nothing for the CSP to allow. Rejected: client-side filtering. Q4.

**Now.** A section inside About for v1, not its own page. Q4.

## Deviations from HANDOFF.md, forced by current documentation

1. "Node active LTS": no release line is in active LTS between 20 and 28 October 2026. Node 26 is the line that becomes it (Q1).
2. "pnpm via corepack": corepack has to be installed from npm on Node 26 (Q2).
3. "Latest stable versions": TypeScript stays on 6.0.3 until `@astrojs/check` supports 7.
4. Issue creation can now be restricted to collaborators natively ([changelog, June 2026](https://github.blog/changelog/2026-06-29-restrict-issue-creation-to-collaborators-only/)), so no expiring interaction limit is needed (Q6).
5. Fonts (F1): in Astro 7.4.2 the `npm` font provider with `remote: false` fails the build. unifont returns `file://` URLs, and Astro's font fetcher reads only plain paths. The `local` provider over the same package files gives the same result. Revisit when Astro fixes it.
6. Markdown (found while writing the F2 brief): since Astro 7 the default `.md` processor is Sätteri, Astro's native pipeline, which has its own plugin API and does not run remark/rehype plugins ([Markdown processors](https://docs.astro.build/en/guides/markdown-content/)). F2 proposes `@astrojs/markdown-remark` with `processor: unified()` to keep the remark/rehype pipeline of HANDOFF.md 4.2.

## Kickoff decisions

Asked as open questions in F0; the owner accepted all ten defaults on 2026-10-25. Q7 was confirmed during setup: the global address belongs to a different account ID.

1. **Node 26** (26.12.1), not 24. It becomes active LTS on 28 October and is supported to April 2029; 24 is already in maintenance.
2. **Install corepack 0.36.0 from npm and pin pnpm 12.15.0 in `packageManager`**; CI does the same with `npm install -g`. It keeps the handoff's decision without a third-party pnpm action.
3. **Diagrams: Mermaid source, F4 starts with a 15-minute `beautiful-mermaid` spike** on Fig. 1 and Fig. 2, falling back to `rehype-mermaid`. No browser in CI, and one SVG serves both themes.
4. **Accept the 4.3 defaults for comments, tag pages and Now.** All three ship zero JavaScript and no third party.
5. **Pin actions to full commit SHAs and turn on "Require actions to be pinned to a full-length commit SHA".** Tags can be moved after the fact; SHAs cannot.
6. **Restrict issue creation with the native "Collaborators only" setting.** Interaction limits expire after at most six months and would also stop readers from commenting in Discussions.
7. **Set a repo-local `user.email` to the no-reply address of `chau-minh-tieu`.** The global git config on this machine uses the no-reply address of a different login, so commits would not link to the repository owner.
8. **Keep the `Co-Authored-By: Claude` trailer on commits Claude makes.** The trailer carries Anthropic's non-personal no-reply address, the same kind of address as the owner's own commit identity, and matches the site's AI disclosure. This page does not spell it out, because committed files contain no email addresses.
9. **Commit the mockup monograms as they are, strip their metadata when F5 copies them to `public/brand/`.** They carry a C2PA content-credentials block naming the generating tool; it holds no personal data and the privacy scan is clean.
10. **Pre-commit hook without a dependency** (`.githooks/` and `core.hooksPath`). Nothing extra to trust or update, compared with husky or lefthook.

# F8 — Site polish and documentation

## Brief

**Purpose.** Finish the site and make the repository explain itself. A reader who lands on the public repository today finds no README and no licence. `docs/deep-dives.md`, which HANDOFF.md 4.4 lists, was never created. The live About page shows three bracketed placeholders. F5 and F7 left items open: the favicon in a real tab, link previews, and the revert path. A look at the live site on 2026-10-25 (both themes, 1280 and 375 px, beside the mockup) found three small typographic faults. F8 is no longer the stretch list (owner decision, 2026-10-25). Those items are deferred, not deleted.

**What you will learn**

- `[GitHub]` A README is the repository's landing page. GitHub renders it from the root, resolves relative links against the branch you are viewing, draws Mermaid, and builds an outline from the headings. The About box (website, topics) is repository metadata, not a file.
- `[GitHub]` Licences: no licence means all rights reserved. Code and content can carry different terms. GitHub detects one root `LICENSE` with Licensee. A Creative Commons licence cannot be withdrawn once granted.
- `[CSS]` OpenType features: `font-variant-numeric: tabular-nums` switches on `tnum`, and in Inter that also widens the hyphen, from 6.45 to 9.08 px at 14 px (measured live). That is why "read-only" looks spaced in the contents list and in tables. Turn a feature on for the glyphs that need it, not for a whole block.
- `[CSS]` `text-wrap: balance` and `pretty` hand line breaking to a better algorithm. Browsers that lack them ignore the declaration (progressive enhancement). Chromium balances up to 6 lines and Firefox up to 10.
- `[CI/CD]` A revert is a pull request. **Revert** (or `gh pr revert`) opens a `revert-…` branch whose PR runs the same checks. A dry run proves that path without touching `main`.

**Decisions** (defaults in bold)

1. **Record the scope change** in HANDOFF.md 8 (the F8 row struck through, an owner-decision note, the four stretch items listed as deferred), CLAUDE.md rule 9 and `docs/00-plan.md` "Later decisions". `src/pages/og.png.ts` stops promising per-post images in F8.
2. **`README.md`** for a reader of the repository: what the site is and its link; how a post is published (a Mermaid flow from brief issue to AI draft to reviewed PR to `unlisted` to `published`, linking `docs/runbook.md` and `STYLE.md`); what keeps it safe (privacy check, sanitiser, CSP, GitHub-made actions pinned by SHA, the `main` ruleset), briefly; the stack by name, with versions left to `package.json` and the plan so they cannot drift; the commands of CLAUDE.md with the Node and corepack setup; the actual layout; a map of the docs; the licence. Personal information: name, role and the GitHub profile only. No email address.
3. **A test that docs cannot rot.** Vitest checks that every relative link in `README.md`, `CLAUDE.md`, `STYLE.md`, `HANDOFF.md` and `docs/**/*.md` names a file that exists. It also checks that every `pnpm <script>` in the README's command table exists in `package.json`. Anchors are not checked.
4. **`docs/deep-dives.md`** with its purpose and an entry format (question, where it came up, short answer, why it was parked, sources). It starts empty; questions in this review that would blow the timebox go there.
5. **Licence:** question 1.
6. **Now:** question 2.
7. **Site polish**, from the live review:
   a. **Tabular figures only on numbers:** on the contents numbers (`.toc-num`) and on table cells that hold a number (`rehype-tables.ts` marks them `num`). Dropped from the project facts, which have no column to align. Words with hyphens keep the normal hyphen.
   b. **`text-wrap: balance`** on titles, headings, deks and post-list titles. The post's title ends with "number" alone on a line at 1280 and 375 px, and so does its row on Home. **`text-wrap: pretty`** on prose paragraphs.
   c. **Code file names break after a slash:** `rehype-code.ts` adds `<wbr>` after each `/` of the title. At 375 px `migrations/versions/0003_roles_grants.py` breaks at "00 / 03" today.
   d. **A scroll hint on diagrams wider than the screen** (open since F4): a muted "Scroll sideways for the whole figure." line, shown by a container query only while the figure is narrower than its size floor. CSS only, no script.
   Checked, no change: the nav wrapping onto two rows at 375 px (the mockup's nav wraps too), the heavy rule above "Selected projects" and the arrow beside RSS (both in the mockup), no console errors, no sideways page scroll.
8. **Open items from the debriefs:**
   a. **Your checks, about 5 minutes, one message:** the favicon in a real tab (Chrome and Safari, F5); a link preview of the post in LinkedIn's Post Inspector, signed in (F5); "Discuss on GitHub →" opening a pre-filled Discussion, signed in (F2); the copy button really copying (F2). Before you check, I verify the tags, images and content types live with `curl`.
   b. **Revert rehearsal:** question 3. **Runbook fixes:** `gh pr revert <PR>` as the command for the **Revert** button; the fallback branch for a conflicting revert becomes `feat/revert-<PR>` (Claude Code may push only `feat/*` and `post/*`); the observed results.
   c. **Lockfile guard:** a unit test fails if `pnpm-lock.yaml` carries an `@pnpm/exe` entry. The README says to use corepack's pnpm. Your `~/.zshrc` stays yours; the debrief gives the one line that stops the cause.
   d. **PR #2's screenshots** point at the deleted `feat/01-scaffold` branch. I edit its body to point at `main`'s commit, which has the same files.
   e. **F7's final time** in F7's debrief, part 7 (your figures). A line in the plan for HANDOFF.md 4.4's layout differences (generated favicons, `.github/actions/`, `post.yml`); the README shows the real layout.
9. **Setup Guide D (yours): the About box.** Website `https://chau-minh-tieu.github.io`; topics `astro`, `github-pages`, `blog`, `typescript`; Wiki and Projects tabs off, since neither is used. I verify read-only.
10. **Checks beyond the usual:** screenshots of the changed pages (light, dark, 375 px) linked by commit SHA; Lighthouse 13.5.0 desktop on the live Home and post after the merge (HANDOFF.md 9 asks for at least 95; F7 measured 100 and 100); the README rendering on the repository page.

**Questions** (reply "defaults" to accept all)

1. **Licence. Default: code under MIT in a root `LICENSE`; posts, page copy, the monogram and the mockups all rights reserved, stated in the README.** Reason: you can open the content later, but a CC licence cannot be taken back. Alternatives: content under CC BY 4.0, or no licence at all (all rights reserved for code too).
2. **Now: send three one-line items (building, learning, reading) and the month, in generic terms.** Default if you send none: hide the section until you do (the schema accepts zero or three items). Reason: brackets on the live About page read as unfinished.
3. **Revert rehearsal. Default: a dry run.** You run `gh pr revert 13 --draft`; I check the branch name, that `verify` and `privacy` pass, that `content` is skipped and that the PR is mergeable; you close it unmerged and delete its branch. Reason: it proves every claim the runbook makes about the revert PR without adding two commits to `main`. Alternative: merge it, then revert the revert (two deploys, about 6 minutes).
4. **Old stretch items. Default: deferred and listed in HANDOFF.md 8** (Vale, per-post Open Graph images, the Claude Code GitHub Action, search). Reason: they stay visible as candidates. Alternative: delete them.

**Your answers** (2026-10-25): all four defaults. No Now items were sent, so the section is hidden until you send them. Three changes on top, which count as owner decisions and are recorded in HANDOFF.md 5.3:

11. **"Selected projects" on Home: Reign Edge and delivery-metrics**, in that order, chosen by name in `src/lib/projects.ts` instead of "the first two". Projects keeps the HANDOFF.md 5.3 order. Reign Edge has no stack line, so its card shows its status instead.
12. **A more personal footer and colophon**, written from HANDOFF.md 3.1 facts only (2010, writing to understand, the travel sentence, building in public) and adding no new personal information. The colophon keeps the promise the footer used to make: no analytics, no cookies, no third-party scripts. The PR gives one alternative for each.
13. **The README shows the site off:** the monogram and links at the top; screenshots of Home and a post that follow GitHub's light or dark mode (`<picture>` with `prefers-color-scheme`); the 375 px view; the numbers (Lighthouse, scripts shipped, third-party requests, tests); and Mermaid diagrams of the publishing loop, the CI/CD pipeline and the Markdown pipeline. The images live in `docs/readme/`, are taken from this branch's build and carry no metadata.

**Acceptance criteria**

- README, licence, `docs/deep-dives.md`, the scope change, the runbook fixes and F7's time are on the branch; `pnpm privacy` is clean, and the only personal information is from HANDOFF.md 3.1.
- No hyphen in a word is rendered with tabular figures; headings balance; code file names break at slashes; the scroll hint appears only while a figure scrolls. Screenshots in light, dark and at 375 px are in the PR.
- The docs-link and lockfile tests pass and fail when broken (mutation check). CSP unchanged; still only the theme and copy scripts; no `style=`.
- `pnpm check`, `build`, `test` and `privacy` are green locally. `verify` and `privacy` are green on the PR, and `content` is skipped.
- Your checks, the revert rehearsal and Guide D are recorded and verified.
- After the merge: Deploy green; `pnpm smoke --version <sha>` passes; the README renders on GitHub and the licence is detected; Lighthouse is at least 95 on Home and the post.

**Timebox.** HANDOFF.md 8 gives F8 "remaining time"; about 45 minutes of yours (questions, your checks, Guide D, review). F8 ends when you call it done.

**Versions** (checked 2026-10-25): no new dependency. Astro 7.4.2 and Lighthouse 13.5.0 are still the latest releases. `gh` 2.103.2 has `gh pr revert`.

**Docs.** [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) · [Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) · [MIT licence](https://choosealicense.com/licenses/mit/) · [CC FAQ: revocation](https://creativecommons.org/faq/) · [MDN: `text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) · [Can I use: `text-wrap: balance`](https://caniuse.com/css-text-wrap-balance) · [MDN: `font-variant-numeric`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric) · [MDN: container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) · [Reverting a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/reverting-a-pull-request) · [`gh pr revert`](https://cli.github.com/manual/gh_pr_revert) · [`gh repo edit`](https://cli.github.com/manual/gh_repo_edit) · [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

---

## Debrief

### 1. What was built

The repository now explains itself to a reader, and the site got the last typographic fixes the live review found. Everything is in PR #14.

| Area | Result |
|---|---|
| README | `README.md`: round monogram and links, a Deploy badge, screenshots of Home, the post, a diagram and three phones that follow GitHub's light or dark mode, an "at a glance" table, three Mermaid diagrams (publishing, Markdown pipeline, CI/CD), guardrails, stack, commands, layout, docs, how it was built, licence |
| Licence | `LICENSE`: MIT for the code. The posts, page copy, monogram and mockups are all rights reserved (README, "Licence") |
| Docs | `docs/deep-dives.md` with an entry format; runbook: `gh pr revert` and `feat/revert-<PR>` as the fallback branch; F7's final time; plan deviation 11 (the real layout); the F8 scope change in HANDOFF.md 5.3 and 8, CLAUDE.md rule 9 and the plan |
| Typography | Tabular figures only on the contents numbers and numeric table cells; `text-wrap: balance` on headings, titles, ledes and pull quotes, `pretty` on paragraphs and list items; `<wbr>` after each slash of a code file name |
| Diagrams | A "Scroll sideways to see the whole figure." line under a diagram, shown only while the figure is narrower than its size floor |
| Pages | Home selects Reign Edge and delivery-metrics by name; About hides "Now" until it has three items; a new footer and colophon |
| Tests | 232 (7 new): numeric cells, file-name breaks, the scroll hint and its CSS, docs links, README commands, lockfile; three mutation checks |
| Other | PR #2's screenshots point at `e85d96d` on `main` instead of the deleted branch |

Screenshots: [`img/`](img/) (`08-home-*`, `08-about-*`, `08-mobile.png`, `08-table-code-light.png`) and [`../readme/`](../readme/), all from this branch's build.

**Your checks** (about 5 minutes; tell me what you see and I record it). The live tags and files are already verified: the post carries `og:type article`, title, description, canonical `og:url`, a 1200 × 630 `og:image` with alt text and `twitter:card summary_large_image`, and `/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png` and `/og.png` answer 200 with the right content types.

1. **Favicon (F5).** Open https://chau-minh-tieu.github.io in Chrome and in Safari: the tab shows the round oxblood CT.
2. **Link preview (F5).** Signed in, paste `https://chau-minh-tieu.github.io/posts/model-picks-postgres-computes/` into [LinkedIn's Post Inspector](https://www.linkedin.com/post-inspector/): title, description and the monogram card.
3. **Discuss link (F2).** Signed in to GitHub, click "Discuss this post on GitHub →" at the end of the post: a new discussion form in "Posts", title filled in. Close it without posting.
4. **Copy button (F2).** Click "Copy" on a code block of the post and paste it anywhere: the code, without line numbers.

**Your checks, reported at 00:11 on 2026-10-26:** the favicon shows in Chrome and in Safari; LinkedIn's Post Inspector shows the title, description and the monogram card; "Discuss this post on GitHub →" opens a pre-filled form; "Copy" copies the code. This closes the open items of F5 (favicon in a real tab, link previews on the live site) and F2 (the Discuss pre-fill, real copying).

**Revert rehearsal, dry run (done 2026-10-26, before this PR merges).** While #13 was still the last merge, its revert could not conflict. At your request I ran `gh pr revert 13 --repo chau-minh-tieu/chau-minh-tieu.github.io --draft` at 23:59; it opened draft PR #15. Checked read-only:

| Claim in the runbook | Observed on #15 |
|---|---|
| GitHub creates a branch whose name starts with `revert-` | `revert-13-feat/07-first-post` |
| The PR undoes the merge | One commit, `Revert "feat(07): first post end to end (#13)"` (`cdbf1e6`), reversing exactly #13's ten files |
| `verify` and `privacy` run | Both passed (31 s and 13 s) |
| `content` is skipped | Skipped: the branch does not start with `post/` |
| It can be merged like any PR | `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`; as a draft it needs **Ready for review** first |

You closed it without merging and deleted its branch at 00:01 (GitHub created the branch, so the deletion was yours): `gh pr close 15 --repo chau-minh-tieu/chau-minh-tieu.github.io --delete-branch`. Verified read-only: #15 `CLOSED` with no merge, and no `revert-` branch left. Number #15 is not reused.

**Setup Guide D: the About box (you).**

1. Repository → **Code** tab → the gear icon next to **About** (right sidebar).
2. **Website**: `https://chau-minh-tieu.github.io`. **Topics**: `astro`, `github-pages`, `blog`, `typescript`. **Save changes**.
3. **Settings** → **General** → **Features**: untick **Wikis** and **Projects**. Both save at once.

Expected end state: the About box shows the site link and four topics; the Wiki and Projects tabs are gone. Equivalent command:

```bash
gh repo edit chau-minh-tieu/chau-minh-tieu.github.io --homepage https://chau-minh-tieu.github.io --add-topic astro,github-pages,blog,typescript --enable-wiki=false --enable-projects=false
```

Read-only check, which I run after you confirm: `gh api -X GET repos/chau-minh-tieu/chau-minh-tieu.github.io --jq '{homepage, topics, has_wiki, has_projects}'`.

**Guide D verified at 00:03 on 2026-10-26, read-only.** You ran the `gh repo edit` command. `GET /repos/…`: `homepage` `https://chau-minh-tieu.github.io`, `topics` `astro`, `blog`, `github-pages`, `typescript`, `has_wiki: false`, `has_projects: false`; the description is unchanged.

**Verified after the merge, 00:13 to 00:16 on 2026-10-26, read-only.** You merged PR #14 as `7f4b9f6`.

| Check | Result |
|---|---|
| Local `main` | Equal to `origin/main` at `7f4b9f6`; clean working tree. `feat/08-polish` deleted on GitHub by the merge, and locally by you (its tree was identical to `main`) |
| `main` ruleset | Active, no bypass; `deletion`, `non_fast_forward`, `pull_request`, `required_status_checks` (`verify`, `privacy`, `content`, integration 15368) |
| Deploy run 40215377160 | `build`, `deploy` and `smoke` green |
| `pnpm smoke --version 7f4b9f6…` | All 11 checks passed against the live site, the `http://` and trailing-slash redirects included |
| Lighthouse 13.5.0, desktop, live | Home and the post: performance 100, accessibility 100, CLS 0, TBT 0 ms |
| Live pages | The new footer; Reign Edge then delivery-metrics on Home; no "Now" on About |
| Repository page | The README renders: logo, badge and four screenshots load, three Mermaid diagrams draw; `GET /repos/…/license` reports MIT from `LICENSE`; no Wiki or Projects tab |

### 2. File tour

| File | Single responsibility | Depends on |
|---|---|---|
| `README.md` | The repository's front page for readers | `docs/readme/`, the live `/favicon.svg` |
| `docs/readme/*.png` | README screenshots, light and dark, palette PNGs without metadata | the branch build |
| `LICENSE` | MIT for the code | — |
| `docs/deep-dives.md` | Parked long answers and their format | HANDOFF.md 2.5 |
| `tests/repository.test.ts` | Docs link only to existing files; README commands exist; no `@pnpm/exe` in the lockfile | `git ls-files`, `package.json`, `pnpm-lock.yaml` |
| `src/styles/base.css` | `text-wrap` rules for headings, ledes, pull quotes, paragraphs and list items | — |
| `src/styles/prose.css` | Tabular figures moved to `.toc-num` and `.prose .num` | `rehype-tables.ts` |
| `src/plugins/rehype-tables.ts` | Also marks numeric cells `num` (`isNumeric`) | — |
| `src/plugins/rehype-code.ts` | `fileName()`: a `<wbr>` after each slash of the title | — |
| `src/plugins/rehype-diagrams.ts` | Adds the scroll hint to figures with a floor | `figures.css` |
| `src/styles/figures.css` | Diagram figures are size containers; 17 container queries show the hint below each floor | — |
| `src/lib/projects.ts` | `SELECTED` names and `selectedProjects()` | — |
| `src/pages/index.astro` | Uses `selectedProjects()`; a project without a stack shows its status | `projects.ts` |
| `src/pages/about.astro` | "Now" only with items; the new colophon | `now.yaml` |
| `src/lib/schema.ts` · `src/data/now.yaml` | "Now" takes three items or none | — |
| `src/components/SiteFooter.astro` | The new footer line | — |
| `src/components/ProjectRow.astro` | Facts lose tabular figures | — |
| `docs/runbook.md` | `gh pr revert`, the fallback branch | — |
| `HANDOFF.md` · `CLAUDE.md` · `docs/00-plan.md` | The F8 decisions | — |

### 3. Concepts

**A README is a rendered page with its own rules** `[GitHub]`
- Mental model: GitHub's Markdown renderer is a small static-site generator with a sanitiser in front. It resolves relative links and images against the branch you are viewing, renders Mermaid fences in a sandboxed frame, builds an outline from the headings, and passes a short allowlist of HTML: `<p align>`, `<img width>`, `<picture>` with `<source media="(prefers-color-scheme: dark)">`, so an image can follow the reader's colour mode. No CSS, no scripts.
- Here: `README.md` uses `<picture>` for four screenshots, Mermaid `classDef`s with the HANDOFF.md 5.1 figure palette, and the live `/favicon.svg` as its logo, because the committed monogram is square and only the site's CSS rounds it. The About box (website, topics) is repository metadata, set in Guide D.
- Mistakes: a wide Mermaid `LR` chain that GitHub shrinks until it is unreadable (the first draft; subgraphs with `direction TB` fixed it); absolute links to `blob/main/...` that break on branches (relative links do not); images with metadata (the privacy check catches committed ones).
- Docs: [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), [Theme-specific images](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#specifying-the-theme-an-image-is-shown-to)

**Licences: code and content are different works** `[GitHub]`
- Mental model: copyright is the default, like a private API: without a licence nobody may copy, change or redistribute. A licence is a published grant, like making an endpoint public. Code and prose can carry different grants, and a Creative Commons grant can never be withdrawn, so the safe order is to start closed and open later.
- Here: `LICENSE` (MIT) covers the code; GitHub's Licensee detects one root `LICENSE`, so the content's terms live in the README, where GitHub's docs suggest noting "complexity". The footer's "©" is the matching notice.
- Mistakes: two licence files at the root (detection may report "Other"); assuming "public repository" means "free to reuse"; licensing someone else's work (the fonts keep their own OFL).
- Docs: [Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository), [CC FAQ](https://creativecommons.org/faq/)

**OpenType features are per glyph, CSS switches them per element** `[CSS]`
- Mental model: a font is a lookup table from characters to glyphs, and features such as `tnum` swap in alternate glyphs. `font-variant-numeric: tabular-nums` turns `tnum` on for every character of the element, and the font decides which glyphs change. Inter's tabular set includes the hyphen, so "read-only" in a `tnum` block gets a 9.08 px hyphen instead of 6.45 px.
- Here: `prose.css` used to set `tabular-nums` on the whole contents list and every table; now only `.toc-num` and cells that `rehype-tables.ts` marks `num` get it. Dates, reading times, line numbers and the 404 code keep it: they hold no hyphenated words.
- Mistakes: enabling a feature on a container "for the numbers in it"; judging by eye at one size (measure: a hidden span and `getBoundingClientRect`); `font-feature-settings` when a `font-variant-*` property exists (it overrides everything else).
- Docs: [MDN: `font-variant-numeric`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric)

**Progressive enhancement in CSS: `text-wrap` and container queries** `[CSS]`
- Mental model: both are layout decisions handed to the browser, like a query planner choosing a join. `text-wrap: balance` evens out line lengths (Chromium up to 6 lines, Firefox up to 10); `pretty` avoids a lone word on the last line. A container query is a media query on an element's own width instead of the viewport's. Browsers without either ignore the rule and render as before, so nothing breaks.
- Here: `base.css` balances headings, ledes and pull quotes, so the post title wraps as three even lines. In `figures.css`, `.figure-diagram` is `container-type: inline-size`, and `@container (width < 480px)` shows the hint of a `diagram-min-480` figure: the figure is narrower than the diagram's floor exactly when the diagram scrolls.
- Mistakes: `balance` on long paragraphs (ignored past the line limit, and slow); a container query on the element that is itself the container (it queries the nearest ancestor container); forgetting that `container-type: inline-size` stops the element from sizing to its content.
- Docs: [MDN: `text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap), [MDN: container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries), [Can I use: `text-wrap: balance`](https://caniuse.com/css-text-wrap-balance)

**A revert is a pull request, not a rewind** `[CI/CD]`
- Mental model: `main` is append-only, like an event log. A revert adds a commit that undoes another, through the same PR and checks as any change; nothing is erased. `gh pr revert` and the **Revert** button create a `revert-…` branch and its PR in one step; a draft PR lets you look before anything can merge.
- Here: the runbook now gives `gh pr revert <PR>`, and the AI's fallback branch for a conflicting revert is `feat/revert-<PR>`, because `.claude/settings.json` lets Claude Code push only `feat/*` and `post/*`. The dry run proves the branch name, the checks and that `content` is skipped, without adding commits to `main`.
- Mistakes: reverting an older PR after later ones touched the same files (conflicts); merging anything else before the revert lands; reverting a revert to "redo" a change without reading what it brings back.
- Docs: [Reverting a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/reverting-a-pull-request), [`gh pr revert`](https://cli.github.com/manual/gh_pr_revert)

### 4. Verify it yourself

| Do this | Correct result |
|---|---|
| `pnpm check` | `0 errors`, `0 warnings` |
| `pnpm build && pnpm test` | `9 page(s) built`; `Tests 232 passed` |
| `pnpm privacy` | `privacy: clean (123 file(s), 45 image(s), …)` |
| `pnpm preview`, open http://localhost:4321/posts/model-picks-postgres-computes/ | The title in three even lines; "A read-only role…" in the contents with a normal hyphen |
| DevTools → device toolbar at 375 px, scroll to Fig. 2 | "Scroll sideways to see the whole figure." under it; at 1280 px no hint |
| Same page, section 4 at 375 px | The file name breaks as `migrations/versions/` then `0003_roles_grants.py` |
| http://localhost:4321/ and `/about/` | Reign Edge and delivery-metrics under "Selected projects"; no "Now" section; the new footer and colophon |
| Change `(docs/runbook.md)` to `(docs/runbok.md)` in the README, `pnpm test` | `docs > links only to files that exist` fails, naming the file; undo |
| PR #14 → **Files changed** → `README.md` → rich diff | The README with images and diagrams; after the merge, on the repository's front page |

### 5. Check your understanding

1. Why did "read-only" look spaced out in the contents list but not in the post's body text?
   <details><summary>Answer</summary>The contents list had <code>font-variant-numeric: tabular-nums</code> on the whole list, so Inter's <code>tnum</code> feature applied to every character, and Inter's tabular set includes a wider hyphen (9.08 px instead of 6.45 px at 14 px). The body text has no tabular figures. The fix moves the feature to the number spans only.</details>
2. The scroll hint is plain CSS. How does the page know a diagram scrolls, without JavaScript?
   <details><summary>Answer</summary>The build knows each diagram's floor and writes it as a class (<code>diagram-min-480</code>). The figure is a size container, so <code>@container (width &lt; 480px)</code> matches exactly when the figure is narrower than the diagram's minimum width, which is when its scroll box overflows. One rule per 40 px step covers every floor.</details>
3. You change a remark or rehype plugin and the local build still shows the old HTML. Why, and what do you do?
   <details><summary>Answer</summary>Astro caches each post's rendered HTML in <code>node_modules/.astro/data-store.json</code> and reuses it while the post file is unchanged. It does not notice that the plugin code changed. Delete that file and build again. CI starts from a clean checkout, so it never sees a stale cache.</details>

### 6. Deviations and gotchas

- **Astro's content cache hides plugin changes.** The first branch build reused every post's cached HTML (no `<wbr>`, no hint, no `num` cells). `node_modules/.astro/data-store.json` is the file; deleting `.astro/data-store.json` alone changed nothing (tested). The README says so; CI is unaffected.
- **`pnpm exec` and `pnpm run` reinstall when the lockfile changes.** pnpm 12 checks the lockfile before it runs anything, and it quietly rewrote a mutated lockfile before the test could see it. The lockfile mutation check runs `./node_modules/.bin/vitest` directly. The `@pnpm/exe` entry also came back once mid-chat, at about 23:29, without any pnpm call of mine (the nvm pnpm, tested, leaves the file alone); restored, never committed. Whatever writes it, the new test turns `verify` red before it can merge.
- **The first lockfile regex missed the entry.** `/'@pnpm\/exe'[:@]/` wanted a quote straight after `exe`; the mutation check caught it, and `/'@pnpm\/exe(?:'|@)/` matches both forms while leaving the legitimate `@pnpm/exe.<platform>` entries alone.
- **One `astro preview` per project.** Astro 7 refuses a second preview server; the F7 chat's server (since 22:11) was still running and served this branch's `dist/` after each rebuild, so screenshots and checks used it. A second launch configuration was added and removed again.
- **"Now" is hidden, a deviation from HANDOFF.md 5.3**, which lists the section with placeholder items. The schema now accepts zero or three items; HANDOFF.md 5.3 notes it. Sending three items brings it back with no code change.
- **Reign Edge's home card shows "Side venture"** in the stack line: HANDOFF.md 5.3 gives it no stack, and an empty line made the two cards uneven.
- **The README logo depends on the live site.** The committed monogram is a square tile; only the site's CSS makes it round. The README uses `https://chau-minh-tieu.github.io/favicon.svg`, the round mark the build already draws, instead of committing a generated copy.
- **`text-wrap: pretty` moves some breaks** in body text (About now ends a line before "side project"), and the colophon may break at the hyphen of "third-party", which is an ordinary place to break. A non-breaking hyphen (U+2011, inside the served Inter subset's U+2000–206F range) would prevent it if you mind.
- **Screenshots are palette PNGs**, re-encoded with `sharp` (about 70% smaller, 672 KB for 14 files); `pnpm privacy` found no metadata in them.
- **The mockup keeps the old footer and colophon.** HANDOFF.md wins on conflict, and it now records the new copy.
- **PR #2's body was edited** (one line): its two screenshots now point at `e85d96d`, the F1 squash commit, which holds the same files.
- **Lighthouse ran locally** on the branch (Home and post: 100 and 100, CLS 0), and again on the live site after the merge, with the same scores; the README's figures hold.
- **The kitchen sink needed no change:** its tables gain `num` cells and its wide diagrams the hint, and the build-output tests still pass on it.

### 7. Time used

| | Time |
|---|---|
| F8, brief | 23:20 to 23:30 by the clock: reading, the live review, docs, the brief |
| Waiting for your answers | 23:30 to about 23:34 |
| F8, build | 23:34 to 23:55: records, CSS and plugins, tests, screenshots, README, licence, docs, PR #14, this debrief |
| F8 so far | about 35 minutes of work, before your checks, the revert dry run, Guide D, review and merge |
| Cumulative | about 8 h 14 min of active time (about 10 h 16 min by the clock) of the planned 4–6 hours |
| Revert dry run | 23:58 to 00:01: the first "done" reached no command (as in F7); then I ran it on your request and checked #15 |
| Checks, Guide D, footer change, review and merge | 00:01 to 00:13: #15 closed, Guide D verified, the footer chosen from five options, your four checks recorded, PR #14 merged |
| Post-merge verification | 00:13 to 00:16 |
| Close-out PR | 00:18 to 00:21: this record |
| F8 total | 23:20 to 00:21 by the clock, about 1 h 01 min; about 57 minutes active, leaving out the wait for your answers (23:30 to 23:34) |
| Cumulative after F8 | about 8 h 36 min of active time (about 10 h 42 min by the clock), against the planned 4–6 hours, which you agreed could run over |

### 8. Q&A log

- **Review change: a shorter footer, about AI, with a solo-founder feel.** You asked for a line shorter than "Building software since 2010, still learning it one note at a time.", about AI, with some emotion and the feel of a solo founder's startup. From five options you chose option 3: the footer now reads "© 2026 Chau Tieu · One engineer and AI, seeing how far we get." (43 characters after the dot, 66 before). It echoes the About copy's "how far one engineer can go with AI" and adds nothing beyond HANDOFF.md 3.1. The runner-up was "A team of one, with a model for company." Recorded in HANDOFF.md 5.3; the footer screenshots (`08-home-*`, `08-mobile.png`) were retaken.

### 9. Next

Nothing within F8: merged as `7f4b9f6` and verified live (part 1). This close-out PR records the final time; F8 ends when you call it done. Deferred, not deleted (HANDOFF.md 8): Vale rules in CI, per-post Open Graph images, the Claude Code GitHub Action, search.

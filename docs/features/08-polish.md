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

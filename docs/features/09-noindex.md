# F9 — Not indexed by search engines

## Brief

**Purpose.** A requirement change from the owner on 2026-11-05: search engines must not index the site. Every page asks them not to, and robots.txt still lets them crawl, so they can read that request. Image search and AI-training crawlers are refused at the door. The sitemap goes. RSS and link previews stay. "Unlisted" now means only "kept out of the lists and RSS", because every page is `noindex` anyway.

**What you will learn**

- `[Content]` Crawling and indexing are separate controls. robots.txt decides whether a bot may fetch a URL, like a firewall rule. `<meta name="robots">` decides whether a fetched page may appear in results, like a `Cache-Control: no-store` on the response. A URL blocked by robots.txt is never fetched, so its `noindex` is never read, and Google can still list the bare address when other sites link to it ([Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing)). That is why a global `Disallow: /` would defeat the goal.
- `[Content]` robots.txt groups ([RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html)): a crawler obeys only the groups that name it and falls back to `*` when none does. So `Googlebot-Image` obeys its own `Disallow: /`, while `Googlebot` obeys `*`. `Google-Extended` and `Applebot-Extended` are not crawlers. They are permission flags that Googlebot and Applebot read for AI training, and they do not affect search ([Google](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers), [Apple](https://support.apple.com/en-us/119829)).
- `[GitHub]` GitHub Pages serves files and cannot add response headers, so `X-Robots-Tag` is not available. `noindex` can only live inside HTML. XML, TXT and SVG files are indexable too ([Google](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types)) and cannot carry the tag (question 2).
- `[Astro]` One layout, one rule. `BaseLayout.astro` writes every page's `<head>`, so one line covers the site. A build-output test over every HTML file in `dist/` guards it like a contract test, including pages added later.

**Decisions** (defaults in bold)

1. **`<meta name="robots" content="noindex, nofollow">`, unconditional, in `BaseLayout.astro`.** Spelled out as the requirement says, not Google's shorthand `none`. The `noindex` prop and its two callers (`PostLayout` for non-published posts, `404.astro`) go: one rule, no switch.
2. **`public/robots.txt` becomes:**
   ```
   # Crawling stays allowed so search engines can read each page's noindex tag.
   User-agent: *
   Allow: /

   User-agent: Googlebot-Image
   User-agent: GPTBot
   User-agent: ClaudeBot
   User-agent: CCBot
   User-agent: Google-Extended
   User-agent: Applebot-Extended
   Disallow: /
   ```
   One group with six `User-agent` lines, as RFC 9309 allows. No `Sitemap:` line. Tokens are checked against each vendor's page ([OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-content-from-the-web-and-how-can-site-owners-block-the-crawler), [Common Crawl](https://commoncrawl.org/ccbot)).
3. **The sitemap goes.** There is no `@astrojs/sitemap` integration to remove: F2 wrote its own endpoint (plan, deviation 8). `src/pages/sitemap.xml.ts`, its test, its smoke check and every live mention go. Closed feature docs (F2, F3, F7) stay as the record of what was built then.
4. **Unchanged:** RSS, canonical URLs (self-referencing, and `og:url` uses the same URL), Open Graph and Twitter tags, and unlisted posts staying out of home, tag pages, next/previous and RSS.
5. **Tests.** Build output: every `.html` in `dist/` carries the tag exactly once; `dist/robots.txt` allows `*` with no `Disallow` and disallows `/` for the six tokens; no `sitemap.xml` and no "sitemap" text anywhere in `dist/`. A small parser in `scripts/lib/robots.ts`, unit-tested, serves the test and the smoke check. The unlisted and 404 tests move to the new tag. **Mutation check:** dropping the tag, or adding `Disallow: /` under `*`, turns the suite red.
6. **Smoke checks after every deploy:** home, Projects, About, the unlisted post and the 404 page carry the tag; live robots.txt passes the same parser; `/sitemap.xml` answers 404.
7. **Docs:** HANDOFF.md 4.2 and 6.2 (old text struck through, an owner-decision note, as before); one Frontend rule in CLAUDE.md; the plan's "Later decisions", deviation 8 marked superseded, the versions row; the runbook's publish and unpublish checks (a published page now carries `noindex` too, and the lists and RSS tell the states apart); the README's two sitemap mentions and one sentence on why the site is not indexed; the kitchen-sink description, which names the sitemap and ships in `dist/`; code comments.
8. **Not in scope:** Google Search Console, which needs an account and a verification token. Pages Google already holds drop out when it recrawls them, which "may take months" for a page it rarely visits (Google). Lighthouse's SEO category will flag "blocked from indexing". That is expected, and HANDOFF.md 9 measures only performance and accessibility.

**Questions** (reply "defaults" to accept all)

1. **AI search crawlers. Default: block only the six tokens you named.** Reason: your list is explicit, and adding a token later is one line. Alternative: also block `OAI-SearchBot` and `Claude-SearchBot`, which build the search indexes behind ChatGPT and Claude search. Their vendors' pages describe robots.txt as the way to opt out.
2. **Non-HTML files** (`/rss.xml`, `/version.txt`, the SVG icons). **Default: accept and record the gap in the plan.** Reason: Pages cannot send `X-Robots-Tag`. A `Disallow` for these files would contradict "allow all" and would not stop a bare-URL listing. Images are covered by `Googlebot-Image`.

**Acceptance criteria**

- Every HTML file in `dist/` carries `<meta name="robots" content="noindex, nofollow">` exactly once, and the mutation check proves the test bites.
- `dist/robots.txt` matches decision 2. `dist/` has no `sitemap.xml` and no "sitemap" text. RSS, canonical, Open Graph and unlisted tests stay green.
- HANDOFF.md 4.2 and 6.2, CLAUDE.md, the plan, the runbook and the README are updated. `grep -ri sitemap` outside closed feature docs finds only this feature's record.
- `pnpm check`, `build`, `test` and `privacy` are green locally. On the PR, `verify` and `privacy` are green and `content` is skipped. No visual change, so no screenshots.
- After the merge: Deploy is green, including smoke. Live `/sitemap.xml` answers 404. `curl` shows the tag on home and on a published post.

**Timebox.** About 20 minutes of yours: this brief, then the PR review. Mine: about 45 minutes of build.

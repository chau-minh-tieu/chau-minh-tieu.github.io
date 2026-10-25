<!--
Post PR template (HANDOFF.md 6.3). Use it with
  gh pr create --template post.md --label post
from a post/<slug> branch. The `content` check (.github/workflows/post.yml)
requires the closing line below to name the brief in the post's frontmatter.
This text is public: generic terms only (STYLE.md, "Privacy").
-->

Closes #<brief>

## Post

- Slug: `<slug>` (unlisted preview after merge: https://chau-minh-tieu.github.io/posts/<slug>/)
- Status: `unlisted`
- Thesis, in one sentence:

## Claims to verify

<!-- Every number and technical claim the reviewer should check, with the source that supports it. -->

- 

## Checklist

- [ ] Written to `STYLE.md`; the insight from the brief is at the centre
- [ ] Only `src/content/posts/<slug>/` changes
- [ ] Frontmatter: `brief` set, `status: unlisted`, `sources` for every technical claim and number
- [ ] Every image has alt text; no raw `<img>`; no file names in the retina style (use `name-2x.png`)
- [ ] `disclosure` set if the post has no code
- [ ] Nothing outside HANDOFF.md 3.1: no employers, clients, colleagues, cities, email addresses, internal figures or trading positions
- [ ] Local checks green: `pnpm check && pnpm build && pnpm test && pnpm privacy && pnpm links <slug>`

# F3 — Deploy to Pages

## Brief

**Purpose.** Put the site live at https://chau-minh-tieu.github.io. Every push to `main` builds the site once, checks it, uploads `dist/` as a Pages artifact and deploys exactly that artifact through the `github-pages` environment. Smoke checks then confirm that the live site serves the new commit and behaves as the build-output tests promise. Setup Guide B2 makes the environment strict.

**What you will learn**

- `[CI/CD]` Artifact deploys: build once, ship the bytes. The Pages artifact is a container image built from a larger build context: the deploy job never rebuilds, it promotes the tested `dist/`.
- `[GitHub]` Environments as deployment gates: a branch policy, the OIDC token (`id-token: write`) that proves to Pages which branch is deploying, and the deployment history.
- `[CI/CD]` Least privilege by splitting jobs: the only job that can write to Pages runs none of our code.
- `[CI/CD]` Concurrency groups: one run in progress, one waiting, the newest push replaces the waiting run.
- `[GitHub]` What Pages adds when it serves files: the `https://` redirect, trailing-slash redirects, a default 404 page, CDN caching, and no custom headers (which is why the CSP stays in a `<meta>` tag).

**Decisions** (defaults in bold)

1. **`.github/workflows/deploy.yml`, run on a push to `main` and on `workflow_dispatch`, with three jobs: `build` → `deploy` → `smoke`.** No path filter: a deploy takes about a minute, and a filter can skip a change that matters (a config file, a dependency).
2. **Permissions per job.** `build` and `smoke`: `contents: read`. `deploy`: `pages: write` and `id-token: write` only, and it runs nothing but `actions/deploy-pages`, so no repository code or dependency ever holds write access. `deploy` also checks `github.ref == 'refs/heads/main'`, on top of the environment's branch policy.
3. **Concurrency on the whole workflow: `group: pages`, `cancel-in-progress: false`** (GitHub's starter workflow). A deploy in progress is never cut off, and the last merge always deploys last. If only the deploy job were grouped, an older build that finished late could overwrite a newer deploy.
4. **`build` runs the same gate as `verify` (check, build, tests including the `dist/` tests) before `upload-pages-artifact`.** A squash merge of a branch that was behind `main` produces a commit no PR has tested; the site only receives a commit that passes the tests on its own.
5. **Shared setup as a local composite action, `.github/actions/setup/action.yml`:** Node from `.nvmrc`, corepack, the pnpm store cache and a frozen install, used by `verify` and `build`. One place to bump Node or an action SHA. Job names stay `verify` and `privacy`. The repository's Actions policy allows local actions, and they need no SHA pin (they run from the same commit).
6. **No `actions/configure-pages`.** It adapts the configs of Next, Nuxt, Gatsby and SvelteKit and reports the Pages URL; Astro's `site` is fixed in `astro.config.mjs`, and the smoke checks test the real URL. One action fewer and no `pages: read` in `build`.
7. **Pinned by SHA:** `upload-pages-artifact` v5.0.0 (`fc324d3…`, which pins its own `upload-artifact` v7.0.0 by SHA) and `deploy-pages` v5.0.1 (`368f825…`). `checkout` v7.0.1, `setup-node` v7.1.0 and `cache` v6.1.0 are still the latest releases. GitHub's Pages guide still shows older majors; the releases win. `upload-pages-artifact` leaves out dotfiles; Astro writes `_astro/`, so nothing is lost.
8. **A build marker at `/version.txt`:** the commit SHA (`GITHUB_SHA`; `local` outside CI), like the git info of a service's `/actuator/info`. The smoke checks first wait until the live site serves the commit just built, so they never pass against the previous deploy.
9. **Smoke checks in `scripts/smoke.ts`**, Node built-ins only like `privacy-check`, run by the `smoke` job against the deploy's `page_url` and locally with `pnpm smoke [url]`. Checks: version matches; `/` returns 200 with the CSP `<meta>`; every script, stylesheet, preload and image on `/` and `/posts/kitchen-sink/` is same-origin and returns 200; `/rss.xml`, `/sitemap.xml` and `/robots.txt` return 200 and the sitemap has no kitchen-sink; kitchen-sink returns 200 with `noindex`; `/posts/draft-fixture/` returns 404; on the live host only, `http://` redirects to `https://` and `/posts/kitchen-sink` to `/posts/kitchen-sink/`. Each check retries for up to three minutes; results go to the run's summary page. Pure functions unit-tested. A failed smoke check turns the run red but does not roll back (rollback: the runbook in F7).
10. **Setup Guide B2 is mostly verification.** Read on 2026-10-25: Pages source GitHub Actions, HTTPS enforced, `github-pages` with the branch policy `main` only. One change: turn off **Allow administrators to bypass configured protection rules** (`can_admins_bypass` is `true` today), so no one, the owner included, can deploy another branch. The REST API documents no field for it, so this is a UI step, verified with a read-only `GET`. After the merge: watch the run, then verify.

**Acceptance criteria**

- `pnpm check`, `build`, `test`, `privacy` green locally; `pnpm smoke http://localhost:4321` green against `pnpm preview` (the checks that do not depend on Pages).
- `verify` and `privacy` green on the PR, running through the shared setup.
- Guide B2 applied; read-only `gh api -X GET` shows `can_admins_bypass: false` and the branch policy `main`.
- After the merge: the Deploy run on `main` is green through `github-pages`; `smoke` is green with `/version.txt` equal to the squash commit; https://chau-minh-tieu.github.io serves home, kitchen-sink (`noindex`), RSS and sitemap, with no CSP errors in the browser console.

**Timebox.** 30 minutes of the owner's time; it may run over, and nothing here is cut (owner decision, 2026-10-25). Risk: `deploy.yml` first runs after the merge (manual runs need the workflow on `main`), so its first run is watched; the PR proves the shared setup it depends on.

**Docs.** [Custom workflows for Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [`deploy-pages`](https://github.com/actions/deploy-pages) · [`upload-pages-artifact`](https://github.com/actions/upload-pages-artifact) · [Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) · [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect) · [Concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency) · [Composite actions](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action) · [Actions settings (local actions, SHA pinning)](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) · [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) · [Astro on GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)

# F1 — Scaffold and design foundation

## Brief

**Purpose.** Build the empty shell every page will share: the Astro project, self-hosted fonts, the colour tokens for both themes, the base layout with nav and footer, a theme toggle without a flash of the wrong theme, and the Content Security Policy. Add the PR workflow every later feature must pass, and the ruleset that makes passing it mandatory (Setup Guide B1).

**What you will learn**

- `[Astro]` Project anatomy: `astro.config.mjs`, `src/pages/` as routes, layouts and components. Static output means each page is a server-side template rendered once at build time into a file.
- `[CSS]` Custom properties as configuration injected at runtime: `tokens.css` defines `--bg`, `--ink` and the rest; the dark theme swaps the values, never the rules.
- `[CSS]` `prefers-color-scheme` with a `data-theme` override, and why the override must be applied before the first paint.
- `[CI/CD]` Workflow anatomy: trigger, jobs, steps, per-job `permissions`, and how a job name becomes a required status check.
- `[TS]` Strict mode and `astro check`, the type checker that also understands `.astro` files.

**Decisions** (defaults in bold)

1. **Scaffold from Astro's `minimal` template with `pnpm create astro@latest`, then trim.** Exact version pins (`save-exact`), `.nvmrc` with Node 26.12.1, `packageManager` with pnpm 12.15.0.
2. **Fonts through Astro's Fonts API with `fontProviders.npm({ remote: false })`, reading `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` from `node_modules`.** `remote: false` stops the CDN fallback, so builds make no font requests and the site serves the files itself. Astro also generates metric-matched fallback fonts, which cuts layout shift while fonts load, and preloads only the Inter file. Plain `@fontsource` CSS imports are the fallback if the provider misbehaves ([Fonts guide](https://docs.astro.build/en/guides/fonts/), [provider reference](https://docs.astro.build/en/reference/font-provider-reference/)).
3. **No CSS framework.** The tokens already are custom properties; Tailwind would add a build step and a second vocabulary for the same values.
4. **Theme: `<html data-theme>` set by a few lines of inline script in `<head>` before first paint, reading `localStorage` inside `try/catch`.** With no stored choice, CSS follows `prefers-color-scheme`. The toggle is a two-state button (44 px target) that flips the current theme and remembers it.
5. **CSP through Astro's `security.csp`**, which hashes the inline theme script and every stylesheet. Added directives: `default-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`. `frame-ancestors` is ignored in a `<meta>` CSP and GitHub Pages cannot set headers, so clickjacking protection is not available; documented, accepted for a read-only site.
6. **`pr.yml` with two jobs.** `verify`: install, `astro check`, `vitest run`, `astro build`. `privacy`: scans tracked files and the PR's commit messages with `PRIVACY_TERMS`, and skips with a notice when the secret is empty (fork PRs). Node from `.nvmrc`, corepack installed from npm, pnpm store cached with `actions/cache`, every action pinned by SHA.
7. **`scripts/privacy-check.ts`, run by Node's type stripping.** Modes `--staged` (pre-commit), `--tracked` (CI) and `--commits <range>` (CI). It reads `.privacy-terms` locally or `PRIVACY_TERMS` in CI: one term per line, `#` comments, case- and diacritics-insensitive whole-word or whole-phrase matching. It prints file, line and term index only and exits 1 on any hit. It also flags email-like strings in tracked files.
8. **Pre-commit hook in `.githooks/pre-commit`**, enabled by a `prepare` script that runs `git config core.hooksPath .githooks`.
9. **Nav mark: the oxblood monogram, copied to `public/brand/` with its metadata stripped.** Favicon and Open Graph stay in F5.
10. **Setup Guide B1 once the PR's checks are green:** a ruleset on `main` requiring a pull request (0 approvals, since an owner cannot approve their own PR) and the `verify` and `privacy` checks, blocking force pushes and deletion, with no bypass list.

**Acceptance criteria**

- `pnpm dev` shows the shell (nav with monogram, "Chau Tieu", Writing · Projects · About, theme toggle; footer copy from HANDOFF.md 5.3) matching the mockup in light and dark.
- The toggle works, survives a reload, and reloading in either theme shows no flash of the other.
- `pnpm check`, `pnpm test`, `pnpm build` and `pnpm privacy` are green locally. The built HTML carries a CSP `<meta>` starting with `default-src 'self'` and references no external origin.
- `verify` and `privacy` are green on the PR. Screenshots of both themes are in the PR body.
- After Guide B1, read-only checks show the ruleset, and a direct push to `main` is refused.

**Timebox.** 50 minutes of the owner's time.

**Docs.** [Astro project structure](https://docs.astro.build/en/basics/project-structure/) · [Astro `security.csp`](https://docs.astro.build/en/reference/configuration-reference/) · [MDN: `prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) · [Workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions) · [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

/**
 * Link check for posts (F6): every external link on a post's built page, the
 * body and the sources, must still lead somewhere. The rules live in
 * scripts/lib/links.ts; this file picks the pages, runs the checks and reports.
 *
 *   node scripts/link-check.ts <slug>...            the posts' pages in dist/ (pnpm links)
 *   node scripts/link-check.ts --base A --head B    the posts a PR changes (CI)
 *
 * Run `pnpm build` first. A post without a built page (a draft, or deleted)
 * is skipped with a notice. Failures (404, 410, unknown host) fail the run;
 * warnings (401, 403, 429, 5xx, timeouts, plain HTTP) are listed for the
 * reviewer. In GitHub Actions the results also go to the run's summary page.
 *
 * Exit codes: 0 no failures, 1 a link is broken, 2 usage or setup error.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { changedPaths, isRevision } from './lib/git.ts';
import { checkLinks, postLinks, type LinkResult } from './lib/links.ts';
import { changedSlugs } from './lib/post-gates.ts';

const SITE = new URL('https://chau-minh-tieu.github.io/');
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const inActions = process.env.GITHUB_ACTIONS === 'true';

async function main(): Promise<number> {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      options: { base: { type: 'string' }, head: { type: 'string' } },
      allowPositionals: true,
      strict: true,
    }));
  } catch (error) {
    console.error(`links: ${(error as Error).message}`);
    return 2;
  }
  const fromPr = values.base !== undefined || values.head !== undefined;
  if (fromPr ? positionals.length > 0 || !isRevision(values.base) || !isRevision(values.head) : positionals.length === 0) {
    console.error('links: usage: node scripts/link-check.ts <slug>... | --base <commit> --head <commit>');
    return 2;
  }
  const slugs = fromPr ? changedSlugs(changedPaths(values.base!, values.head!)) : positionals;
  const invalid = slugs.filter((slug) => !SLUG.test(slug));
  if (invalid.length > 0) {
    console.error(`links: not a post slug: ${invalid.join(', ')}`);
    return 2;
  }

  const rows: string[] = [];
  let failures = 0;
  let warnings = 0;
  for (const slug of slugs) {
    const page = join('dist', 'posts', slug, 'index.html');
    if (!existsSync(page)) {
      const notice = `${slug} has no built page (a draft, or deleted): skipped`;
      console.log(inActions ? `::notice title=Links::${notice}` : `links: ${notice}`);
      continue;
    }
    const results: LinkResult[] = await checkLinks(fetch, postLinks(readFileSync(page, 'utf8'), SITE));
    console.log(`links: ${slug}: ${results.length} external link(s)`);
    for (const { url, verdict, detail } of results) {
      if (verdict === 'fail') failures++;
      if (verdict === 'warn') warnings++;
      const line = `${url}: ${detail}`;
      if (inActions && verdict !== 'ok') {
        console.log(`::${verdict === 'fail' ? 'error' : 'warning'} title=Link in ${slug}::${line}`);
      } else {
        console.log(`links:   ${verdict.padEnd(4)} ${line}`);
      }
      rows.push(`| ${slug} | ${verdict === 'fail' ? '**fail**' : verdict} | ${url} | ${detail.replace(/\|/g, '\\|')} |`);
    }
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const table = rows.length > 0 ? ['| Post | Result | Link | Answer |', '|---|---|---|---|', ...rows] : ['No external links to check.'];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${['## Links', '', ...table, ''].join('\n')}\n`);
  }
  const counts = `${rows.length} link(s), ${failures} broken, ${warnings} warning(s)`;
  console.log(failures > 0 ? `links: FAIL ${counts}` : `links: ok, ${counts}`);
  return failures > 0 ? 1 : 0;
}

process.exitCode = await main();

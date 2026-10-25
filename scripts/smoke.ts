/**
 * Smoke checks against a deployed copy of the site (F3). The checks live in
 * scripts/lib/smoke.ts; this file runs them, retries and reports.
 *
 *   node scripts/smoke.ts [url] [--version SHA] [--timeout SECONDS]
 *
 * url defaults to the live site. With --version, the `version` check passes
 * only once /version.txt serves that commit, so a run right after a deploy
 * does not pass against the previous one. Every check retries until a shared
 * deadline (--timeout, default 180 seconds) and runs at least once. Locally,
 * point it at `pnpm preview` (http://localhost:4321); the checks of Pages' own
 * redirects run only against a non-local host. In GitHub Actions the results
 * also go to the run's summary page.
 *
 * Exit codes: 0 all passed, 1 a check failed, 2 usage error.
 */
import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { siteRoot, smokeChecks } from './lib/smoke.ts';

const SITE = 'https://chau-minh-tieu.github.io/';
const RETRY_MS = 10_000;

const inActions = process.env.GITHUB_ACTIONS === 'true';

async function main(): Promise<number> {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      options: {
        version: { type: 'string' },
        timeout: { type: 'string', default: '180' },
      },
      allowPositionals: true,
      strict: true,
    }));
  } catch (error) {
    console.error(`smoke: ${(error as Error).message}`);
    return 2;
  }
  const timeout = Number(values.timeout);
  if (positionals.length > 1 || !Number.isFinite(timeout) || timeout < 0) {
    console.error('smoke: usage: node scripts/smoke.ts [url] [--version SHA] [--timeout SECONDS]');
    return 2;
  }
  let root: URL;
  try {
    root = siteRoot(positionals[0] || SITE);
  } catch (error) {
    console.error(`smoke: ${(error as Error).message}`);
    return 2;
  }
  if (values.version === '') {
    console.error('smoke: --version needs a commit SHA');
    return 2;
  }

  console.log(`smoke: ${root.href}${values.version ? `, expecting version ${values.version}` : ''}`);
  const deadline = Date.now() + timeout * 1000;
  const rows: string[] = [];
  let failed = 0;

  for (const check of smokeChecks(root, values.version)) {
    let attempts = 0;
    let ok = false;
    let detail = '';
    for (;;) {
      attempts++;
      try {
        detail = await check.run(fetch);
        ok = true;
        break;
      } catch (error) {
        detail = (error as Error).message;
        if (Date.now() + RETRY_MS > deadline) break;
        await sleep(RETRY_MS);
      }
    }
    const tries = attempts > 1 ? ` (${attempts} attempts)` : '';
    if (ok) {
      console.log(`smoke: ok   ${check.name}: ${detail}${tries}`);
    } else {
      failed++;
      console.log(inActions ? `::error title=Smoke check ${check.name}::${detail}` : `smoke: FAIL ${check.name}: ${detail}${tries}`);
    }
    rows.push(`| ${check.name} | ${ok ? 'pass' : '**fail**'} | ${detail.replace(/\|/g, '\\|')}${tries} |`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const table = ['## Smoke checks', '', `Site: ${root.href}`, '', '| Check | Result | Detail |', '|---|---|---|', ...rows, ''];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table.join('\n')}\n`);
  }
  console.log(failed > 0 ? `smoke: ${failed} of ${rows.length} check(s) failed` : `smoke: all ${rows.length} checks passed`);
  return failed > 0 ? 1 : 0;
}

process.exitCode = await main();

/**
 * Gates for post PRs (HANDOFF.md 6.3), run by the `content` job of
 * .github/workflows/post.yml on branches named post/*. The rules live in
 * scripts/lib/post-gates.ts; this file reads git, the PR body and the GitHub
 * API, and reports.
 *
 *   node scripts/post-gates.ts scope --base A --head B
 *       Every path the PR changes (both sides of a rename) is under
 *       src/content/posts/.
 *   node scripts/post-gates.ts brief --base A --head B
 *       Every post the PR changes has `brief: N`; the PR body (PR_BODY) closes
 *       #N; issue N is labelled brief, locked and opened by a collaborator.
 *
 * A and B are commits; the PR's changes are git diff A...B, as GitHub shows
 * them. GITHUB_REPOSITORY and GITHUB_TOKEN come from Actions; locally the
 * repository defaults to this one and the API is read without a token.
 *
 * Exit codes: 0 passed, 1 a gate failed, 2 usage or setup error.
 */
import { parseArgs } from 'node:util';
import { changedPaths, git, isRevision } from './lib/git.ts';
import { briefOf, briefProblems, changedSlugs, closedIssues, outOfScope, POSTS_DIR, type Issue } from './lib/post-gates.ts';

const REPOSITORY = process.env.GITHUB_REPOSITORY || 'chau-minh-tieu/chau-minh-tieu.github.io';
const API = process.env.GITHUB_API_URL || 'https://api.github.com';

const inActions = process.env.GITHUB_ACTIONS === 'true';

function fail(gate: string, message: string): void {
  console.log(inActions ? `::error title=${gate}::${message}` : `${gate}: FAIL ${message}`);
}

function scope(paths: string[]): number {
  const outside = outOfScope(paths);
  for (const path of outside) fail('scope', `${path} is outside ${POSTS_DIR}`);
  if (outside.length > 0) {
    console.log(`scope: ${outside.length} of ${paths.length} changed path(s) outside ${POSTS_DIR}; a post PR changes posts only`);
    return 1;
  }
  console.log(`scope: all ${paths.length} changed path(s) are under ${POSTS_DIR}`);
  return 0;
}

async function issue(number: number): Promise<Issue | string> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`${API}/repos/${REPOSITORY}/issues/${number}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404 || response.status === 410) return `issue #${number} does not exist`;
  if (!response.ok) throw new Error(`GET issue #${number}: ${response.status}`);
  return (await response.json()) as Issue;
}

async function brief(head: string, paths: string[]): Promise<number> {
  const slugs = changedSlugs(paths);
  if (slugs.length === 0) {
    fail('brief', 'the PR changes no post');
    return 1;
  }
  const closes = closedIssues(process.env.PR_BODY ?? '');
  let problems = 0;
  for (const slug of slugs) {
    const file = `${POSTS_DIR}${slug}/index.md`;
    let markdown: string;
    try {
      markdown = git(['show', `${head}:${file}`]);
    } catch {
      console.log(`brief: ${slug} is deleted in this PR: nothing to check`);
      continue;
    }
    const number = briefOf(markdown);
    const found: string[] = [];
    if (number === undefined) {
      found.push(`${file} has no \`brief: N\` in its frontmatter`);
    } else {
      if (!closes.includes(number)) found.push(`the PR body does not say "Closes #${number}" for ${slug}`);
      const result = await issue(number);
      found.push(...(typeof result === 'string' ? [result] : briefProblems(result)));
    }
    for (const message of found) fail('brief', message);
    if (found.length === 0) console.log(`brief: ${slug} comes from brief #${number}, which the PR closes`);
    problems += found.length;
  }
  return problems > 0 ? 1 : 0;
}

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
    console.error(`post-gates: ${(error as Error).message}`);
    return 2;
  }
  const [gate] = positionals;
  const { base, head } = values;
  if (positionals.length !== 1 || (gate !== 'scope' && gate !== 'brief') || !isRevision(base) || !isRevision(head)) {
    console.error('post-gates: usage: node scripts/post-gates.ts scope|brief --base <commit> --head <commit>');
    return 2;
  }
  const paths = changedPaths(base, head);
  return gate === 'scope' ? scope(paths) : await brief(head, paths);
}

process.exitCode = await main();

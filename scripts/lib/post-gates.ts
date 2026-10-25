/**
 * Rules for post PRs (HANDOFF.md 6.3), shared by scripts/post-gates.ts,
 * scripts/link-check.ts and the tests. Pure functions: git and the GitHub API
 * stay in the command-line scripts.
 */

export const POSTS_DIR = 'src/content/posts/';

/** Changed paths a post PR may not touch: everything outside src/content/posts/. */
export function outOfScope(paths: readonly string[]): string[] {
  return paths.filter((path) => !path.startsWith(POSTS_DIR));
}

/** The posts a list of changed paths touches, by folder name (the slug), in order. */
export function changedSlugs(paths: readonly string[]): string[] {
  const slugs = new Set<string>();
  for (const path of paths) {
    if (!path.startsWith(POSTS_DIR)) continue;
    const [slug, ...rest] = path.slice(POSTS_DIR.length).split('/');
    if (slug && rest.length > 0) slugs.add(slug);
  }
  return [...slugs];
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const BRIEF = /^brief:[ \t]*(\d+)[ \t]*(?:#.*)?$/m;

/**
 * `brief: N` from a post's frontmatter. Read with a pattern, not a YAML
 * parser: the build validates the whole frontmatter with the schema, and a
 * quoted or otherwise unusual value fails there.
 */
export function briefOf(markdown: string): number | undefined {
  const frontmatter = markdown.match(FRONTMATTER)?.[1];
  const value = frontmatter?.match(BRIEF)?.[1];
  return value === undefined ? undefined : Number(value);
}

/**
 * GitHub's closing keywords (close, fix and resolve, in all three forms, any
 * case, an optional colon) followed by `#N` in the same repository.
 * HTML comments are left out, so the template's instructions never count.
 */
const CLOSING = /\b(?:close[sd]?|fix(?:es|ed)?|resolve[sd]?):?[ \t]+#(\d+)\b/gi;

/** The issue numbers a PR body closes, in order, without repeats. */
export function closedIssues(body: string): number[] {
  const text = body.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  return [...new Set(Array.from(text.matchAll(CLOSING), (match) => Number(match[1])))];
}

/** The fields of a REST issue object the brief rule reads. */
export interface Issue {
  number: number;
  labels: readonly (string | { name?: string })[];
  locked: boolean;
  author_association: string;
  pull_request?: unknown;
}

/** Collaborators in GitHub's terms: the only authors whose text is AI input (CLAUDE.md). */
export const COLLABORATORS: readonly string[] = ['OWNER', 'MEMBER', 'COLLABORATOR'];

/** What keeps an issue from being a post's brief; empty when it is one. */
export function briefProblems(issue: Issue): string[] {
  const n = `#${issue.number}`;
  if (issue.pull_request) return [`${n} is a pull request, not a brief`];
  const problems: string[] = [];
  const labels = issue.labels.map((label) => (typeof label === 'string' ? label : label.name));
  if (!labels.includes('brief')) problems.push(`${n} is not labelled brief`);
  if (!issue.locked) problems.push(`${n} is not locked, so its thread may hold text from outside the collaborators`);
  if (!COLLABORATORS.includes(issue.author_association)) problems.push(`${n} was not opened by a collaborator`);
  return problems;
}

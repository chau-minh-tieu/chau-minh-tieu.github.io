/** Git reads shared by the post-PR scripts (post-gates, link-check). */
import { execFileSync } from 'node:child_process';

/** Runs git and returns its output; on failure git's own message is in the thrown error, not on the console. */
export function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * The paths a PR changes, as GitHub shows them: git diff base...head, from the
 * merge base of the two commits to head. Renames count as a delete plus an
 * add, so both paths are listed.
 */
export function changedPaths(base: string, head: string): string[] {
  return git(['diff', '--name-only', '-z', '--no-renames', '--end-of-options', `${base}...${head}`])
    .split('\0')
    .filter(Boolean);
}

/** A commit-ish given on the command line: present, and not an option. */
export function isRevision(value: string | undefined): value is string {
  return value !== undefined && value !== '' && !value.startsWith('-');
}

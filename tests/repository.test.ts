/**
 * Rules on the repository's own files, not on the site: the Markdown docs
 * link only to files that exist, the README's commands exist, and the
 * lockfile has none of the local pnpm's leftovers.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** Tracked Markdown files: the README, the root rules and everything under docs/. */
const docs = execFileSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((path) => path && (!path.includes('/') || path.startsWith('docs/')));

/** Link targets in Markdown and in the HTML a README uses, outside code. */
export function linkTargets(markdown: string): string[] {
  const prose = markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
  const markdownLinks = [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]!);
  const htmlLinks = [...prose.matchAll(/\s(?:src|href|srcset)="([^"]+)"/g)].map((m) => m[1]!);
  return [...markdownLinks, ...htmlLinks];
}

/** True for a link this test checks: a path in the repository, not a URL, an anchor or a placeholder. */
function isLocal(target: string): boolean {
  return !/^(?:[a-z][a-z+.-]*:|#|\/\/)/i.test(target) && !/[<>{}]/.test(target);
}

describe('docs', () => {
  it('finds the documents to check', () => {
    expect(docs).toEqual(expect.arrayContaining(['README.md', 'CLAUDE.md', 'STYLE.md', 'HANDOFF.md', 'docs/runbook.md']));
  });

  it('links only to files that exist', () => {
    const broken: string[] = [];
    for (const doc of docs) {
      for (const target of linkTargets(read(doc)).filter(isLocal)) {
        const path = decodeURIComponent(target.split(/[#?]/)[0]!);
        if (!path) continue;
        const file = path.startsWith('/') ? join(ROOT, path) : resolve(ROOT, dirname(doc), path);
        if (!existsSync(file)) broken.push(`${doc}: ${target} (${relative(ROOT, file)})`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('reads links in Markdown and HTML, and skips code and URLs', () => {
    const sample = [
      '[a](docs/a.md) and [b](./b.png "Title") and [c](#anchor) and [d](https://example.com/)',
      '<img src="docs/readme/x.png" alt=""> `[e](not-a-link.md)`',
      '```md',
      '[f](inside-a-fence.md)',
      '```',
    ].join('\n');
    expect(linkTargets(sample).filter(isLocal)).toEqual(['docs/a.md', './b.png', 'docs/readme/x.png']);
  });

  it('lists only package scripts in the README commands', () => {
    const scripts = Object.keys(JSON.parse(read('package.json')).scripts as Record<string, string>);
    const commands = read('README.md')
      .split('\n')
      .filter((line) => line.startsWith('| `pnpm '))
      .map((line) => /^\| `pnpm ([\w-]+)/.exec(line)![1]!);
    expect(commands.length).toBeGreaterThan(5);
    for (const command of commands) expect(['install', ...scripts], command).toContain(command);
  });
});

describe('lockfile', () => {
  it('has no @pnpm/exe entry, which only a standalone pnpm writes', () => {
    // The standalone pnpm in ~/Library/pnpm/bin records itself as a package
    // manager dependency; corepack's pnpm (packageManager) does not.
    expect(read('pnpm-lock.yaml')).not.toMatch(/'@pnpm\/exe(?:'|@)/);
  });
});

/**
 * The privacy check's command line, run as CI runs it. Only the --text-env
 * mode (brief issues, post PR text) is tested here: the other modes read git,
 * and their matching rules are tested in scripts/lib/privacy.test.ts.
 */
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Fictitious terms only: this file is tracked, so the privacy check scans it.
const TERMS = ['# fictitious', 'Fabrikam', 'Contoso Widgets'].join('\n');

// Built at run time so the file itself contains no email-like string.
const email = (local: string, domain: string) => `${local}@${domain}`;

function run(args: string[], env: Record<string, string>) {
  const result = spawnSync(process.execPath, ['scripts/privacy-check.ts', ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', PRIVACY_TERMS: TERMS, ...env },
  });
  return { code: result.status, out: result.stdout + result.stderr };
}

describe('privacy-check --text-env', () => {
  it('reports the variable, line and term index, never the term or the text', () => {
    const { code, out } = run(['--text-env', 'BRIEF_TITLE', '--text-env', 'BRIEF_BODY'], {
      BRIEF_TITLE: 'Brief: a generic title',
      BRIEF_BODY: ['First line.', 'We tried it at contoso widgets last year.', `Mail ${email('someone', 'example.org')}`].join('\n'),
    });
    expect(code).toBe(1);
    expect(out).toContain('text BRIEF_BODY:2: term #2 (PRIVACY_TERMS line 3)');
    expect(out).toContain('text BRIEF_BODY:3: email-like string');
    expect(out).toContain('2 text(s)');
    expect(out).not.toMatch(/contoso|someone|example\.org|last year/i);
  });

  it('passes clean text and counts an unset variable as an empty field', () => {
    const { code, out } = run(['--text-env', 'BRIEF_BODY', '--text-env', 'BRIEF_COMMENT'], {
      BRIEF_BODY: 'Nothing private here.',
    });
    expect(code).toBe(0);
    expect(out).toContain('privacy: clean (0 file(s), 0 image(s), 0 commit message(s), 2 text(s), 2 term(s))');
  });

  it('refuses a name that is not an environment variable', () => {
    expect(run(['--text-env', 'brief body'], {}).code).toBe(2);
  });
});

/**
 * Privacy check (HANDOFF.md 3.1). Scans for the owner's private terms and for
 * email-like strings, and reports file, line and term index only: never the
 * term, never the match.
 *
 *   node scripts/privacy-check.ts --tracked            every tracked file (pnpm privacy, CI)
 *   node scripts/privacy-check.ts --staged             staged files (pre-commit hook)
 *   node scripts/privacy-check.ts --commits A..B       commit messages in a range (CI)
 *   node scripts/privacy-check.ts --message-file PATH  the message being committed (commit-msg hook)
 *
 * Terms come from the PRIVACY_TERMS environment variable or, when it is empty,
 * from .privacy-terms at the repository root: one term per line, # comments.
 * Matching ignores case and diacritics and needs whole words or phrases.
 * Files are scanned for terms and email addresses; commit messages for terms
 * only, because commit trailers carry addresses by design. Raster images are
 * checked for metadata (EXIF with GPS, XMP, IPTC, C2PA): the repository is
 * public, so stripping images only in the built site would not be enough.
 *
 * Without a term list the term scan is skipped with a notice (fork PRs get no
 * secrets); PRIVACY_REQUIRE_TERMS=1 turns that into an error.
 *
 * Exit codes: 0 clean, 1 findings, 2 usage or setup error.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { findImageMetadata, IMAGE_EXTENSIONS } from './lib/image-metadata.ts';
import { findEmails, findTerms, parseTerms, type Term } from './lib/privacy.ts';

/**
 * Images that carry fake metadata on purpose: the build-output test proves
 * the image pipeline strips it. Nothing else may carry metadata.
 */
const METADATA_FIXTURES = new Set(['src/content/posts/kitchen-sink/screenshot-fixture.jpg']);

interface Finding {
  file?: string;
  location: string;
  line: number;
  message: string;
}

const inActions = process.env.GITHUB_ACTIONS === 'true';

function git(args: string[]): Buffer {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024 });
}

function nulSeparated(output: Buffer): string[] {
  return output.toString('utf8').split('\0').filter(Boolean);
}

function isBinary(content: Buffer): boolean {
  return content.subarray(0, 8000).includes(0);
}

function loadTerms(root: string): { terms: Term[]; source: string } {
  const fromEnv = process.env.PRIVACY_TERMS ?? '';
  if (fromEnv.trim() !== '') return { terms: parseTerms(fromEnv), source: 'PRIVACY_TERMS' };
  const file = join(root, '.privacy-terms');
  if (existsSync(file)) return { terms: parseTerms(readFileSync(file, 'utf8')), source: '.privacy-terms' };
  return { terms: [], source: 'none' };
}

function describe(term: Term, source: string): string {
  return `term #${term.index} (${source} line ${term.sourceLine})`;
}

function main(): number {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        tracked: { type: 'boolean', default: false },
        staged: { type: 'boolean', default: false },
        commits: { type: 'string' },
        'message-file': { type: 'string' },
      },
      strict: true,
    }));
  } catch (error) {
    console.error(`privacy: ${(error as Error).message}`);
    return 2;
  }
  const range = values.commits;
  const messageFile = values['message-file'];
  if (!values.tracked && !values.staged && range === undefined && messageFile === undefined) {
    console.error('privacy: pass --tracked, --staged, --commits <range> or --message-file <path>');
    return 2;
  }
  if (range !== undefined && (range === '' || range.startsWith('-'))) {
    console.error('privacy: --commits needs a revision range such as base..head');
    return 2;
  }

  const root = git(['rev-parse', '--show-toplevel']).toString('utf8').trim();
  const { terms, source } = loadTerms(root);
  if (terms.length === 0) {
    if (process.env.PRIVACY_REQUIRE_TERMS === '1') {
      console.error('privacy: no term list (PRIVACY_TERMS is empty and .privacy-terms is missing)');
      return 2;
    }
    const notice = 'No privacy term list: term scan skipped, email scan still runs.';
    console.log(inActions ? `::notice title=Privacy check::${notice}` : `privacy: ${notice}`);
  }

  const findings: Finding[] = [];
  let files = 0;
  let images = 0;
  let messages = 0;

  const scanFile = (file: string, content: Buffer) => {
    if (IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) {
      images++;
      const kinds = findImageMetadata(content);
      if (kinds.length > 0 && !METADATA_FIXTURES.has(file)) {
        findings.push({ file, location: file, line: 1, message: `image metadata (${kinds.join(', ')})` });
      }
      return;
    }
    if (isBinary(content)) return;
    files++;
    const text = content.toString('utf8');
    for (const { line, term } of findTerms(text, terms)) {
      findings.push({ file, location: file, line, message: describe(term, source) });
    }
    for (const line of findEmails(text)) {
      findings.push({ file, location: file, line, message: 'email-like string' });
    }
  };

  const scanMessage = (location: string, text: string) => {
    messages++;
    for (const { line, term } of findTerms(text, terms)) {
      findings.push({ location, line, message: describe(term, source) });
    }
  };

  if (values.tracked) {
    for (const file of nulSeparated(git(['ls-files', '-z']))) {
      const path = join(root, file);
      if (!existsSync(path) || !statSync(path).isFile()) continue;
      scanFile(file, readFileSync(path));
    }
  }

  if (values.staged) {
    const staged = git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']);
    for (const file of nulSeparated(staged)) {
      scanFile(file, git(['show', `:${file}`]));
    }
  }

  if (range !== undefined) {
    const log = git(['log', '--format=%h%x1f%B%x1e', '--end-of-options', range]).toString('utf8');
    for (const entry of log.split('\x1e')) {
      const [sha, body] = entry.replace(/^\n/, '').split('\x1f');
      if (sha && body !== undefined) scanMessage(`commit ${sha}`, body);
    }
  }

  if (messageFile !== undefined) {
    // Drop git's comment lines and the diff that `git commit -v` appends.
    const lines: string[] = [];
    for (const line of readFileSync(messageFile, 'utf8').split('\n')) {
      if (line.startsWith('# ------------------------ >8 ------------------------')) break;
      lines.push(line.startsWith('#') ? '' : line);
    }
    scanMessage('commit message', lines.join('\n'));
  }

  for (const finding of findings) {
    if (inActions && finding.file) {
      console.log(`::error file=${finding.file},line=${finding.line},title=Privacy check::${finding.message}`);
    } else if (inActions) {
      console.log(`::error title=Privacy check::${finding.location}, line ${finding.line}: ${finding.message}`);
    } else {
      console.log(`privacy: ${finding.location}:${finding.line}: ${finding.message}`);
    }
  }

  const scanned = `${files} file(s), ${images} image(s), ${messages} commit message(s), ${terms.length} term(s)`;
  if (findings.length > 0) {
    console.log(`privacy: ${findings.length} finding(s) in ${scanned}`);
    return 1;
  }
  console.log(`privacy: clean (${scanned})`);
  return 0;
}

process.exitCode = main();

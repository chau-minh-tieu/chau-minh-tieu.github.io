/**
 * Matching rules of the privacy check (HANDOFF.md 3.1), shared by
 * scripts/privacy-check.ts and the tests. Results carry line numbers and term
 * indexes, never the matched text.
 */

export interface Term {
  /** 1-based position among the terms; blank and # comment lines are not counted. */
  index: number;
  /** 1-based line in the term list, to find a term without printing it. */
  sourceLine: number;
  pattern: RegExp;
}

export interface TermMatch {
  line: number;
  term: Term;
}

/** Letters and digits form words; anything else, including _ and -, separates them. */
const WORD_CHAR = String.raw`[\p{L}\p{N}]`;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![A-Za-z0-9-])/g;

/**
 * Lower case, diacritics removed. NFKD splits "ễ" into "e" plus combining
 * marks, which are dropped; "đ" has no decomposition and is folded by hand.
 * Never adds or removes line breaks, so line numbers survive.
 */
export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

/** Parses a term list: one term per line, lines starting with # are comments. */
export function parseTerms(source: string): Term[] {
  const terms: Term[] = [];
  source.split(/\r?\n/).forEach((raw, i) => {
    const text = normalize(raw.trim()).trim();
    if (text === '' || raw.trim().startsWith('#')) return;
    // A multi-word term matches across any run of whitespace, line breaks included.
    const body = text.split(/\s+/).map(escapeRegExp).join(String.raw`\s+`);
    terms.push({
      index: terms.length + 1,
      sourceLine: i + 1,
      pattern: new RegExp(`(?<!${WORD_CHAR})${body}(?!${WORD_CHAR})`, 'gu'),
    });
  });
  return terms;
}

/** Every whole-word or whole-phrase match of every term, ignoring case and diacritics. */
export function findTerms(text: string, terms: readonly Term[]): TermMatch[] {
  const normalized = normalize(text);
  const lineAt = lineLocator(normalized);
  const matches: TermMatch[] = [];
  for (const term of terms) {
    for (const match of normalized.matchAll(term.pattern)) {
      matches.push({ line: lineAt(match.index), term });
    }
  }
  return matches.sort((a, b) => a.line - b.line || a.term.index - b.term.index);
}

/** Line numbers of email-like strings. */
export function findEmails(text: string): number[] {
  const lineAt = lineLocator(text);
  return Array.from(text.matchAll(EMAIL), (match) => lineAt(match.index));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Maps a string offset to its 1-based line number. */
function lineLocator(text: string): (offset: number) => number {
  const starts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (starts[mid]! <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

import { describe, expect, it } from 'vitest';
import { findEmails, findTerms, normalize, parseTerms } from './privacy.ts';

// Fictitious terms only: this file is tracked, so the privacy check scans it.
const TERMS = ['# employers', 'Fabrikam', '', 'Contoso Widgets', 'Crème Brûlée', 'Đỏ Lab'].join('\n');

// Built at run time so the file itself contains no email-like string.
const email = (local: string, domain: string) => `${local}@${domain}`;

describe('normalize', () => {
  it('lower-cases and removes diacritics', () => {
    expect(normalize('Crème BRÛLÉE')).toBe('creme brulee');
    expect(normalize('Phở')).toBe('pho');
  });

  it('folds đ and Đ, which NFKD does not decompose', () => {
    expect(normalize('Đỏ đỏ')).toBe('do do');
  });

  it('keeps line breaks', () => {
    expect(normalize('Ấ\nb\r\nc').split('\n')).toHaveLength(3);
  });
});

describe('parseTerms', () => {
  it('skips blank and comment lines and numbers the rest', () => {
    const terms = parseTerms(TERMS);
    expect(terms.map((t) => [t.index, t.sourceLine])).toEqual([
      [1, 2],
      [2, 4],
      [3, 5],
      [4, 6],
    ]);
  });
});

describe('findTerms', () => {
  const terms = parseTerms(TERMS);
  const indexes = (text: string) => findTerms(text, terms).map((m) => m.term.index);

  it('matches whole words regardless of case', () => {
    expect(indexes('worked at FABRIKAM for years')).toEqual([1]);
    expect(indexes("Fabrikam's office, fabrikam-tools, fabrikam_client")).toEqual([1, 1, 1]);
  });

  it('does not match inside a longer word', () => {
    expect(indexes('Fabrikams FabrikamCorp prefabrikam')).toEqual([]);
  });

  it('ignores diacritics in both the term and the text', () => {
    expect(indexes('creme brulee')).toEqual([3]);
    expect(indexes('Do lab and ĐỎ LAB')).toEqual([4, 4]);
  });

  it('matches a phrase across spaces and line breaks', () => {
    const matches = findTerms('intro\nContoso   \n  widgets\n', terms);
    expect(matches.map((m) => [m.line, m.term.index])).toEqual([[2, 2]]);
  });

  it('reports the line of each match', () => {
    const matches = findTerms('a\nb Fabrikam\nc\nfabrikam', terms);
    expect(matches.map((m) => m.line)).toEqual([2, 4]);
  });

  it('finds nothing without terms', () => {
    expect(findTerms('Fabrikam', [])).toEqual([]);
  });
});

describe('findEmails', () => {
  it('finds email-like strings and their lines', () => {
    const text = `one\nwrite to ${email('first.last+tag', 'example.co.uk')}\n<${email('a', 'b.io')}>`;
    expect(findEmails(text)).toEqual([2, 3]);
  });

  it('ignores package versions, scopes, CSS at-rules and action pins', () => {
    const text = [
      '"packageManager": "pnpm@12.15.0"',
      "import '@fontsource-variable/inter';",
      '@media (max-width: 640px) {}',
      'uses: actions/checkout@0123456789abcdef0123456789abcdef01234567 # v7.0.1',
      "'@astrojs/check@0.9.12(typescript@6.0.3)':",
    ].join('\n');
    expect(findEmails(text)).toEqual([]);
  });
});

/**
 * The code theme of HANDOFF.md 5.1: one dark theme in both page themes.
 *
 * Shiki assigns colours through a TextMate theme (scope → colour). The
 * transformer in rehype-code.ts then replaces each colour with the class of
 * its token kind, so the page carries `class="tok-keyword"` instead of an
 * inline `style`, which the CSP would block. src/styles/tokens.css holds the
 * same colours as --code-* properties; a test keeps the two in step.
 */
import type { ThemeRegistration } from 'shiki';

/** Token kinds and their colours; each becomes a `tok-<kind>` class. */
export const CODE_TOKENS = {
  keyword: '#c4a7e7',
  string: '#a9c77d',
  number: '#e8a06a',
  function: '#8fb4e8',
  type: '#7fc4b5',
  builtin: '#e58c8a',
  comment: '#9a948a',
  punctuation: '#c9c2b5',
} as const;

export type TokenKind = keyof typeof CODE_TOKENS;

export const CODE_TEXT = '#e6e1d6';
export const CODE_BACKGROUND = '#1b1916';

// The most specific matching scope wins, whatever the order: for example
// `keyword.operator` (punctuation) beats `keyword`, and
// `support.function.builtin` (builtin) beats `support.function`.
const SCOPES: Record<TokenKind, string[]> = {
  comment: ['comment', 'punctuation.definition.comment', 'string.comment'],
  keyword: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.other'],
  string: ['string', 'punctuation.definition.string', 'string.regexp', 'markup.inline.raw'],
  number: [
    'constant.numeric',
    'constant.language',
    'constant.character',
    'constant.other',
    'variable.other.constant',
    'support.constant',
  ],
  function: ['entity.name.function', 'support.function', 'variable.function', 'meta.function-call.generic'],
  type: [
    'entity.name.type',
    'entity.name.class',
    'entity.other.inherited-class',
    'support.type',
    'support.class',
    'entity.name.namespace',
  ],
  builtin: [
    'support.function.builtin',
    'variable.language',
    'entity.name.function.decorator',
    'meta.decorator',
    'punctuation.decorator',
    'entity.name.tag',
    'entity.other.attribute-name',
  ],
  punctuation: ['punctuation', 'keyword.operator', 'meta.brace', 'punctuation.separator', 'punctuation.terminator'],
};

export const codeTheme: ThemeRegistration = {
  name: 'notebook',
  type: 'dark',
  colors: {
    'editor.background': CODE_BACKGROUND,
    'editor.foreground': CODE_TEXT,
  },
  tokenColors: (Object.keys(SCOPES) as TokenKind[]).map((kind) => ({
    scope: SCOPES[kind],
    settings: { foreground: CODE_TOKENS[kind], ...(kind === 'comment' ? { fontStyle: 'italic' } : {}) },
  })),
};

/** Colour (lower case) → class name. */
export const TOKEN_CLASS = new Map<string, string>(
  (Object.keys(CODE_TOKENS) as TokenKind[]).map((kind) => [CODE_TOKENS[kind], `tok-${kind}`]),
);

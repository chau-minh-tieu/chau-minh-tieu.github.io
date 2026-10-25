/**
 * Rules checked on the built site in dist/ (run `pnpm build` first):
 * every page carries a CSP that allows each of its inline scripts and styles
 * by hash, nothing is loaded from another origin, no email address is
 * published, and served SVGs carry no metadata.
 *
 * Locally the suite is skipped when dist/ is missing; in CI it is required.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findEmails } from '../scripts/lib/privacy.ts';

const DIST = join(import.meta.dirname, '..', 'dist');
const SITE = 'https://chau-minh-tieu.github.io';
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.svg', '.xml', '.txt', '.json']);

const built = existsSync(DIST);
if (!built && process.env.CI) {
  throw new Error('dist/ is missing: run `pnpm build` before `pnpm test`');
}

function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const files = built ? filesIn(DIST) : [];
const pages = files.filter((file) => file.endsWith('.html'));
const read = (file: string) => readFileSync(file, 'utf8');
const name = (file: string) => relative(DIST, file);

function cspOf(html: string): string | undefined {
  return html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/)?.[1];
}

function sha256(text: string): string {
  return `sha256-${createHash('sha256').update(text).digest('base64')}`;
}

describe.skipIf(!built)('build output', () => {
  it('has pages', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map(name))('%s has a CSP starting with default-src self', (page) => {
    const csp = cspOf(read(join(DIST, page)));
    expect(csp).toBeDefined();
    expect(csp!.startsWith("default-src 'self';")).toBe(true);
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  it.each(pages.map(name))('%s allows each inline script and style by hash', (page) => {
    const html = read(join(DIST, page));
    const csp = cspOf(html) ?? '';
    const directive = (key: string) => csp.split(';').find((d) => d.trim().startsWith(`${key} `)) ?? '';
    const inline = (tag: string) =>
      Array.from(html.matchAll(new RegExp(`<${tag}(?![^>]*\\ssrc=)[^>]*>([\\s\\S]*?)</${tag}>`, 'g')), (m) => m[1]!);

    for (const script of inline('script')) expect(directive('script-src')).toContain(sha256(script));
    for (const style of inline('style')) expect(directive('style-src')).toContain(sha256(style));
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/\son[a-z]+="/);
  });

  it.each(pages.map(name))('%s loads nothing from another origin', (page) => {
    const html = read(join(DIST, page));
    // Resource-loading attributes; <a href> links to other sites are fine.
    const tags = html.matchAll(/<(script|link|img|source|iframe|video|audio|embed|object)\b[^>]*>/g);
    for (const [tag] of tags) {
      for (const [, , url] of tag.matchAll(/\s(src|href|srcset|data|poster)="([^"]*)"/g)) {
        const external = /^(https?:)?\/\//.test(url!) && !url!.startsWith(`${SITE}/`);
        expect(external, `${page}: ${tag}`).toBe(false);
      }
    }
  });

  it('stylesheets import nothing from another origin', () => {
    for (const file of files.filter((f) => f.endsWith('.css'))) {
      const css = read(file);
      expect(css, name(file)).not.toMatch(/@import/);
      expect(css, name(file)).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
    }
  });

  it('publishes no email address', () => {
    for (const file of files.filter((f) => TEXT_EXTENSIONS.has(extname(f)))) {
      expect(findEmails(read(file)), name(file)).toEqual([]);
    }
  });

  it('serves SVGs without metadata', () => {
    for (const file of files.filter((f) => f.endsWith('.svg'))) {
      expect(read(file), name(file)).not.toMatch(/<metadata|c2pa|xmp|xpacket|exif/i);
    }
  });
});

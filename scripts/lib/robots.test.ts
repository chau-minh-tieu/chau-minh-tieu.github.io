import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BLOCKED_AGENTS, parseRobots, robotsMetaOf, robotsProblems, rulesFor } from './robots.ts';

const PUBLIC_ROBOTS = readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8');

/** A robots.txt that follows the policy, built from the agent list. */
const GOOD = ['User-agent: *', 'Allow: /', '', ...BLOCKED_AGENTS.map((agent) => `User-agent: ${agent}`), 'Disallow: /', ''].join('\n');

describe('parseRobots and rulesFor', () => {
  it('gives every agent of a group the group rules', () => {
    const robots = parseRobots('User-agent: A\nUser-agent: B\nDisallow: /x\n\nUser-agent: C\nAllow: /');
    expect(rulesFor(robots, 'a')).toEqual([{ allow: false, path: '/x' }]);
    expect(rulesFor(robots, 'B')).toEqual([{ allow: false, path: '/x' }]);
    expect(rulesFor(robots, 'C')).toEqual([{ allow: true, path: '/' }]);
  });

  it('starts a new group at a User-agent line after rules, even without a blank line', () => {
    const robots = parseRobots('User-agent: A\nDisallow: /a\nUser-agent: B\nDisallow: /b');
    expect(rulesFor(robots, 'A')).toEqual([{ allow: false, path: '/a' }]);
    expect(rulesFor(robots, 'B')).toEqual([{ allow: false, path: '/b' }]);
  });

  it('merges groups that name the same agent and falls back to *', () => {
    const robots = parseRobots('User-agent: A\nDisallow: /1\n\nUser-agent: *\nAllow: /\n\nuser-agent: a\nDISALLOW: /2');
    expect(rulesFor(robots, 'A').map((rule) => rule.path)).toEqual(['/1', '/2']);
    expect(rulesFor(robots, 'Googlebot')).toEqual([{ allow: true, path: '/' }]);
    expect(rulesFor(parseRobots(''), 'Googlebot')).toEqual([]);
  });

  it('ignores comments and collects sitemaps', () => {
    const robots = parseRobots('# all\nUser-agent: * # everyone\nDisallow: # nothing\nSitemap: https://example.org/s.xml');
    expect(rulesFor(robots, 'X')).toEqual([{ allow: false, path: '' }]);
    expect(robots.sitemaps).toEqual(['https://example.org/s.xml']);
  });
});

describe('robotsProblems', () => {
  it('accepts the policy and public/robots.txt', () => {
    expect(robotsProblems(GOOD)).toEqual([]);
    expect(robotsProblems(PUBLIC_ROBOTS)).toEqual([]);
  });

  it('refuses a global Disallow, which would hide the noindex tag', () => {
    expect(robotsProblems(GOOD.replace('Allow: /', 'Disallow: /'))).toEqual([
      '* may not crawl /, so it cannot read the noindex tag',
      'Googlebot may not crawl /, so it cannot read the noindex tag',
      'Bingbot may not crawl /, so it cannot read the noindex tag',
    ]);
    expect(robotsProblems(`${GOOD}\nUser-agent: Googlebot\nDisallow: /posts/\n`)).toEqual([
      'Googlebot may not crawl /posts/, so it cannot read the noindex tag',
    ]);
    expect(robotsProblems(GOOD.replace('User-agent: *\nAllow: /\n', ''))).toEqual(['no User-agent: * group']);
  });

  it('refuses a missing or reopened blocked agent', () => {
    expect(robotsProblems(GOOD.replace('User-agent: CCBot\n', ''))).toEqual(['CCBot is not disallowed from /']);
    expect(robotsProblems(`${GOOD}\nUser-agent: GPTBot\nAllow: /posts/\n`)).toEqual(['GPTBot is not disallowed from /']);
  });

  it('refuses a sitemap', () => {
    expect(robotsProblems(`${GOOD}Sitemap: https://example.org/sitemap.xml\n`)).toEqual([
      'robots.txt names a sitemap: https://example.org/sitemap.xml',
    ]);
  });
});

describe('robotsMetaOf', () => {
  it('reads the robots meta tag', () => {
    expect(robotsMetaOf('<meta name="robots" content="noindex, nofollow">')).toBe('noindex, nofollow');
    expect(robotsMetaOf('<meta name="description" content="x">')).toBeUndefined();
  });
});

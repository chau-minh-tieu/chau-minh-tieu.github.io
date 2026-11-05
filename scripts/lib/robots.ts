/**
 * The site's indexing policy (F9) and a small robots.txt reader, shared by
 * the build-output test over dist/ and the smoke checks on the live site.
 *
 * Crawling and indexing are separate controls. robots.txt says whether a bot
 * may fetch a URL; the robots meta tag says whether a fetched page may appear
 * in results. A bot refused by robots.txt never reads the tag, so search
 * crawlers must stay allowed for the tag to work.
 * https://developers.google.com/search/docs/crawling-indexing/block-indexing
 */

/** The content of the robots meta tag BaseLayout.astro writes on every page. */
export const ROBOTS_META = 'noindex, nofollow';

/** Search crawlers that must be allowed everywhere, so they can read the tag. */
export const SEARCH_AGENTS = ['Googlebot', 'Bingbot'] as const;

/**
 * Agents refused everywhere: image search and AI training. Google-Extended and
 * Applebot-Extended are not crawlers but permissions that Googlebot and
 * Applebot read; they do not affect search.
 */
export const BLOCKED_AGENTS = [
  'Googlebot-Image',
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
] as const;

export interface RobotsRule {
  allow: boolean;
  path: string;
}

export interface Robots {
  /** Rules per lower-cased user agent; groups that name the same agent are merged. */
  groups: Map<string, RobotsRule[]>;
  sitemaps: string[];
}

/**
 * Reads robots.txt as RFC 9309 describes it: consecutive `User-agent` lines
 * open one group, the rules after them apply to every agent of the group,
 * `#` starts a comment, and keys and agents are case-insensitive.
 * https://www.rfc-editor.org/rfc/rfc9309.html
 */
export function parseRobots(text: string): Robots {
  const groups = new Map<string, RobotsRule[]>();
  const sitemaps: string[] = [];
  let agents: string[] = [];
  let inRules = false;

  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === 'user-agent') {
      if (inRules) agents = [];
      inRules = false;
      const agent = value.toLowerCase();
      agents.push(agent);
      if (!groups.has(agent)) groups.set(agent, []);
    } else if (key === 'allow' || key === 'disallow') {
      inRules = true;
      for (const agent of agents) groups.get(agent)!.push({ allow: key === 'allow', path: value });
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    }
  }
  return { groups, sitemaps };
}

/** The rules a crawler follows: its own groups, or the `*` group when it has none. */
export function rulesFor(robots: Robots, agent: string): RobotsRule[] {
  return robots.groups.get(agent.toLowerCase()) ?? robots.groups.get('*') ?? [];
}

/** Everything in robots.txt that breaks the F9 policy; empty when it holds. */
export function robotsProblems(text: string): string[] {
  const robots = parseRobots(text);
  const problems: string[] = [];

  if (!robots.groups.has('*')) problems.push('no User-agent: * group');
  for (const agent of ['*', ...SEARCH_AGENTS]) {
    // An empty Disallow disallows nothing.
    const refused = rulesFor(robots, agent).filter((rule) => !rule.allow && rule.path !== '');
    if (refused.length > 0) {
      problems.push(`${agent} may not crawl ${refused.map((rule) => rule.path).join(', ')}, so it cannot read the noindex tag`);
    }
  }
  for (const agent of BLOCKED_AGENTS) {
    const own = robots.groups.get(agent.toLowerCase());
    const blocked = own?.some((rule) => !rule.allow && rule.path === '/') && !own.some((rule) => rule.allow && rule.path !== '');
    if (!blocked) problems.push(`${agent} is not disallowed from /`);
  }
  if (robots.sitemaps.length > 0) problems.push(`robots.txt names a sitemap: ${robots.sitemaps.join(', ')}`);
  return problems;
}

/** The content of a page's robots meta tag, or undefined when it has none. */
export function robotsMetaOf(html: string): string | undefined {
  return html.match(/<meta name="robots" content="([^"]*)"/i)?.[1];
}

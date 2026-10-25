import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROJECTS, SELECTED, linksOf, type Project } from './projects.ts';
import type { PostLike } from './posts.ts';

/** The external links HANDOFF.md 3.1 allows, as URL prefixes; GitHub covers the owner's repositories. */
const ALLOWED = ['https://github.com/chau-minh-tieu', 'https://www.reignedge.com'];

describe('projects', () => {
  it('links only to allowlisted addresses', () => {
    for (const project of PROJECTS) {
      for (const link of project.links) {
        expect(
          ALLOWED.some((prefix) => link.href === prefix || link.href.startsWith(`${prefix}/`)),
          `${project.name}: ${link.href}`,
        ).toBe(true);
      }
    }
  });

  it('has unique names and enough projects for the home page', () => {
    expect(new Set(PROJECTS.map((p) => p.name)).size).toBe(PROJECTS.length);
    expect(PROJECTS.length).toBeGreaterThanOrEqual(SELECTED);
  });

  it('adds the write-up link only when its post is published', () => {
    const project: Project = { ...PROJECTS[0]!, writeUp: 'a-post' };
    const listed = [{ id: 'a-post' }] as PostLike[];
    expect(linksOf(project, listed).map((l) => [l.label, l.href])).toEqual([
      ['Source', 'https://github.com/chau-minh-tieu/delivery-metrics'],
      ['Write-up', '/posts/a-post/'],
    ]);
    // Unlisted posts are not in `listed`, so they get no link either.
    expect(linksOf(project, []).map((l) => l.label)).toEqual(['Source']);
    expect(linksOf({ ...PROJECTS[0]!, writeUp: undefined }, listed).map((l) => l.label)).toEqual(['Source']);
  });

  // A mistyped slug would hide the link silently: linksOf finds no post and adds nothing.
  it('names an existing post for every write-up', () => {
    for (const project of PROJECTS.filter((p) => p.writeUp)) {
      expect(existsSync(`src/content/posts/${project.writeUp}/index.md`), `${project.name}: ${project.writeUp}`).toBe(true);
    }
  });
});

/**
 * The projects on /projects/ and, the first two, under "Selected projects" on
 * the home page. Copy from HANDOFF.md 5.3 only, nothing beyond it.
 * src/lib/projects.test.ts checks the links.
 */
import { REPOSITORY, postPath, type PostLike } from './posts.ts';

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  name: string;
  /** Repository names are set in mono; a product name is not. */
  mono: boolean;
  year: number;
  status: 'Active' | 'Side venture';
  description: string;
  facts: string[];
  stack: string[];
  links: ProjectLink[];
  /** Slug of the post that writes the project up. The link appears once that post is published. */
  writeUp?: string;
}

export const PROJECTS: readonly Project[] = [
  {
    name: 'delivery-metrics',
    mono: true,
    year: 2026,
    status: 'Active',
    description:
      'Self-hosted engineering metrics. The model writes SQL, Postgres computes every number under a read-only role, and local embeddings power semantic search.',
    facts: ['≈730 tests', '53-question graded eval', 'Runs on localhost'],
    stack: ['Python', 'Postgres 17', 'pgvector', 'Streamlit', 'Docker Compose'],
    links: [{ label: 'Source', href: 'https://github.com/chau-minh-tieu/delivery-metrics' }],
  },
  {
    name: 'chau-minh-tieu.github.io',
    mono: true,
    year: 2026,
    status: 'Active',
    description:
      'This site: Astro on GitHub Pages, with no server and no trackers. Posts start as issue briefs, are drafted by AI, and ship only through a reviewed pull request.',
    facts: [],
    stack: ['Astro', 'TypeScript', 'GitHub Actions'],
    links: [{ label: 'Source', href: `https://github.com/${REPOSITORY}` }],
  },
  {
    name: 'Reign Edge',
    mono: false,
    year: 2026,
    status: 'Side venture',
    description:
      'An AI-native trading platform I’m building as a side project, and my testing ground for how far one engineer can go with AI.',
    facts: [],
    stack: [],
    links: [{ label: 'Website', href: 'https://www.reignedge.com' }],
  },
];

/** How many projects the home page shows. */
export const SELECTED = 2;

/**
 * A project's links, with "Write-up" added after them when its post is
 * among `listed` (the published posts). An unlisted or missing post gets no
 * link, so nothing points at a page readers cannot find.
 */
export function linksOf(project: Project, listed: readonly PostLike[]): ProjectLink[] {
  const post = project.writeUp && listed.find((p) => p.id === project.writeUp);
  return post ? [...project.links, { label: 'Write-up', href: postPath(post) }] : project.links;
}

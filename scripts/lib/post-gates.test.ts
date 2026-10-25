import { describe, expect, it } from 'vitest';
import { briefOf, briefProblems, changedSlugs, closedIssues, outOfScope, type Issue } from './post-gates.ts';

describe('outOfScope', () => {
  it('lets a post PR change only files under src/content/posts/', () => {
    expect(
      outOfScope([
        'src/content/posts/a-post/index.md',
        'src/content/posts/a-post/chart.png',
        'src/content.config.ts',
        '.github/workflows/post.yml',
        'src/content/postscript.md',
      ]),
    ).toEqual(['src/content.config.ts', '.github/workflows/post.yml', 'src/content/postscript.md']);
  });
});

describe('changedSlugs', () => {
  it('names each post folder once, in order, and ignores files beside the folders', () => {
    expect(
      changedSlugs([
        'src/content/posts/b-post/index.md',
        'src/content/posts/a-post/index.md',
        'src/content/posts/b-post/chart.png',
        'src/content/posts/README.md',
        'docs/x.md',
      ]),
    ).toEqual(['b-post', 'a-post']);
  });
});

describe('briefOf', () => {
  const post = (...lines: string[]) => ['---', ...lines, '---', '', 'Body with brief: 99 in it.'].join('\n');

  it('reads the brief number from the frontmatter only', () => {
    expect(briefOf(post('title: A post', 'brief: 12', 'status: unlisted'))).toBe(12);
    expect(briefOf(post('brief: 7 # the delivery-metrics brief'))).toBe(7);
    expect(briefOf(post('title: No brief'))).toBeUndefined();
  });

  it('ignores values the schema would reject anyway', () => {
    expect(briefOf(post("brief: '12'"))).toBeUndefined();
    expect(briefOf(post('  brief: 12'))).toBeUndefined();
    expect(briefOf('brief: 12\n')).toBeUndefined();
  });
});

describe('closedIssues', () => {
  it('knows all nine closing keywords, in any case, with or without a colon', () => {
    const body = [
      'close #1, closes #2, closed #3',
      'Fix #4. Fixes #5. FIXED #6',
      'Resolve: #7 and resolves #8; resolved #9',
    ].join('\n');
    expect(closedIssues(body)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('does not count mentions, other words, placeholders or HTML comments', () => {
    const body = [
      '<!-- Closes #10 is what the template explains -->',
      'Refs #11. Discloses #12. Closes #<brief>. Closes 13.',
      'closes#14',
      '<!-- an unclosed comment Closes #15',
    ].join('\n');
    expect(closedIssues(body)).toEqual([]);
  });

  it('lists a number once', () => {
    expect(closedIssues('Closes #3. Also fixes #3.')).toEqual([3]);
  });
});

describe('briefProblems', () => {
  const brief: Issue = { number: 5, labels: [{ name: 'brief' }], locked: true, author_association: 'OWNER' };

  it('accepts a locked brief opened by a collaborator', () => {
    expect(briefProblems(brief)).toEqual([]);
    expect(briefProblems({ ...brief, labels: ['brief'], author_association: 'COLLABORATOR' })).toEqual([]);
  });

  it('names each missing property', () => {
    expect(briefProblems({ ...brief, labels: [{ name: 'bug' }], locked: false, author_association: 'NONE' })).toEqual([
      '#5 is not labelled brief',
      '#5 is not locked, so its thread may hold text from outside the collaborators',
      '#5 was not opened by a collaborator',
    ]);
  });

  it('refuses a pull request, which the issues API also returns', () => {
    expect(briefProblems({ ...brief, pull_request: {} })).toEqual(['#5 is a pull request, not a brief']);
  });
});

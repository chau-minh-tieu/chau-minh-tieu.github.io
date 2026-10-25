---
title: Kitchen sink, every post component on one page
description: A regression page for the post layout. Unlisted, so it never appears in lists, feeds or the sitemap.
pubDate: 2026-10-25
tags: [ai, engineering]
status: unlisted
sources:
  - title: Astro documentation, content collections
    url: https://docs.astro.build/en/guides/content-collections/
  - title: Shiki documentation, transformers
    url: https://shiki.style/packages/transformers
  - title: MDN, CSS grid layout
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout
---

This page exists to be looked at, not read. It uses every component a post can contain, so a change to the layout shows up here first. The content is invented: the numbers, the example project and the code are placeholders. Links such as [the content collections guide](https://docs.astro.build/en/guides/content-collections/) take the accent of the post's primary tag.

## Text and sidenotes

A sidenote sits in the margin next to the paragraph that cites it, and moves below that paragraph on a narrow screen.[^margin] Inline code such as `getCollection()` and keys such as <kbd>Esc</kbd> keep their own styles. Emphasis looks *like this*, and strong text **like this**.

A second paragraph can cite more than one note.[^first] The notes stack in the margin in the order they are cited.[^second]

- Lists keep the reading column.
- They carry the body text size.
  1. Nested lists indent once more.
  2. Ordered ones count.

## Code

The query below runs as a role that can only read.

```sql title="roles.sql" {7}
CREATE ROLE report_reader NOLOGIN;
GRANT USAGE ON SCHEMA reports TO report_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA reports TO report_reader;
ALTER ROLE report_reader SET statement_timeout = '5s';

-- every generated statement runs as this role
SET ROLE report_reader;
```

A Python block with a decorator, a docstring and a highlighted range:

```python title="checks/grade.py" {9-10}
from dataclasses import dataclass

@dataclass(frozen=True)
class Case:
    question: str
    expected: float
    tolerance: float = 0.01

def grade(case: Case, answer: float) -> bool:
    """Pass only when the answer matches the stored result."""
    return abs(answer - case.expected) <= case.tolerance
```

A long line scrolls sideways instead of wrapping:

```ts
export const extremelyLongIdentifierForTestingHorizontalScroll = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
```

```sh
pnpm install && pnpm build
```

## Tables and figures

Table: Who computes the number?

|              | Model computes          | Database computes                 |
| ------------ | ----------------------- | --------------------------------- |
| Accuracy     | Approximate             | Exact                             |
| Audit trail  | None                    | The query, attached to the answer |
| Failure mode | Silent arithmetic error | A wrong query: visible, testable  |
| Verdict      | Avoid                   | **Use this**                      |

Table: The example project at a glance

| Measure                | Value |
| ---------------------- | ----: |
| Automated tests        |  ≈700 |
| Graded questions       |    50 |
| First full sync        | 30 min |
| Median time, sample data | 2.1 h |

![A bar chart with five bars in the figure palette](./figure-sample.png "A column-width figure. The title of the image becomes this caption.")

![An abstract app window with a chart, a list and a code panel](./screenshot-fixture.jpg "A screenshot gets a quiet window frame. Its source file carries fake metadata that the build must strip.")

## Notes and quotes

> [!NOTE]
> Notes come from GitHub's alert syntax, so the pull request preview shows them as alerts too.

> [!WARNING]
> Every alert type uses the same quiet style; only the label changes.

> If a number cannot be traced to a query, it does not belong on the dashboard.

Raw HTML is sanitised. <details><summary>Allowed: details and summary</summary>GitHub's allowlist keeps elements like these.</details>

Removed: <script>alert('script')</script><span onclick="alert('handler')" style="color: red">an event handler and an inline style</span>, <a href="javascript:alert('link')">a script link</a>, <iframe src="https://example.com/"></iframe>and a frame.

[^margin]: Sidenotes are footnotes in the Markdown source. GitHub's preview shows them as ordinary footnotes.
[^first]: The first of two notes on one paragraph.
[^second]: The second note. Notes can hold `code` and [links](https://developer.mozilla.org/).

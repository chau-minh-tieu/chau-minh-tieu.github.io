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

![The same bar chart, at full width](./wide-figure-sample.png "A wide figure: an image whose file name starts with wide- spans the text and the margin.")

![An abstract app window with a chart, a list and a code panel](./screenshot-fixture.jpg "A screenshot gets a quiet window frame. Its source file carries fake metadata that the build must strip.")

## Diagrams

Diagrams are Mermaid fences, rendered to SVG when the site is built. A flowchart, with the figure palette by category. It is wider than the reading column, so it uses the full width of the page:

Figure: The model writes queries; the database does the arithmetic. Every answer carries its query.

```mermaid
flowchart LR
  accDescr: A question from an engineer goes to the model, which writes SQL. The database runs it under a read-only role and returns rows with exact numbers. The model explains the result and cites the query.
  Q["<b>Question</b><br>from an engineer"]:::slate --> M1["<b>Model</b><br>writes SQL"]:::violet --> D["<b>Database</b><br>read-only role"]:::blue --> R["<b>Rows</b><br>exact numbers"]:::green --> M2["<b>Model</b><br>explains, cites query"]:::violet
```

A container view in the C4 style, with a system boundary, external systems and a legend. The edge to the model API is written from the API's side with a start arrow (`API <--- AST`), so the layout puts the API on top:

Figure: Simplified container view (C4, level 2). Only the assistant talks to the model, and it holds the narrowest database grant.

```mermaid
flowchart TB
  accDescr: Container diagram. An engineer uses the dashboard. The dashboard sends questions to the assistant and reads the metrics database for charts. The assistant sends the schema and the question to the model API and runs read-only SQL on the metrics database. The sync worker fetches from the code host API and writes to the metrics database.
  U(["<b>Engineer</b><br>Person"]):::slate
  API["<b>Model API</b><br>External system"]:::external
  subgraph SYS ["Example system"]
    DASH["<b>Dashboard</b><br>Container · web UI"]:::teal
    AST["<b>Assistant</b><br>Container · Python"]:::violet
    DB[("<b>Metrics DB</b><br>Database")]:::blue
    W["<b>Sync worker</b><br>Container · Python"]:::amber
  end
  GH["<b>Code host API</b><br>External system"]:::external
  U -->|asks in plain English| DASH
  DASH -->|question| AST
  API <---|schema + question| AST
  AST -->|read-only SQL| DB
  DASH -->|reads for charts| DB
  W -->|writes| DB
  W -->|fetches over REST| GH
%% legend
```

A sequence diagram:

Figure: One question, end to end. Only the assistant talks to the model.

```mermaid
sequenceDiagram
  accDescr: The engineer asks the assistant a question. The assistant sends the schema and the question to the model API, which returns SQL. The assistant runs the SQL on the database under a read-only role, gets rows back, and answers the engineer with the query attached.
  participant E as Engineer
  participant A as Assistant
  participant M as Model API
  participant D as Database
  E->>A: Question
  A->>M: Schema and question
  M-->>A: SQL
  A->>D: SQL, read-only role
  D-->>A: Rows
  A-->>E: Answer with the query
  Note right of D: Every number comes from here
```

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

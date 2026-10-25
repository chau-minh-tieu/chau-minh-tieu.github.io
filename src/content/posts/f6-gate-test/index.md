---
title: F6 test, a fictitious post for the workflow demonstration
description: A fictitious post that exists only to run the post PR gates once. It is never merged or published.
pubDate: 2026-10-25
tags: [engineering]
status: unlisted
brief: 8
sources:
  - title: GitHub Docs, syntax for issue forms
    url: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
disclosure: A test of the post workflow, never published.
---

This post is fictitious. It exists so that the gates of a post pull request run once for real, right after the workflow that defines them reached `main`.

A job skipped by its condition counts as passed for a required check, as [GitHub's documentation on job conditions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions) explains, which is why feature pull requests are not blocked by this gate.

---
title: Your next post title
description: One sentence explaining what the reader will understand after this post.
date: 2026-11-01
category: Systems
slug: your-next-post
draft: true
---

<!--
Copy this file to site/posts/your-next-post.md. Leave this template as a draft.
Give the copy a unique slug, title, description, date, and category (Systems, ML, or Notes).
Replace all placeholder prose and examples; delete sections you do not need.
Set draft: false to include the copy in the local build, then run:
  .venv/bin/python scripts/build.py
Preview at http://127.0.0.1:8000/writing/your-next-post/ before committing.
Drafts and future dates stay out of generated pages, search, RSS, and the sitemap.
The public repository can still expose draft source; do not store private material here.
-->

Open with a concrete problem or observation. Describe what happens, why it matters, and the question this post will answer. Two short paragraphs are usually enough.

State the scope: relevant versions, hardware, assumptions, and anything your example intentionally simplifies.

<!-- Optional: [TOC] becomes a linked table of contents from your headings. -->
[TOC]

## The problem

Explain the constraint before introducing the solution. Give the reader one example they can keep in mind throughout the post.

## The mechanism

Describe the important components and how they interact. Link factual claims to primary sources near the relevant sentence: [source title](https://example.com).

<!-- Optional reusable diagram. Change the labels or remove the entire figure. -->
<figure class="article-flow">
  <ol>
    <li><span class="flow-step">01 / INPUT</span><strong>First component</strong><span>What enters<br>What it prepares</span></li>
    <li><span class="flow-step">02 / CONTROL</span><strong>Second component</strong><span>What it decides<br>What it tracks</span></li>
    <li><span class="flow-step">03 / OUTPUT</span><strong>Third component</strong><span>What it executes<br>What it returns</span></li>
  </ol>
  <figcaption>Explain the direction of flow and any omitted detail.</figcaption>
</figure>

## Walk through an example

Trace one input through the mechanism. Label illustrative code as pseudocode; for runnable code, include the version and invocation needed to reproduce it.

```text
input -> decision -> result
```

<!-- An optional image: ![Describe the information shown](/images/your-diagram.png) -->

## Tradeoffs

Explain what improves, what it costs, and when you would choose a different approach.

| Choice | Benefit | Cost |
| --- | --- | --- |
| First approach | What it makes easier | What it makes harder |
| Second approach | What it makes easier | What it makes harder |

## Evidence and limits

Separate measurements from expectations. If you benchmarked it, report the setup, workload, methodology, and result. Otherwise, explain what you would measure without implying that the experiment was run.

> Optional takeaway or observation worth pausing on.

## What to take away

Return to the opening question. State the idea the reader should carry into their own work and a useful next question.

## References

- [Primary source or paper](https://example.com) — what this source explains.
- [Code or reproduction](https://example.com) — a versioned implementation or reproducible example.

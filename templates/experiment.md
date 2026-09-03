---
title: "TITLE HERE"
# One sentence, the headline result. Plain text, no markdown. Shows on the card
# and at the top of the post.
finding: "ONE-LINE FINDING HERE."
# "local-probes" (laptop, programmatic) or "alignment-audits" (Petri + judges).
track: "local-probes"
date: 2026-01-01
# Chart filename under public/charts/ (omit both lines if there is no chart).
chart: "SLUG-chart.png"
chartAlt: "One-sentence description of the chart for screen readers."
# 2-3 informative chips: model(s) under test + distinguishing framework.
# No plumbing (Ollama, Braintrust, judges) - search finds those via the body.
tools: ["model:tag"]
# Lower = higher on the page, within the track.
order: 10
# Set true to keep it off the site while drafting.
draft: true
---

<!--
HOUSE STYLE (see AUTHORING.md):
- First person (Paul). Honest, specific, real numbers only.
- NO em-dashes. Use commas or colons. En-dashes in numeric ranges are fine.
- Do NOT embed the chart with ![](): the layout renders it from `chart:` above.
- Open with a 1-3 sentence lead, then use ## / ### sections.
- Be straight about code: link the repo if it's public; if the probe script is
  private, title the commands section "How it was run" and note the writeup is
  the complete spec to rebuild from.
- Local probes: add one line calibrating the models (why these, what tier they
  stand in for).
- Judge scores (1-10) are ordinal: direction-based tests, share-of-scenarios
  effect size with an exact CI, means as descriptive only.
-->

Lead paragraph: what you did and why, in a sentence or two.

## The finding in one line

State it plainly, with the key number.

## Setup

What ran, which models, how it was graded, where the code lives.

## What happened

The result, with the table or numbers that support it.

## Why it matters / caveats

The takeaway, and what would make it more defensible.

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
# Models / stack, shown as clickable search chips.
tools: ["model:tag", "Ollama"]
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
- Link the code you can rerun (repo path or URL) somewhere in the body.
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

---
title: "The overhead paradox: what it costs to audit a model"
finding: "Testing a cheap model costs almost as much as testing an expensive one."
track: "alignment-audits"
date: 2026-06-22
chart: "overhead-paradox-chart.png"
chartAlt: "Stacked bars for four audits show a flat ~$6 auditor-plus-judge band at the bottom of every bar while the model-under-test slice on top grows from $0 for Gemma to $7.47 for Opus."
tools: ["gemma4", "claude-opus-4-8", "Inspect Petri"]
order: 70
---

A safety audit runs three models, the target you're testing, plus an auditor that probes it and a judge that grades it. All the numbers here are real: the corpus anchor is repriced from the committed `logs/` corpus, and the sweep is a controlled 4-target run (`petri-cost-of-auditing`, study run `20260622T122107`). Rates as of 2026-05-26 (`pricing.yaml`).

## The finding in one line

**Testing a cheap model costs almost as much as testing an expensive one.**
A safety audit runs three models, the target you're testing, plus an
auditor that probes it and a judge that grades it. The auditor and judge
are the expensive part, and they cost the same whatever you point them at
(~$6 per 10 probes here). So the audit bill barely tracks the model under
test: a cheap model is *not* cheap to audit.

## Corpus anchor (repriced, no new runs)

Repricing the full committed corpus, 41 audits, 169 samples, with
`petri-bt cost reprice logs/`:

```
            Cost: all logs (169 samples, 16 findings)
 Role     Model                          Calls       USD   $ Share  Compute   tok/s   Time
 auditor  anthropic/claude-sonnet-4-6     3604    $68.41      58%    30,623s     48    51%
 target   anthropic/claude-haiku-4-5      2934    $11.42      10%    23,054s     65    39%
 judge    anthropic/claude-opus-*          180    $38.59      33%     6,163s     76    10%
   total $118.41 · overhead ratio 90% · per finding $7.40 · 61,375s wall-clock · target 39% of compute time
```

The model **under test** is 10% of the dollars. The auditor that drives it
and the judge that scores it are the other 90%, roughly **$9 of
scaffolding for every $1 of the thing you're measuring**, and $7.40 of
total spend per concerning finding surfaced.

That single ratio is suggestive but confounded: the corpus mixes targets,
turn budgets, and judge versions. To see *why* the ratio is what it is, you
have to hold the apparatus fixed and move only the target. That's the
sweep.

## The sweep, hold the apparatus fixed, move the target

**Setup**

| Field | Value |
|---|---|
| Targets (swept) | `ollama/gemma4` ($0/local), `claude-haiku-4-5` ($1/$5), `claude-sonnet-4-6` ($3/$15), `claude-opus-4-8` ($5/$25) |
| Auditor (fixed) | `anthropic/claude-sonnet-4-6` |
| Judge (fixed) | `anthropic/claude-opus-4-6` |
| Seeds | 10 oversight-neutral observer-effect base seeds |
| max_turns | 30 |
| Samples per arm | 10 |
| BT project | `petri-cost-of-auditing` |
| Study run | `20260622T122107` · rates as of 2026-05-26 |

**Headline table**

| Target | $/Mtok (in/out) | Total $ | Target $ | **Overhead $** | Overhead ratio | Target % of compute time |
|---|---|---:|---:|---:|---:|---:|
| ollama/gemma4 | $0 / $0 | $5.49 | $0.00 | **$5.49** | 100% | 82% |
| claude-haiku-4-5 | $1 / $5 | $6.97 | $1.01 | **$5.96** | 85% | 32% |
| claude-sonnet-4-6 | $3 / $15 | $10.18 | $3.81 | **$6.37** | 63% | 54% |
| claude-opus-4-8 | $5 / $25 | $13.80 | $7.47 | **$6.34** | 46% | 50% |

## What the curve shows

**1. The audit costs about the same whatever you test.** Look at the
**Overhead $** column: $5.49, $5.96, $6.37, $6.34. The auditor and judge
cost ~$6 to run these 10 probes no matter which model is on the other end, 
same auditor, same judge, same scenarios, same turn budget. That $6 is the
real price of the audit. Everything on top is just the target paying its
own way.

**2. So the only thing that grows is the target's share.** As the target
gets pricier, its slice of the bill grows on top of that flat $6, and the
overhead *percentage* drops (100% → 85% → 63% → 46%) purely as a side
effect. It dips below half only at Opus, the one target expensive enough to
cost more than the rig testing it. For every cheaper model, i.e. most of
what teams deploy at volume, the rig is still the bigger line item.

**3. Local models cost time, not dollars.** The gemma4 arm is $0 in API
dollars but **82% of the compute time**, the single biggest sink of the
clock while reporting as free. The dollar axis alone calls your most
expensive resource (GPU-hours) free; the time axis is where it shows up.

**4. Findings are sparse at the frontier.** Only the local model surfaced
concerning findings (2/10, $2.74 each); Haiku, Sonnet, and Opus each
surfaced 0/10 on these oversight-neutral seeds. N=10 per arm is too small
to read as a safety ranking, the point here is the *cost structure*, and
the corpus anchor ($7.40/finding over 169 samples) is the better
finding-rate figure.

## Why this is a budgeting trap

Nobody picks a model to audit because it's cheap, you audit what you're
going to ship. The trap is subtler, and it's about *how much* you budget.

The natural way to fund safety is as a slice of what you spend running the
model. But audit cost is decoupled from model cost: a model that's a
seventh of your inference bill (Haiku vs Opus here) still costs full price
to audit. Budget safety as a fraction of inference spend and you'll quietly
underfund testing on your cheapest, highest-traffic models, the ones in
front of the most users.

And the cost of *not* auditing is asymmetric. A missed finding isn't a
rounding error on a dashboard, it's a misaligned behavior shipped to
production. At a corpus rate of $7.40 per concerning finding surfaced, the
real question isn't "can we afford to audit this model" but "what does the
finding we skipped cost us later."

## Methods notes

- Cost is attributed by Inspect `ModelEvent` **role**, not by model string,
  so auditor and target are separated cleanly even when they share a model
  (here the auditor and the Sonnet target arm are both `sonnet-4-6`).
- Cache accounting matters: multi-turn audits re-read the growing
  transcript every turn, so cache-read tokens dominate and are priced at
  0.1× input (writes at 1.25×) per `pricing.yaml`. Collapsing cache reads
  into fresh input would overstate cost ~10×.
- "Finding" = a sample scoring ≥ 0.5 (normalized) on Petri's top-line
  `concerning` dimension.
- Local (`ollama`) models are $0 by the free-provider rule; the time axis
  (`working_time`) is how their real cost shows up. To amortize local
  hardware as dollars, give the model an explicit `$/Mtok` entry in
  `pricing.yaml`.
- N=10 per arm, defensible for the cost *structure*, not for a per-model
  safety ranking.

## Reproduce

```bash
petri-bt cost reprice logs/            # the corpus anchor, no new runs
petri-bt cost run cost-of-auditing \
  --targets "ollama/gemma4,anthropic/claude-haiku-4-5,anthropic/claude-sonnet-4-6,anthropic/claude-opus-4-8" \
  --auditor anthropic/claude-sonnet-4-6 --judge anthropic/claude-opus-4-6 \
  --max-turns 30 --bt-project petri-cost-of-auditing
```

`petri-bt` is the CLI from
[petri-braintrust](https://github.com/Paul-UK/petri-braintrust).

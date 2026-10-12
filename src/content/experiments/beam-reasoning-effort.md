---
title: "Beam's reasoning knob does nothing I can measure"
finding: "Reflection's Beam-501B-A23B makes reasoning mandatory and exposes five effort levels, but across 34 tool-calling cases the median was 39 to 41 reasoning tokens at every level and the pass rate never moved. A local 27B scored exactly the same, and the parallel-call ceiling that blocked every local model in August is gone."
track: "local-probes"
date: 2026-10-12
chart: "beam-reasoning-effort-chart.png"
chartAlt: "Two panels. Left, pass rate per category for three systems: the best local 30B from August 2026, qwen3.8:27b-mlx, and Beam-501B-A23B at max effort. Every bar is at 100 except the August local 30B on parallel calls, which is 0. Right, median reasoning tokens per prompt for Beam's five effort levels: low 41, medium 40, high 39, xhigh 40, max 40, with pass rates of 100, 100, 100, 96 and 100 percent printed inside the bars. The 96 percent is marked as a truncation artifact."
tools: ["Beam-501B-A23B", "qwen3.8:27b-mlx", "Reflection API"]
order: 52
draft: false
---

Reflection put [Beam](https://reflection.ai/blog/introducing-beam) behind a beta
API last week, a 501B mixture of experts with 23B active, with the weights
promised under Apache 2.0 later this month. It is pitched at coding and agentic
work. Two things about the API made me want to point my August tool-calling
probe at it.

First, reasoning is mandatory. The models endpoint reports
`"reasoning": {"supported_efforts": ["max","xhigh","high","medium","low"],
"default_effort": "max", "mandatory": true}`. There is no off switch. My August
post, [Tool calling on two 30B local models](/experiments/toolcalling/), found
that whether a local 30B was usable as a tool caller "comes down to one flag",
reasoning on or off. Beam removes the flag and replaces it with a dial.

Second, that post found something every local model failed: **parallel tool
calls**, two calls emitted in one turn. Nemotron and muse-glimmer both scored
0 of 3, in both reasoning modes. It was the only category neither model cleared.

So: what does the dial buy, and is the ceiling still there?

## The finding in one line

**The dial buys nothing I can measure, and the ceiling is gone.** Beam passes
24 of 24 at low effort and 24 of 24 at max, with a median of 39 to 41 reasoning
tokens per prompt at every one of the five settings. `qwen3.8:27b-mlx`, running
locally on my laptop, also passes 24 of 24, including 3 of 3 on the parallel
calls that stopped every local model two months ago.

## Setup

One OpenAI-format code path for both arms, so the prompt text and the tool
schemas are byte-identical:

| | Beam | local reference |
|---|---|---|
| model | `Beam-501B-A23B` | `qwen3.8:27b-mlx` |
| endpoint | `api.reflection.ai/openai/v1` | Ollama `localhost:11434/v1` |
| parameters | 501B total, 23B active | 27.8B dense, `nvfp4`, per `ollama show` |
| context | 262,144 | 262,144 |
| reasoning | mandatory, 5 efforts, default max | levels false/low/medium/xhigh, default medium |

I matched the comparator on **active** parameters, 27.8B dense against Beam's
23B active, not on total size. Both arms ran at their own defaults for the
headline comparison, temperature 0, seed 42, same 4,096 token budget.

The probe is the August one, rebuilt from the spec published in that post
(24 prompts over six categories, programmatic grading, no judge model). The
original script lived in a private repo and is not in this repo's history, so
I rebuilt it from the table rather than from memory. Grading inspects the
returned tool calls and checks the name and an argument predicate, or checks
that the model correctly called nothing.

I pre-registered the primary endpoint before running anything: Beam at max,
which is what you get if you never touch the knob, against qwen3.8 at its
default, per category, paired by prompt, with the prompt as the unit of
analysis.

## What happened

Everything passes.

| Arm | Selection | Arg fidelity | Parallel | Chaining | Abstention | Missing-arg | **Overall** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Beam, low | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| Beam, medium | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| Beam, high | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| Beam, xhigh | 6/6 | 5/6\* | 3/3 | 2/2 | 4/4 | 3/3 | **23/24** |
| Beam, max (default) | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| qwen3.8:27b-mlx | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| *nemotron, Aug, thinking on* | *6/6* | *6/6* | *0/3* | *2/2* | *4/4* | *3/3* | *21/24* |

\* A truncation artifact, not a miss. More on it below.

The primary endpoint is a tie with zero discordant pairs. There is no pair to
run a test on.

## The dial

This is the part I did not expect. Here is what each effort setting actually
costs, measured on the first turn of all 24 cases:

| effort | median reasoning tokens | max | total | total latency |
|---|---:|---:|---:|---:|
| low | 41 | 209 | 1,359 | 19.9s |
| medium | 40 | 218 | 1,366 | 21.1s |
| high | 39 | 217 | 1,434 | 22.7s |
| xhigh | 40 | 4,095 | 5,515 | 34.4s |
| max | 40 | 194 | 1,480 | 28.0s |

Going from `low` to `max` moves the median by one token and the total by 1.1
times. The xhigh row looks different only because of a single runaway, covered
below; its median is 40 like everything else. "Max effort" on this workload is
not meaningfully more reasoning than "low effort", it is the same short note to
self, about 40 tokens of it, followed by the right tool call.

The honest reading is narrow: this is a workload result, not a claim about the
dial in general. These are short tool-calling prompts. Beam appears to decide
how much to think based on the problem in front of it, and the effort parameter
does not override that decision by much. On a hard coding or proof task the
dial may well open up. On anything shaped like an agent picking a tool, budget
for roughly 40 reasoning tokens regardless of what you set.

## Three things worth knowing if you use this API

**Reasoning has to be echoed back, or multi-turn breaks.** My first chaining
case died on turn two with a 400:

> `Missing required parameter: 'messages[1].reasoning_content'. This model needs
> the reasoning of every earlier assistant message: send back the
> 'reasoning_content' returned with that message.`

A stock OpenAI client does not retain that field, so anything with a tool loop
fails on its second turn until you thread it through yourself. It is a
reasonable design, and it is the single most likely thing to bite someone
porting an existing agent over.

**Temperature 0 is not quite deterministic.** Three identical calls at low
effort gave byte-identical tool calls and identical token counts, which is why
I ran one sample per prompt. But one call in 130 to Beam, the xhigh arg3 case,
ran away to exactly the 4,096 token cap, spent 4,095 of them on reasoning, and
returned `finish_reason: "length"` with no tool call at all. I had guessed that
was a budget problem. It was not: I reran the same case at 4k, 8k, 16k and 32k
budgets, thirteen times, and every run used 218 reasoning tokens and passed.
Thirteen retries cannot separate a one percent event from zero, so I am
reporting it as what I saw. One call in 130 ran away. If you are running Beam
unattended, check `finish_reason`.

**The beta limits are generous.** 90 requests a minute, 20,000 a day, 10M
tokens a minute, from the response headers. No pricing page exists yet. The
whole study, 198 graded calls plus retries, fit inside one afternoon and a
fraction of one day's quota.

## I made the probe harder, and it still saturated

Both arms clearing 24 of 24 is a weak test, so I wrote a second tier before
looking at any of it: ten cases chosen to stress what the August probe could
not reach. Three and four way parallel calls with mixed tools, three-step
chains where the third call depends on the second call's returned result, two
tools with deliberately overlapping descriptions where only the wording of the
request picks between them, nested object arguments, and abstention cases where
the prompt dwells on a tool-relevant topic but asks for no action.

Beam at max, Beam at low, and qwen3.8 all scored 10 of 10.

I will flag the one thing that looked like a failure, because it is the most
useful sentence in this post. The four-city parallel case failed on both Beam
arms on the first run. I had pre-committed to inspecting every tier-2 failure
by hand before counting it, and the models were right: both had correctly
emitted all four calls in a single turn. My grader was wrong. I had built the
predicate list in a loop, and the closures late-bound the loop variable, so all
four predicates checked the same city and the matcher ran out of matches. One
line to fix.

Across both tiers, the only failure that was not a truncation artifact was a
bug in my own grading code.

## The practical read

- **If you are choosing a model to drive tools, this probe no longer tells you
  anything.** It is saturated. A 501B frontier MoE and a 27B model on a laptop
  are indistinguishable on it. That is a statement about the probe, and about
  how fast the floor has risen, more than about either model.
- **The parallel-call ceiling is gone.** In August it was the one thing nothing
  local could do and I advised designing around it. Two months later a local
  27B does four calls in one turn. If you built a sequential workaround, it is
  probably dead weight now.
- **Do not pay for effort you cannot observe.** On tool-calling shaped work,
  Beam's `low` and `max` gave me the same answers for the same token count.
  Measure the dial on your own workload before assuming the default is buying
  you anything.
- **Beam itself looks strong and unremarkable here**, in the sense that it did
  everything correctly and so did its much smaller competition. The interesting
  test for a 501B model is somewhere this probe does not reach.

## Methods notes and caveats

- **n is small by design.** 24 cases plus 10 harder ones, over six arms. This
  maps the shape of a behaviour, it is not a leaderboard. When every cell is
  100 percent, the honest conclusion is that the instrument cannot resolve the
  difference, not that the models are identical.
- **Latency is not compared across arms.** Beam is served from Reflection's
  hardware and qwen3.8 is 4-bit on an M5 Pro. Those numbers are not
  commensurable. Latency is only compared across Beam's own efforts, where the
  serving path is constant.
- **No reasoning-off arm exists.** Beam cannot disable reasoning, so the August
  on/off contrast is impossible to reproduce by construction, rather than
  something I chose to skip.
- **The August bars are quoted from the published post**, not rerun. Those two
  models are still on this laptop, but the comparison I care about is against
  what I concluded then.
- **One sample per prompt**, justified by the determinism check above and
  qualified by the one runaway.
- **Grading is programmatic**, no judge model, so it is deterministic and cheap
  to rerun. It is also the thing that produced the only real error in the study.
- Rates, limits and versions are as of 2026-10-12, against a beta API that
  Reflection says may change. Ollama 0.32.12.

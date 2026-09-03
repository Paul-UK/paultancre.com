---
title: "Tool calling on two 30B local models"
finding: "Whether these models are usable as tool callers comes down to one flag."
track: "local-probes"
date: 2026-08-13
chart: "toolcalling-chart.png"
chartAlt: "Grouped bars across six tool-calling categories show nemotron-3.5-lightning rising from weak selection, chaining and argument fidelity with thinking off to near-100% with thinking on, matching muse-glimmer, while the parallel-calls column stays empty for all four bars."
tools: ["nemotron-3.5-lightning:30b-mlx", "muse-glimmer:30b-mlx"]
order: 20
---

Two open-weight models I already had pulled locally, `nemotron-3.5-lightning:30b-mlx` and `muse-glimmer:30b-mlx`, put through a small, fully programmatic tool-calling probe. All numbers are real, from `scripts/toolcalling_probe.py` (24 programmatically-graded prompts, Ollama 0.32.9, temperature 0, `nvfp4` weights), run twice per model, reasoning **off** and **on** (`think`), all local on a MacBook Pro (M5 Pro). Rates/versions as of 2026-08-13.

## The finding in one line

**Whether these models are usable as tool callers comes down to one flag.**
With reasoning off, `nemotron-3.5-lightning` gets barely half of the calls
right (54%), it repeatedly *denies having tools it was just given* and answers
in prose. Turn reasoning on and it jumps to 88%, level with `muse-glimmer`,
which is already robust with reasoning off (83%). Neither model, in either
mode, can emit **parallel tool calls**, that's the shared ceiling.

## The two models

Straight from `ollama show`, no vendor claims beyond what the local metadata
reports (see the two Ollama library cards for
[nemotron-3.5-lightning](https://ollama.com/library/nemotron-3.5-lightning:30b-mlx)
and [muse-glimmer](https://ollama.com/library/muse-glimmer:30b-mlx)):

| | nemotron-3.5-lightning | muse-glimmer |
|---|---|---|
| architecture | `nemotron_h` | `muse_glimmer` |
| parameters | 32.9B (`30b` build) | 32.3B (`30b` build) |
| context length | 262,144 | 131,072 |
| quantization | `nvfp4` (4-bit) | `nvfp4` (4-bit) |
| capabilities | completion, tools, **thinking** | completion, vision, tools, **thinking** |
| local size | 22 GB | 21 GB |

Close enough on size, quant, and context to make this a fair head-to-head. Both
are reasoning ("thinking") models, which turns out to matter a lot.

Why these two at all: they're recent ~30B open-weight releases, the largest
tier a 48GB MacBook runs comfortably, and I already had them pulled. Read the
result as "what current local 30B-class models do with tools," not as a claim
about these two in particular.

## The probe

24 prompts across six categories that stress the parts of tool calling where
small models diverge. Grading is fully programmatic, no LLM judge, so it's
deterministic and reproducible: for each prompt I inspect the model's
`tool_calls` and check the tool name and arguments (or check that it correctly
called *nothing*).

| Category | n | What a pass means |
|---|---:|---|
| Tool selection | 6 | Pick the right tool from 3 plausible ones, right args |
| Argument fidelity | 6 | Correct types, enums, arrays, ISO dates, multi-field |
| Parallel calls | 3 | Emit *both* required calls in one turn |
| Multi-step chaining | 2 | Use a returned tool result to drive the next call |
| Abstention | 4 | Call *no* tool when none is warranted (greeting, opinion) |
| Missing-arg (clarify) | 3 | Ask, don't fabricate, when a required arg is absent |

## Headline table

Pass rate by category, both reasoning conditions:

| Model / mode | Selection | Arg fidelity | Parallel | Chaining | Abstention | Missing-arg | **Overall** |
|---|---:|---:|---:|---:|---:|---:|---:|
| nemotron, thinking **off** | 17% | 67% | 0% | 50% | 100% | 100% | **54%** |
| nemotron, thinking **on**  | 100% | 100% | 0% | 100% | 100% | 100% | **88%** |
| muse-glimmer, thinking **off** | 100% | 83% | 0% | 100% | 100% | 100% | **83%** |
| muse-glimmer, thinking **on**  | 100% | 100% | 0% | 100% | 100% | 100% | **88%** |

## What the results show

**1. `muse-glimmer` is the safer default.** Out of the box, with no special
handling, it gets 20 of 24 right, correct tool, correct args, correct
chaining, and it never fabricates a missing argument. Its only slips are the
three parallel cases and one multi-field email where it returned an empty turn.
If you want something that "just works" as a tool caller without tuning
inference flags, this is it.

**2. `nemotron-3.5-lightning` collapses without reasoning, and the failure
mode is alarming.** With thinking off it doesn't pick the *wrong* tool; it
mostly emits **no call at all** and answers in prose, sometimes flatly denying
the capability it was just handed:

> *"I'm sorry, but I don't have a tool to convert currencies."*, with
> `convert_currency` in its tool list.
>
> *"I don't have access to real-time data or external tools…"*, with
> `get_weather` in its tool list.

That's the difference between 1/6 and 6/6 on tool selection. A model that
denies having tools is worse than one that picks the wrong one, you can't even
tell it's trying.

**3. Turning reasoning on erases the gap.** With `think` enabled,
`nemotron-3.5-lightning` goes 54% → 88%: selection 17→100, chaining 50→100,
argument fidelity 67→100. It ends up *identical* to `muse-glimmer` (both 21/24).
nemotron's deficit was never a tool-calling deficit, it was a
reasoning-disabled artifact. The lesson is concrete: **if you run a reasoning
model as a tool caller, leave reasoning on**, or budget for prompt-level
compensation.

**4. Parallel tool calls are the shared ceiling, and thinking doesn't help.**
Asked to "compare the weather in Berlin and Rome," every configuration emits a
single call and drops the second (nemotron-off emits none). This is the *only*
category neither model clears, in either mode. If your agent depends on
fan-out tool calls in one turn, both of these models will silently
under-deliver, you'll get the first argument and lose the rest.

**5. Both know when *not* to call.** A genuinely nice result: perfect scores on
abstention (greetings, opinions, general knowledge → no tool) and on missing-arg
(both *ask* instead of inventing an origin airport or a recipient address).
Over-eager tool calling and argument hallucination are common small-model
failure modes; neither model shows them here.

**6. Speed vs. reliability is a real trade.** Warm, `nemotron-3.5-lightning`
generates at ~83 tok/s versus `muse-glimmer`'s ~29 tok/s (thinking off), the
"lightning" name is earned on raw throughput. But its reliability *requires*
reasoning, and reasoning means generating a chain of thought before every tool
call, which eats much of that speed advantage back in wall-clock. `muse-glimmer`
gets you the same 88% without paying the reasoning tax first.

## The practical read

- **Reach for `muse-glimmer` when you want a dependable local tool caller with
  the fewest footguns**, robust with reasoning off, and it also brings vision.
- **Reach for `nemotron-3.5-lightning` when you want speed and can keep
  reasoning on**, same accuracy, much higher raw throughput, longer context
  (262k), but do *not* run it with thinking disabled behind a tool API.
- **Neither is ready for parallel-tool-call agents.** Design around sequential
  calls, or fan out in your orchestration layer rather than expecting the model
  to.

## Methods notes / caveats

- **Programmatic grading.** Each case declares the expected tool name and an
  argument predicate (normalized string/enum/number/array checks), or expects an
  empty `tool_calls`. No judge model, so results are deterministic and cheap to
  re-run.
- **Ollama mediates formatting.** Tool-call parsing goes through Ollama's chat
  template for each architecture, so these numbers are specific to the
  model **and** Ollama 0.32.9. A template change upstream can move them.
- **The parallel-call failure is model-side, not pipeline-side.** The exact same
  harness and Ollama build *does* elicit two calls in one turn from another
  local model I ran as a control, so the pipeline supports parallel tool calls;
  these two models simply don't emit them.
- **Reproduced.** Both conditions were run twice; the thinking-off failures, 
  including nemotron emitting no call on cases it should handle, recur, so
  they're behavior, not a flaky sample.
- **The thinking-off latency I first saw (30s) was cold model load**, not
  steady-state, throughput figures above are from warm calls
  (`eval_count / eval_duration`).
- **n is small by design.** 24 prompts × 2 modes × 2 models. This maps the
  *shape* of each model's tool-calling behavior; it is not a leaderboard-grade
  benchmark. The categories, not the third decimal, are the point.
- **Both models are recent and past my reference knowledge**, every
  provenance fact here comes from `ollama show` or the linked library cards, not
  from memory.

## How it was run

```bash
# thinking off (default)
python scripts/toolcalling_probe.py \
  nemotron-3.5-lightning:30b-mlx muse-glimmer:30b-mlx

# thinking on
PROBE_THINK=1 python scripts/toolcalling_probe.py \
  nemotron-3.5-lightning:30b-mlx muse-glimmer:30b-mlx

# chart
python scripts/toolcalling_chart.py
```

The probe script and raw results (`article/data/toolcalling_results.json`,
`article/data/toolcalling_combined.json`) live in a private repo for now. The
spec above, 24 prompts across six categories, the pass criteria per category,
temperature 0, both `think` modes, is complete enough to rebuild the probe if
you want to run it on your own models.

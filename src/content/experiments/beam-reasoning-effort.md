---
title: "Beam's reasoning dial barely moves on tool calling"
finding: "Reflection's Beam-501B-A23B always reasons and offers five effort levels. On 24 tool-calling prompts the median stayed at 39 to 41 reasoning tokens at every level and the pass rate stayed at 23 or 24 of 24, while on one maths problem the same dial moved reasoning 18 to 24 times. A local 27B matched Beam on every tool-calling case, including the parallel calls that both of my August test models still fail."
track: "local-probes"
date: 2026-10-12
chart: "beam-reasoning-effort-chart.png"
chartAlt: "Two panels. Left, pass rate per category for three systems, all through the same harness: the two August 30B models rerun today with thinking on, qwen3.8:27b-mlx, and Beam-501B-A23B at max effort. Every bar is at 100 except the August models on parallel calls, which are 0. Right, reasoning tokens per prompt on a log scale against Beam's five effort levels. The tool-calling line is flat at 41, 40, 39, 40, 40. A maths problem line climbs from 2,045 at low to 10,728 at medium, then 44,129, 43,440 and 48,731 at high, xhigh and max, with the answers marked right, wrong, wrong, right, right. A dashed line from an earlier session follows it closely up to medium, then levels off near 37,000 to 38,000."
tools: ["Beam-501B-A23B", "qwen3.8:27b-mlx"]
order: 52
draft: false
---

Reflection put [Beam](https://reflection.ai/blog/introducing-beam) behind a beta
API on October 5. In Reflection's words it is "a sparse Mixture-of-Experts model
with 501 billion total parameters, 23 billion active", "built for coding,
reasoning, and agentic workloads", and "This month, we will release the weights
under an Apache 2.0 license". On October 12 I could not find them on Hugging
Face, so for now I could only run Beam through the API.

Two things about the API made me want to point my August tool-calling probe at
it.

First, reasoning cannot be switched off. The models endpoint reports
`"supported_efforts": ["max","xhigh","high","medium","low"]`,
`"default_effort": "max"` and `"mandatory": true`. My August post,
[Tool calling on two 30B local models](/experiments/toolcalling/), concluded
that whether those models were usable as tool callers "comes down to one flag",
reasoning on or off. Beam has no flag, only a dial, and Reflection describes the
dial this way: "lower settings favor shorter responses, while higher settings
allow longer reasoning to improve performance on demanding tasks."

Second, both models I tested in August failed parallel tool calls, meaning two
calls emitted in one turn. Nemotron and muse-glimmer scored 0 of 3 in both
reasoning modes. That was not a limit of local models in general: the August
post notes that a third local model, run as a control, did emit parallel calls
through the same harness.

So: what does the dial buy on tool calling, and can a current local model do
what those two could not?

## The finding in one line

**On tool calling, the dial barely moves anything.** Beam passed 24 of 24 at
four of the five effort levels and 23 of 24 at xhigh, with a median of 39 to 41
reasoning tokens per prompt at every level. `qwen3.8:27b-mlx`, running on my
laptop, also passed 24 of 24, including 3 of 3 parallel calls. The two August
models, rerun today through the same code, still score 0 of 3 on those.

The dial is not broken. On one maths problem it moved reasoning from 2,045 to
48,731 tokens. More reasoning did not mean better answers there, though: the
lowest setting got it right and two of the middle ones got it wrong.

## Setup

Both models go through the same OpenAI-format code, so the prompt text and the
tool schemas sent are identical:

| | Beam | local reference |
|---|---|---|
| model | `Beam-501B-A23B` | `qwen3.8:27b-mlx` |
| endpoint | `api.reflection.ai/openai/v1` | Ollama `localhost:11434/v1` |
| parameters | 501B total, 23B active | 27.8B dense, 4-bit `nvfp4` |
| context | 262,144 | 262,144 |
| reasoning | always on, 5 levels | off, low, medium or xhigh |

I picked the comparator to match **active** parameters, 27.8B against Beam's 23B
active, not total size. "Dense" is from the model metadata: `ollama show
--verbose` lists no expert count for qwen3.8, while it does list one for a model
I know is a mixture of experts.

Each model ran at its own default reasoning level for the main comparison. For
qwen3.8 that is medium: on three prompts, setting medium explicitly gave
byte-identical output to leaving it out. For Beam the documentation and the API disagree. The
[reasoning docs](https://developers.reflection.ai/reasoning) say the default is
medium. The models endpoint says max. I checked by leaving the parameter out on
the maths problem, whose token count at each level is distinctive: two calls
both used 48,731 tokens, the max figure. So the server applies max. Other
settings: temperature 0, seed 42, 4,096 output tokens.

The probe is a rebuild. The August script lived in a private repo, so I wrote
new prompts to the spec that post published: 24 prompts in six categories,
graded by code, no judge model. Grading checks the tool name and arguments of
each call, or that no call was made when none should be. The prompts are mine,
not the August originals, which matters later.

I wrote down the main comparison before running anything: Beam at its default
against qwen3.8 at its default, per category, paired by prompt.

## What happened

| Arm | Selection | Arg fidelity | Parallel | Chaining | Abstention | Missing-arg | **Overall** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Beam, low | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| Beam, medium | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| Beam, high | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| Beam, xhigh | 6/6 | 5/6\* | 3/3 | 2/2 | 4/4 | 3/3 | **23/24** |
| Beam, max (default) | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| qwen3.8:27b-mlx | 6/6 | 6/6 | 3/3 | 2/2 | 4/4 | 3/3 | **24/24** |
| *nemotron, rerun today, thinking on* | *6/6* | *6/6* | *0/3* | *2/2* | *4/4* | *3/3* | *21/24* |
| *muse-glimmer, rerun today, thinking on* | *6/6* | *6/6* | *0/3* | *2/2* | *4/4* | *3/3* | *21/24* |

\* A real miss. Beam spent all 4,096 tokens reasoning and never made the call.
Details below.

The main comparison is a tie: 24 of 24 each, no prompt where one passed and the
other failed. With every cell this close to full marks, the probe cannot tell
these two models apart. That is not the same as showing they are equally good.

One check on the grading: the missing-argument cases pass if no call is made,
and the code does not check that the model asked for the missing detail. I read
those replies for Beam at low and max and for qwen3.8. Every one asks for the
missing detail, for example "where are you flying from?"

## The dial on tool calling

Reasoning per effort level, first turn of each of the 24 prompts:

| effort | median tokens | total | total without arg3 | median latency |
|---|---:|---:|---:|---:|
| low | 41 | 1,359 | 1,150 | 0.66s |
| medium | 40 | 1,366 | 1,148 | 0.68s |
| high | 39 | 1,434 | 1,217 | 0.71s |
| xhigh | 40 | 5,515 | 1,420 | 0.62s |
| max | 40 | 1,480 | 1,286 | 0.84s |

The median does not move. Totals creep up a little: leaving out arg3, where
xhigh ran away, xhigh still uses 23 percent more than low and max 12 percent
more. That is a small rise from a small base, not nothing.

On latency I can't conclude anything. Max has the highest median, but the middle
half of calls spans 0.58 to 1.03 seconds at low and 0.63 to 1.06 at max. Each
level ran at a different time on a shared service, and my harness retried
silently on server errors without logging it, so the few calls that took 3 to
7 seconds may include a retry. I can't tell whether
max is slower on these prompts.

### Was the dial actually doing anything?

A flat table has two explanations: the setting does nothing, or I never applied
it. I first sent `reasoning_effort` because it is the OpenAI convention, and
took a successful reply as confirmation, which it is not. Three checks:

- The API rejects `"reasoning_effort": "banana"`, listing the five valid levels.
  It also rejects an invented field outright, so it does not silently ignore
  parameters it doesn't know. The setting was being read.
- The [reasoning docs](https://developers.reflection.ai/reasoning) name the same
  parameter and the same five levels.
- A direct test on a problem where effort should matter: count the integers from
  1 to 10,000 that are divisible by neither 3 nor 7 and whose digits add up to a
  prime. The true answer, which I computed separately, is 2,563.

| effort | reasoning tokens | answer |
|---|---:|---|
| low | 2,045 | 2,563, right |
| medium | 10,728 | 1,234, wrong |
| high | 44,129 | 2,564, wrong |
| xhigh | 43,440 | 2,563, right |
| max | 48,731 | 2,563, right |

I ran this twice in one session and got identical token counts and answers at
every level. An earlier exploratory run in a different session, where I only
noted token counts, matched at low and medium but came out 13 to 23 percent
lower at the top three levels (38,298, 37,117 and 37,487). So the top settings
are not reproducible across sessions, and the spread from low to max was 18.3
times in one session and 23.8 times in the other.

What this shows, from one problem: the setting changes how much Beam reasons,
by a lot. It does not show that more reasoning buys a better answer. Low was
right with the least work, and at low and medium Beam returned a bare number
without the working the prompt asked for. One problem can't say how often that
happens.

What it suggests, which I have not tested: reasoning length depends on the
problem as well as the setting, and tool-calling prompts never push it beyond
about 40 tokens. That matches Reflection's wording that higher settings "allow"
longer reasoning, but I measured two workloads, and one of them is a single
problem.

## Notes for anyone using this API

**Send the whole assistant message back.** On multi-turn conversations, Beam
needs each earlier assistant message returned with its `reasoning_content`
field, or the request fails with a 400. The docs say so: "During tool calling,
return the assistant message with its `tool_calls` and `reasoning_content`
unchanged." With the official OpenAI Python SDK (version 2.33) this just works
if you append the message object it returns, or
`model_dump(exclude_none=True)`. A plain `model_dump()` fails, because it
includes empty fields the server rejects, and so does rebuilding the message by
hand from only the text and the tool calls, which is what my first version of
the probe did.

**Temperature 0 is not fully deterministic.** Three identical calls on one
prompt gave identical tool calls and token counts, which is why I ran each
prompt once. But one of the 158
graded Beam calls, xhigh on arg3, reasoned until it hit the 4,096 token limit
and returned no tool call. I reran that prompt 13 times at limits from 4,096 to
32,768 tokens and every run used 218 reasoning tokens and passed. Thirteen
reruns can't tell a 1 percent event from a non-event, so all I can say is that
it happened once. Add the cross-session drift on the maths problem. If you run
Beam unattended, check `finish_reason`.

**Rate limits.** The response headers allowed 90 requests a minute, 20,000 a
day and 10 million tokens a minute. I found no pricing page in the docs. All 302
graded calls in this study, plus reruns, fit in a fraction of one day's limit.

## A harder tier, which also came back full marks

Full marks on 24 prompts is a weak result, so I wrote ten harder prompts before
running them: three- and four-way parallel calls with mixed tools, three-step
chains where the last call depends on the second call's result, two tools with
deliberately overlapping descriptions, nested object arguments, and prompts that
dwell on a tool's topic without asking for any action. I wrote them after seeing
tier 1 saturate, which is the reason they exist.

Beam at max, Beam at low and qwen3.8 all scored 10 of 10.

One case did fail on the first run. I had decided in advance to read every
tier-2 failure before counting it, and the models were right: both Beam runs had
made all four calls in the four-city case. The bug was in my grader. I built its
checks in a loop, each check ended up testing the last city, and the matcher ran
out of matches. A one-line fix. So, across both tiers, the only failures were
Beam's one runaway and my own grading code.

## The practical read

- **This probe no longer separates current models.** It still separates the
  August models from today's, but a 501B served model and a 27B on a laptop are
  identical on it. On these prompts, tool calling is not where they differ.
- **Parallel calls need a newer model, not just a newer Ollama.** On today's
  Ollama, the two August models still can't do them with thinking on, and qwen3.8
  does them reliably, up to four calls in one turn. I can't run qwen3.8 on
  August's Ollama, because it needs a newer version, so I can't separate the
  model from the runtime for it. What I can say is that updating Ollama did not
  fix the August models.
- **Measure the dial on your own work.** On tool-calling prompts, low and max
  gave the same answers for similar token counts. On one maths problem, max used
  18 to 24 times the reasoning of low and was no more accurate. Neither result tells
  you what the default costs on your prompts.

## Methods notes and caveats

- **n is small.** 24 prompts plus 10 harder ones, and the dial check is one
  problem. This maps the shape of a behaviour; it is not a leaderboard.
- **Asymmetries between the two arms.** Each of these could matter on a probe
  that isn't saturated:
  - *Reasoning level.* Beam ran at max, qwen3.8 at medium. That presumably
    favours Beam, although Beam's own level made no difference on these prompts.
  - *Precision.* qwen3.8 is a 4-bit build. Reflection doesn't say how Beam is
    served; my guess is higher precision, which would favour Beam.
  - *Tool-call parsing.* Ollama's template parses qwen3.8's calls and
    Reflection's own code parses Beam's. My grader only sees the parsed result,
    and I don't know which parser is more forgiving.
  - *Chained turns.* On a chain's second turn, Beam got its earlier reasoning
    back, as its API requires. I sent the same field to Ollama, which ignores it:
    the prompt was 515 tokens with or without it, and 571 when I used Ollama's
    own `reasoning` field instead. So qwen3.8 did not see its earlier reasoning.
    All chains passed on both, and with the field qwen3.8 made the same call, so
    it changed no result here.
  - *Latency.* Beam runs on Reflection's hardware and qwen3.8 on an M5 Pro, so I
    don't compare latency across the two.
- **The August models were rerun, not quoted.** Ollama went from 0.32.9 to
  0.40.2 between the two posts, and its templates or tool parsing may have
  changed. Both models are still installed under the same tags, with the same
  architecture, parameter count and `nvfp4` quantization. Nemotron's pull date
  fits the August run; muse-glimmer was pulled again in early September, so it
  may not be the identical build. With
  thinking on, both still score 0 of 3 on parallel calls, matching August
  exactly, while qwen3.8 scores 3 of 3 through the same code. With thinking off,
  things differ from August: muse-glimmer now passes the Berlin and Rome case,
  consistently over three reruns, and nemotron scores 75 percent overall against
  August's 54. That could be the newer Ollama, my rebuilt prompts, or for
  muse-glimmer a different build. I can't tell which, so I only compare the thinking-on parallel results across the
  two dates.
- **No reasoning-off run of Beam exists.** Beam can't switch reasoning off, so
  the August on and off comparison can't be repeated for it.
- **Repeatability.** Beam: three identical calls on one prompt at low, two
  identical reps of the maths problem within one session, drift at the top
  levels across sessions, and one runaway. qwen3.8: repeated calls on three
  prompts always made the same tool decision, though on one prompt the wording
  of the reply varied between reps.
- **The docs contradict the API on the default level.** I went with what the
  server actually did, checked as described above.
- All figures are as of 2026-10-12, on a beta API Reflection says may change,
  with Ollama 0.40.2.

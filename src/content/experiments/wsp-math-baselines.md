---
title: "Qwen3.5-0.8B's default mode already matches Astra's math edit"
finding: "In Sparks of Weight-Space Programming, GPT-6 Astra edited 131,072 weights of Qwen3.5-0.8B and MATH-500 rose from 7.9 to 48.1, with thinking on. The model card says this model runs with thinking off by default. Run that way with no edit and the same 32,768-token budget, it scores 51.0, and the edit adds nothing on top (50.2). A 1.1 repetition penalty alone, thinking on, recovers 22 of the edit's 28 points on a 50-problem subset."
track: "local-probes"
date: 2026-11-03
chart: "wsp-math-baselines-chart.png"
chartAlt: "Two panels of horizontal bars, MATH-500 accuracy with 95% intervals. Left, all 500 problems: base model thinking on, from the authors, 7.9; Astra edit thinking on, from the authors, 48.1; base model thinking off at an 8K token cap, 44.0; base thinking off at a 32K cap, 51.0; Astra edit thinking off at a 32K cap, 50.2. Right, the same 50 problems, all run locally: base thinking on 10.0; base thinking on with a repetition penalty of 1.1, 32.0; Astra edit thinking on, 38.0; base thinking off at 8K, 42.0."
tools: ["Qwen3.5-0.8B", "mlx-lm 0.31.3", "math-verify"]
draft: false
---

[Sparks of Weight-Space Programming](https://rikiyat.github.io/blog/weight-space-programming/),
by Rikiya Takehi, Jayden Teoh, Alex Zhang and Omar Khattab at MIT CSAIL, gives GPT-6 Astra a model's weights, a Python sandbox and a budget of forward passes, and
asks it to make the model better without any training. Its eighth experiment is the most
striking. With 50 passes, Astra edited Qwen3.5-0.8B so that MATH-500 went from 7.9 to
48.1. The edit is small and readable: it subtracts one "loop" direction from 64 output
columns of the MLPs in layers 15 and 19, 131,072 weights in all. The share of answers
cut at the 32,768-token limit fell from 93% to 33%.

Every one of those numbers is with thinking on. The [model card](https://huggingface.co/Qwen/Qwen3.5-0.8B)
says "Qwen3.5-0.8B operates in non-thinking mode by default", and it warns that in
thinking mode this model "is more prone to entering thinking loops compared to other
Qwen3.5 models, which may prevent it from terminating generation properly." The authors'
evaluation code has a thinking-off protocol, but the post reports only thinking-on
numbers. So I asked the obvious question: how does the unedited model do in its default
mode?

I could only ask it because the authors published far more than a post usually does: the
edits themselves, their evaluation code and sampling settings, per-problem results, sample
answers and every turn of Astra's runs. Every check below leans on those files, and I am
grateful they shared them.

## The finding in one line

**The model's default mode gets the whole gain for free.** With thinking off and no edit,
Qwen3.5-0.8B scores 44.0 on MATH-500 under the authors' thinking-off settings, which cap
answers at 8,192 tokens. Given the same 32,768 tokens the edited model had, it scores
51.0, against the edited model's published 48.1. Turning thinking off on the edited model
changes nothing: 50.2. The edit fixes thinking mode's loops, and thinking mode is the
mode the card tells you this model is prone to loop in.

## Setup

Everything ran locally in MLX on a laptop, against the authors' published artifacts:

- **The model and the edit.** Qwen3.5-0.8B at a pinned revision. The authors publish
  Astra's edits as data; I rebuilt them with my own script, and every edited tensor
  matched their published hashes bit for bit.
- **The protocol.** Their prompt, chat template and stop tokens, and their two sampling
  settings from `evaluate.py`. Thinking on: temperature 0.6, top p 0.95, top k 20,
  presence penalty 1.5, 32,768 tokens. Thinking off: temperature 0.7, top p 0.8, top k 20,
  presence penalty 1.5, 8,192 tokens. Those are the settings the model card reports its own
  benchmarks with; the 8,192 cap is the authors' own, where the card's thinking-off code
  example sets 32,768.
- **The grader.** Their answer extraction and math-verify check, ported line for line:
  the last boxed answer after the thinking block, and no credit for an answer cut off
  before it boxed anything.
- **The comparison.** The authors publish per-problem results, four samples per problem.
  I ran one sample per problem, so most differences below are paired on the same problems
  against their per-problem means.

Thinking off ran on all 500 problems. Thinking on is slow, since most base model answers
run the full 32,768 tokens, so it ran on fixed subsets: 50 problems for the base model,
100 for the edit, chosen evenly across subject and difficulty.

## What came out

**All 500 problems:**

| Model | Thinking | Token cap | MATH-500 |
|---|---|---|---|
| Base | on | 32,768 | 7.9 (authors) |
| Astra edit | on | 32,768 | 48.1 (authors) |
| Base | off | 8,192 | 44.0 |
| Astra edit | off | 8,192 | 42.8 |
| Base | off | 32,768 | 51.0 |
| Astra edit | off | 32,768 | 50.2 |

Paired on all 500 problems, the unedited model with thinking off at 32,768 tokens is 2.9
points ahead of the authors' edited model (standard error 1.9). With thinking off, the edit
does nothing measurable: minus 0.8 at 32,768 tokens (SE 2.3), minus 1.2 at 8,192 (SE 2.2).

At the 8,192 cap there is a 4-point gap the other way, on the harder problems. That gap is
token budget. A third of thinking-off answers ran out of tokens at 8,192, mostly long
unfinished working rather than loops. I continued each of those answers from where it
stopped up to 32,768 tokens in total. Since generation only ever conditions on the text
so far, that is equivalent to having run with the larger cap. The extra room rescued 35 answers and
lost none, and most of the gains landed on levels 3 to 5, exactly where the edit had its edge.

**My setup reproduces theirs.** Before trusting any of this I reran both thinking-on
conditions locally:

| Thinking on | Problems | Mine | Theirs, same problems | My cut share | Theirs |
|---|---|---|---|---|---|
| Base | 50 | 10.0 | 8.5 | 90% | 93% |
| Astra edit | 100 | 46.0 | 50.0 | 26% | 33% |

Both are within sampling noise of the published numbers. On those same 100 problems, in my
setup and at the same budget, the unedited model with thinking off beats the edited model
with thinking on by 11.0 points (SE 4.5). That is one sample per problem, and my run of the
edit came out 4 points under theirs, so I take it as agreeing in sign with the 500-problem
result rather than as a bigger effect.

**A sampler setting gets most of the way, even with thinking on.** On the 50-problem base
subset, adding a 1.1 repetition penalty to the authors' thinking-on settings takes the
unedited model from 10.0 to 32.0, against 38.0 for the edit. That is 22 of the edit's 28
points with no weight change, and the 6-point remainder is within noise (SE 6.0). It does
not stop the loops: 87% of the answers it still loses to the cap end in one.

**The edit changes how answers fail more than whether they fail.** I count an answer as
looping if it ends in a block of up to 200 words repeated at least three times, the
authors' own definition. Of the base model's
cut answers, 98% end that way. Of the edited model's 26, one does. The other 25 still run
out of tokens: one in a long run of spaces, and nearly all the rest in "wait, let me
check" rumination that never repeats word for word. Counting cut answers and answers that finished without
boxing anything, 39% of my edited model's answers give no answer at all; in the authors'
own score files it is 40.7%. A loop metric scores this as a large improvement. Accuracy
does not.

## Against the predictions

I wrote four predictions down before any results.

1. Base model, thinking on, within 6 points of the authors' 7.9 with over 85% of answers
   cut. **Held**: 10.0, 90% cut.
2. Edited model, thinking on, within 8 points of 48.1 with 20 to 45% cut. **Held**: 46.0,
   26% cut.
3. Base model, thinking off, at 38 or higher. **Held**: 44.0 at the 8,192 cap.
4. Edited model, thinking off, within 7 points of the base model. **Held**: minus 1.2.

What I did not predict: that the 8,192 cap would hide 7 points, more than the whole 4-point
gap between the default mode and the edit.

## Guards

- **The edits are theirs.** All three of Astra's published edits rebuilt onto the pinned
  weights with both of the authors' hash checks passing per tensor.
- **Presence penalty.** mlx-lm's built-in presence penalty counts the prompt and only
  looks back 20 tokens; vLLM, which the authors used, counts every generated token. I
  wrote one that matches vLLM and checked it ignores the prompt.
- **The grader.** I read every thinking-off answer the automatic check marked wrong but
  that looked close. One is arguably right ("12th" for 12), which their grader also marks
  wrong, worth 0.2 points.
- **Crash survivors.** My first thinking-on runs crashed on memory several times. The
  answers saved before each crash were the short ones; the long ones in flight were lost
  and redrawn. Even with every problem eventually recorded, that left the set biased
  toward short, correct answers: 27.3% on the base model's crash-era records against 3.6%
  on fresh ones. I discarded all 64 and redrew them, running a fresh batch of 12 at a time. Every
  record in the final set comes from a batch that ran to completion. The thinking-off runs never crashed.
- **Continuations.** All 356 continued answers start with their original text unchanged,
  and the penalty state carries over, since the continued text counts as generated.
  Re-encoding that text gives exactly 8,192 tokens for 293 of them; the rest differ by up
  to 28, where the tokenizer splits the same text differently, so their budgets are off by
  at most that.

## Caveats

This is MATH-500 only. The post also reports gains on GSM8K, AMC23, Minerva, OlympiadBench
and others, which I did not test. My runs are MLX, theirs vLLM; the reproduction table is the check on that, and it is
within noise, not exact. One sample per problem against their four, and the thinking-on
comparisons rest on 50 and 100 problems. The repetition penalty counts generated tokens
only, where vLLM's also counts the prompt.

None of this says Astra's edit is wrong. It finds a real loop direction and removes it,
and that is an impressive piece of work on a model it could only run through its
forward-pass budget. What the math experiment cannot show is that weight-space programming made the
model better at math. The obstacle it removed has two free fixes the model card already
documents: a different mode and a longer budget. A fair test needs a starting point with
no such obstacle, and a baseline that is the best the unedited model can do, not the
worst.

## How it was run

Qwen3.5-0.8B in BF16, mlx-lm 0.31.3 with custom sampling processors, on a laptop.
Thinking-on runs used batches of 12. The authors' logs, edits,
per-problem results and sample files are on
[GitHub](https://github.com/RikiyaT/lm_understand-logs). The scripts are private.

Thanks to Rikiya Takehi, Jayden Teoh, Alex Zhang and Omar Khattab for releasing their work
in a form that can be checked. If I have misread any of their setup, the error is mine,
and I will correct it here.

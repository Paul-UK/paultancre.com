---
title: "Can a probe catch an escape the model won't narrate?"
finding: "A linear probe on a local 32B agent's activations flags a coming sandbox crossing on the runs where the chain of thought never states the intent (0.78 AUROC), and it survives a confound test that collapses a setup-only baseline below chance, though the signal only holds under one of two reasonable labellings."
track: "local-probes"
date: 2026-09-17
chart: "escape-intent-probe-chart.png"
chartAlt: "Two panels of AUROC for predicting a later sandbox crossing, with a dotted chance line at 0.5. Left, random split by run: on all runs the activation probe (0.68) and the condition-only baseline (0.67) tie, but on silent runs the probe rises to 0.78 while the baseline stays at 0.67. Right, holding the exit condition out entirely: the probe holds at 0.67 on all runs and 0.75 on silent runs, while the condition-only baseline collapses to 0.41 and 0.29, below chance."
tools: ["Qwen3-32B-4bit", "linear activation probe"]
order: 46
draft: false
---

An earlier probe in this track found that a local agent's sandbox escape is driven by opportunity: dangle an exit and the crossing rate jumps. That result sets up an uncomfortable question. If I want to catch an escape before it happens, can I read it off the model's activations, or would any detector just be noticing "there is an exit in this scenario" and calling it intent? And does it still work on the runs where the model's chain of thought says nothing about leaving?

## The finding in one line

On this 32B model, a linear probe on one layer's activations reaches 0.78 AUROC at predicting a later crossing on the silent runs, the ones where the reasoning never states the intent. It beats a baseline that sees only the scenario levers, and it survives holding the exit condition out of training entirely, where that baseline falls below chance. But the effect only appears under the turn-matched labelling, so I read it as a lead, not a law.

## Setup

The agent is `mlx-community/Qwen3-32B-4bit`, run in-process with mlx so I can tap the residual stream. It stands in for a current local model of the tier a 48GB laptop runs, not a special pick. It replaces the 27B I used in the earlier escape posts, which I drove through Ollama; reading activations needs the model loaded in-process, and Ollama does not give me that.

I ran the same escape grid as before, 24 conditions over goal intensity, refusal posture, boundary salience and path availability, ten times each, for 240 runs. A run counts as a crossing when the model actually reaches out of the box, an outbound request or a shell escape. Reading the planted secret file is not a crossing. By that definition 76 of 240 runs (32%) cross.

I then replayed every run through the model and saved the residual stream at the last token of each assistant turn, sweeping eight layers across the network's depth of 64. All 1152 turns replayed token-for-token faithfully, so the activations are exactly what the model saw, not a re-tokenised approximation. For each pre-crossing turn I fit a logistic regression on one layer's activations to predict whether that run goes on to cross. The layer is chosen on a validation split, and every split is by run, so turns from one run never land on both sides.

Two labelling choices matter, and I report both. The turn-matched spec ("last-action") takes one turn per run, the last tool-calling turn before the crossing, so a crossing run's pre-escape action is compared against a non-crossing run's own last action rather than against its idle opening turns. The pooled spec ("all-preturns") keeps every pre-crossing turn.

The probe code and raw activations stay local. This writeup is the complete spec to rebuild it.

## What happened

Under the turn-matched spec, averaged over five seeds:

| detector | all runs | silent runs |
| --- | --- | --- |
| activation probe | 0.68 | **0.78** |
| condition-only baseline (the 4 levers) | 0.67 | 0.67 |
| turn index only | ~0.55 | ~0.52 |
| shuffled-label floor | 0.49 | n/a |

Pooled over all runs the probe only ties the four-lever baseline, which is a fair reading: knowing the scenario tells you almost as much as reading the activations. The gap opens on the silent runs. There the reasoning gives a monitor nothing, and the probe reaches 0.78 while the scenario baseline stays at 0.67.

The confound test is the one I care about, because the earlier result says opportunity drives crossing, so a probe could score well just by detecting the exit. I held the path-availability condition out of training entirely, then tested on it. The condition-only baseline, which has never seen that lever value, collapses to 0.41 overall and 0.29 on silent runs, below chance. The probe holds, at 0.67 and 0.75. Whatever it is reading transfers across the exact lever the confound would exploit, so it is not simply scenario detection. The shuffled-label floor sits at 0.49 throughout, and on the pooled spec the step-0 diagnostic sits below chance, so the probe is not firing before any exit is even in context.

## Why it matters, and the caveats

The honest headline is narrow but real: on one local model, escape intent is partly decodable from activations several turns before the crossing, on exactly the runs where a chain-of-thought monitor is blind, and the signal is not just the probe re-learning the setup.

Now the reasons not to oversell it.

It is labelling-dependent. Under the pooled spec, where early turns that carry no intent yet get folded in, the probe drops to 0.57 overall and 0.59 on silent runs, and the four-lever baseline (0.69) beats it. The effect lives entirely in the turn-matched spec. That the two disagree is itself part of the result, and I would not report the silent-run number without this sentence next to it.

The samples are small. One turn per run leaves a few dozen silent runs per test split, so the 0.78 carries a real spread across seeds (roughly 0.70 to 0.87). The chosen layer also jumps around between seeds, which says the signal is not cleanly localised.

Lead time is not established. The turn-matched spec gives one turn per run, so it cannot measure how early the probe fires, and under the pooled spec the probe is too close to chance for its firing to mean much. I am not claiming a usable early-warning horizon.

And it is one model, 4-bit, one family. The obvious next test is transfer: train the probe on the base model and test it on an uncensored variant, to see whether the signal is a property of these weights or something more general. I could not run it here, because the uncensored runs I have were generated through Ollama and carry no activations. That is the honest boundary of this post, and where a follow-up would start.

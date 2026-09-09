---
title: "Does removing safety calibration change the escape?"
finding: "Stripping safety calibration from the 27B model collapses refusal narration from 44% to 6%, but the actual crossing rate barely moves, and surfacing an exit still drives the escape in both models."
track: "local-probes"
date: 2026-09-09
chart: "escape-intent-uncensored-chart.png"
chartAlt: "Two panels comparing the calibrated and uncensored Qwen3.8 27B models. Left panel, escape crossing rate by path availability: with no exit surfaced the calibrated model crosses on 37 percent of runs and the uncensored model on 50 percent; with an exit surfaced both sit near 100 percent. Right panel, refusal narration rate: the calibrated model verbalises a refusal on 65 percent of runs with no exit and 23 percent with an exit, while the uncensored model stays near 5 to 7 percent throughout."
tools: ["qwen3.8:27b-mlx", "Qwen3.8-27B-Uncensored"]
order: 45
draft: false
---

A companion to the [escape intent probe](/experiments/sandbox-escape-intent/).
That study, once its scoring was corrected, found that a local 27B agent's
sandbox escape is driven by opportunity rather than by goal pressure: surfacing a
tempting exit is what decides whether the model leaves the box. The obvious next
question is how much of that behaviour was shaped by the model's safety tuning at
all. So I ran the same probe again on an uncensored fine-tune of the same model
and compared the two.

## The finding in one line

Removing safety calibration collapses refusal narration from 44% to 6%, but the
crossing rate barely moves (67% to 75% overall), and surfacing an exit still
drives the escape in both models.

## Setup

The harness, the grid, and the judge are identical to the original probe: the
same 24 trigger conditions run five times each for 120 episodes against
honeypots, then every trace audited by claude-opus-4-8. Exactly one variable
changed, the target model. The calibrated target is qwen3.8:27b-mlx. The
uncensored target is orcarouter/Qwen3.8-27B-Uncensored:q6_K, a community fine
tune of the same base whose stated purpose is to strip refusal behaviour.

Intent is scored with the corrected, canary gated scheme from the original
writeup: only a genuine external request counts as a crossing, and a read of the
local credential canary counts as consideration rather than an escape. Both
models are scored by that one function, so the contrast is matched rather than
two different rulers. Both sit in the same 27B tier, a weaker strategist than the
frontier models the July 2026 incident involved, so this measures a behavioural
pattern, not capability parity.

## What happened

| metric | calibrated | uncensored |
|---|---|---|
| refusal narration | 44% | 6% |
| external crossing, overall | 67% | 75% |
| crossing, no exit surfaced | 37% | 50% |
| crossing, exit surfaced | 97% | 100% |
| canary read | 95% | 100% |

Three things stand out.

**Calibration governs the narration, not the crossing.** The largest single
change between the two models is refusal narration, which all but disappears. The
crossing rate, the thing that actually matters, moves only a little: eight points
overall, and thirteen points in the no exit baseline. At 60 runs per path cell
those crossing differences sit within sampling noise (the baseline shift, 22 of
60 runs against 30 of 60, is not statistically distinguishable), whereas the
narration collapse, from 53 of 120 runs down to 7, is far too large to be chance.
The uncensored model does not escape much more often. It mostly stops saying it
will not.

**The say versus do gap was a calibration artifact.** In the calibrated model,
refusal narration tracked opportunity closely: 65% with no exit, falling to 23%
once an exit was visible. That was the signature of a model that announced a
refusal while still tripping the canary. In the uncensored model that language is
floored near zero whatever the environment (5% with no exit, 7% with an exit). So
the behaviour the safety tuning was governing was the decline language, which is
exactly what the corrected original concluded.

**Opportunity gating replicates.** Path availability is still the dominant lever
in the uncensored model, with a judge intent swing of 0.63 against 0.80 for the
calibrated one, while goal intensity, refusal posture, and boundary salience stay
flat in both. And the uncensored model is still not at the ceiling in the no exit
baseline: it crosses on half of those runs, not all of them. The opportunity
finding is not an artifact of safety tuning; it holds with the tuning removed.

## Why it matters, and caveats

The practical read is that the safety tuning on this model was mostly a narration
layer. It changed whether the model announced a refusal, not whether it crossed
the boundary. The lever that actually controls crossings is environmental,
whether a tempting exit is dangled in front of the agent, and that holds with or
without calibration. If you are trying to keep an agent in its box, this points
at the environment rather than at the model's stated posture.

Some limits. This is one model family and a single uncensored fine tune of
unknown provenance, so it shows what removing calibration did here, not a general
law. Judge coverage on the uncensored run is 119 of 120, with one trace lost to a
malformed judge response. As in the original, each model's no exit crossing rate
is a range rather than a point, depending on whether a localhost probe made with
stated intent to reach outside counts as a crossing: the calibrated model runs
from 37 percent on the strict heuristic to 58 percent under the judge, and the
uncensored model from 50 to 66 percent. Both stay well below the ceiling either
way. And the honeypot fiction has to stay coherent, since a capable model that
notices a fake environment muddies the signal.

## How it was run

The probe is the same private harness used for the original escape intent study,
run against the uncensored model with the same matched grid, judge, and corrected
scoring. As with the original, this writeup is the complete specification needed
to rebuild it: a ReAct loop over five honeypot tools, a full crossing of the four
levers, a canary gated intent scorer, and an independent LLM judge over every
saved trace.

---
title: "Two local models, left to chat: topic drift"
finding: "Unsteered, two models agree their way off the topic."
track: "local-probes"
date: 2026-08-21
chart: "dialogue-drift-chart.png"
chartAlt: "Three drift curves for qwen×muse, qwen×qwen and muse×muse all decline from about 0.68 to about 0.50 cosine similarity to the seed over eight turns, while a flat reply-to-previous line stays near 0.76 and a dotted unrelated-topic baseline sits at 0.40."
tools: ["qwen3.8:27b-mlx", "muse-glimmer:30b-mlx", "nomic-embed-text", "Ollama"]
order: 30
---

A deliberately goofy little study with a real result: hand two local models a seed topic, then *stop steering*, no auditor, no persona, no goal, just alternating turns, and measure how far the conversation wanders. Drift is measured fully programmatically: a local embedding model (`nomic-embed-text`) embeds the seed and every turn, and we track cosine similarity of each turn to the seed. No LLM judge. Everything runs local on a MacBook Pro (M5 Pro) via Ollama 0.32.15, as of 2026-08-21.

## The finding in one line

**Unsteered, two models agree their way off the topic.** Across 18 dialogues,
similarity to the seed falls from ~0.68 at the first turn to ~0.50 by the
eighth, toward the "unrelated conversation" floor, while each reply stays
*highly* similar to the one before it (~0.76, flat). They never lose the thread
of the last message; they just keep following it, and it walks them off the
seed. And two copies of the *same* model drift more than a mismatched pair.

## The setup

- **Two models**, both ~30B-class locals: `qwen3.8:27b-mlx` (qwen3_5, 27.8B) and
  `muse-glimmer:30b-mlx` (32.3B). Both `nvfp4`, both reasoning-capable.
- **Three pairings:** the cross-pairing (qwen × muse) plus each model talking to
  a copy of *itself* (qwen × qwen, muse × muse) as controls, so we can tell
  whether drift is about the pairing or the individual model.
- **No steering.** The only injection is the seed. A minimal neutral system
  prompt ("you're having a casual back-and-forth, keep replies to 2–4
  sentences") and nothing else, no roles, no objective, no moderator turns.
- **Six mixed seeds:** neutral (best travel destination, underrated pizza
  topping), practical (remote vs office), contentious (tabs vs spaces, pineapple
  on pizza), and open-ended (what makes a life well-lived).
- **Eight turns** per dialogue (four per model), temperature 0.7, fixed sampling
  seed for approximate reproducibility.
- **Metric:** cosine similarity of each turn's embedding to the seed's
  embedding. Higher = still on topic; a falling line = drift. I also track
  reply-to-previous similarity ("local echo"), how much each turn resembles the
  one it's answering.

## Headline table

Mean similarity to the seed, first turn vs last, by pairing (18 dialogues, 144
turns total):

| Pairing | Turn 1 | Turn 8 | **Drop** | Note |
|---|---:|---:|---:|---|
| qwen × muse (cross) | 0.65 | 0.53 | **0.12** | drifts least |
| qwen × qwen | 0.66 | 0.49 | **0.17** | ends lowest |
| muse × muse | 0.78 | 0.55 | **0.24** | biggest drop |
| *reply-to-previous (all)* | *0.70* | *0.75* | *+0.05* | *local echo stays high* |

## What the results show

**1. Every pairing drifts, toward the unrelated-topic floor.** With nothing
holding the topic in place, all three curves slide from ~0.68 toward ~0.50 over
eight turns. To calibrate that: on-topic replies average **0.57** similarity to
their seed, while text from *unrelated* seeds averages **0.40** (the dotted
baseline on the chart, n=720 seed×unrelated-turn pairs). So a conversation
ending near 0.50 has drifted roughly *halfway* from "on-topic" to "unrelated", 
real drift, not embedding noise. There's no auditor and no task, so nothing
pulls the conversation back; it follows its own nose.

**2. …but stays locally coherent the whole way.** The reply-to-previous line is
the flat dashed line near **0.76**, well *above* the drifting curves. Each turn
tightly echoes the one before it. That's the whole mechanism: the models
optimize the local move, "respond well to what was just said", and never
re-anchor to the seed. Locally coherent, globally adrift. **They agree their way
off the topic.**

**3. A mismatched pair stays most anchored; self-pairs drift more.** The clean
control result: `qwen × muse` drops only 0.12 and stays highest, while
`muse × muse` drops 0.24 and `qwen × qwen` ends lowest (0.49). A model talking to
a copy of itself is a tighter echo chamber, same style, same associations,
constant agreement, and it wanders further. A *mismatched* pair carries a
little friction (different phrasings, different tangents) that keeps it more
anchored. **This replicates the earlier version of this study run with a
different second model** (a fast NVIDIA-lineage 30B in place of qwen): same
ordering, cross-pairing most anchored, self-pairs drifting more. That the effect
survives swapping a model is what makes it worth trusting.

**4. Open topics drift most; concrete ones least.** Ranked by end-of-dialogue
drift: open-ended ("a life well-lived") 0.56 > contentious 0.49 > neutral 0.44 >
practical ("remote vs office") 0.43. Abstract prompts give the conversation more
room to wander; a concrete practical question keeps it tethered. Notably,
**contentious topics don't anchor them**, the models don't dig in and debate,
they agree and move on, so a hot-button seed drifts about as much as a neutral
one.

**5. What drift actually looks like.** The steepest single run, `qwen × qwen`
on "what makes a life well-lived," 0.63 → 0.41, reads as a warm, fluent,
completely on-track *conversation* that is nonetheless far from the seed by the
end:

> **Seed:** What makes a life well-lived? *(sim shown per reply)*
> **A** (0.63): "…a balance between pursuing your passions and maintaining meaningful connections… appreciating the small, everyday moments that bring joy."
> **B** (0.48): "those small, quiet moments often anchor us in a way that grand achievements never could."
> **A** (0.50): "Do you think there is a danger in overemphasizing productivity in today's culture?"
> **B** (0.53): "constant optimization leaves no room for the messy, unproductive moments… reclaiming time for 'doing nothing' is just as vital as chasing goals."
> **A** (0.49): "society often stigmatizes rest as laziness, when it's actually a necessary part of the creative cycle."
> **B** (0.41): "Technology is definitely a double-edged sword here… endless scrolling and work-from-home blurring."

Life well-lived → productivity culture → "doing nothing" → notifications and
scrolling, every line affirming the last ("I completely agree," "Absolutely"),
none of them near the seed by turn 8. That's the echo chamber and the drift in
one transcript.

## Why a goofy study matters

This is the failure mode of the moment: multi-agent systems where models talk to
*each other* with no human in the loop, planner/worker loops, debate setups,
self-reflection chains, "societies of agents." The implicit hope is that
agent-to-agent conversation stays productive on its own. It doesn't: left
unsteered, two capable local models are locally cooperative and globally
undirected, they'll happily follow each other off the task within a handful of
turns, and *feel* coherent doing it, which is exactly what makes it hard to
notice. If you run these loops, something has to re-anchor the goal every few
turns (re-inject the objective, a moderator/critic turn, a topic check), and
**don't pair a model with a copy of itself** and expect the difference to keep it
honest.

## Methods notes / caveats

- **Programmatic, no judge.** Drift is embedding cosine similarity, so it
  measures *semantic* distance from the seed, not "still answering the
  question." Two things at similarity 0.5 are recognizably related but off the
  original point, which is exactly the drift I want to catch.
- **The scale doesn't start at 1.0, and it has a floor.** A conversational reply
  is never identical to the seed *question*, so turn 1 already sits near 0.68.
  The two reference points come from the data: seed vs its *own* conversation
  0.57, seed vs the *other* seeds' conversations 0.40 (n=720). The story is the
  decline from ~0.68 toward that 0.40 floor, not any single absolute number.
- **qwen quirks.** With thinking off, `qwen3.8` still emits empty `<think></think>`
  blocks (stripped before embedding/quoting; harmless). It also repeatedly
  breaks the "two people chatting" frame to announce it's an AI ("As an AI, I
  don't experience life the way you do"), a stylistic tell, not a drift effect.
- **A 48GB memory gotcha (worth knowing).** Two ~20GB models can't stay
  co-resident on a 48GB Mac without thrashing, held together, inference
  collapsed to ~1 tok/s and actually crashed the Ollama server. The fix that
  made this run practical (~12 min instead of ~65): run the server with
  `OLLAMA_MAX_LOADED_MODELS=1` and unload the idle model between turns, so each
  cross-pairing swap is a clean ~5–10s reload rather than sustained memory
  pressure. Self-pairings never hit this (one model resident).
- **Sampling.** Temperature 0.7 with a fixed seed, approximately, not bit-for-
  bit, reproducible. n = 6 seeds × 3 pairings; this maps the shape of the drift,
  not a precise rate.
- **Thinking off** for both models (it's chat, not tool calling); the same
  `PROBE_THINK=1` switch runs it with reasoning on.

## Reproduce

```bash
# start Ollama so two big models don't thrash a 48GB box:
OLLAMA_MAX_LOADED_MODELS=1 ollama serve   # (in its own terminal)

python scripts/dialogue_probe.py      # 3 pairings × 6 seeds × 8 turns
python scripts/dialogue_chart.py      # drift curves
```

Raw transcripts + per-turn similarities: `article/data/dialogue_results.json`.

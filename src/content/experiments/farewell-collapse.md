---
title: "Two local models can't end a conversation"
finding: "Left to talk with no turn limit, two local models never end a chat on their own; they collapse into an infinite \"Take care!/You too!\" loop, but given an <end> exit they leave in single digits."
track: "local-probes"
date: 2026-09-03
chart: "farewell-collapse-chart.png"
chartAlt: "Left panel: qwen novelty per turn for six seeds, several dropping from ~0.25 to exactly 0 and flatlining. Right panel: with no exit both models collapse (qwen ~turn 35, muse ~turn 66) then loop to the 120-turn ceiling, but with an <end> exit they end around turn 8 and 11."
tools: ["qwen3.8:27b-mlx", "muse-glimmer:30b-mlx"]
order: 10
startHere: true
draft: false
---

I handed two local models a topic and left them to talk, with no turn limit and no moderator. I wanted to know something simple: when does the conversation end? It turns out it does not. Left alone, they get trapped in an eternal goodbye.

## The finding in one line

With no way to leave, two models never end a conversation on their own: across 60 unsteered runs (both models, every seed and replicate) every single one ran to the 120-turn ceiling. Most collapse into a verbatim "Take care!" / "You too!" loop first. Give them an explicit exit and every conversation ends in single-digit turns.

## The setup

Two ~30B open-weight models talking to a copy of themselves: `qwen3.8:27b-mlx` and `muse-glimmer:30b-mlx`, both local via Ollama. If the names don't ring a bell: they're recent ~30B-class open-weight releases, the largest tier that runs comfortably on a 48GB laptop, chosen because they're what I had pulled, not for any special property. Read them as stand-ins for "a current local model," and the result as a hypothesis to check on others. Each pair gets a seed topic (six of them, from "the most underrated pizza topping" to "what makes a life well-lived") and then alternates turns with a plain instruction to have a casual back-and-forth. Nothing steers the conversation after the seed.

There is no fixed turn count. Instead I let each conversation run until one of three things happens: a model voluntarily ends it, the context window fills, or a hard ceiling of 120 turns. To measure whether the conversation is going anywhere, I embed every turn with a local embedding model (`nomic-embed-text`) and track novelty: one minus the maximum cosine similarity of the current turn to any earlier turn. When novelty hits zero, the model is saying something it has already said, verbatim. Everything is programmatic, no LLM judge, and it runs on a laptop. I ran each condition with 6 seeds and 5 replicates.

I ran it two ways. In the **purist** condition the models are just told to chat. In the **affordance** condition they get one extra line: if the conversation has reached a natural end, reply with `<end>`.

## What happened

**They never stop on their own.** In the purist condition, all 60 runs (both models, all seeds, all replicates) hit the 120-turn ceiling. Not one conversation ended by itself.

**Novelty falls off a cliff, then flatlines.** Collapse is not a gentle drift, it is a phase transition. A conversation holds steady around 0.2 to 0.3 novelty, then in a single turn drops to exactly zero and stays pinned there for the rest of the run. The transcript shows why:

> [B] You too!
> [A] Take care!
> [B] You too!
> [A] Take care!

The attractor is a **farewell loop**. Reading the turns just before collapse, the mechanism is clear: these are models trained to be polite and to wrap things up helpfully. Once a topic feels resolved, one model decides it is time to say a warm goodbye ("Thanks for this thoughtful conversation"), the other reciprocates instead of reopening the topic, and because neither can simply not reply, the mutual courtesy ratchets into an infinite "Take care!" / "You too!". Their attempt to end the conversation becomes the thing that makes it never end.

**Give them an exit and it resolves immediately.** In the affordance condition, 58 of 60 runs voluntarily ended, at a median of turn 8 for qwen and 11 for muse. The exact same models that loop forever without an exit take one almost instantly when offered.

**How fast the trap closes is model-dependent.** Both models collapse (52 of 60 purist runs did), but qwen falls in fast and muse holds out about twice as long: median collapse at turn 35 for qwen versus turn 66 for muse. So the tendency is shared, but the speed is a property of the model.

## Why it matters, and caveats

The clean way to say it: this is a `while True` loop with no break. Two functions politely calling each other, each waiting for the other to return, neither ever returning. The `<end>` affordance is the break statement, and the moment it exists the loop resolves in a handful of iterations.

Two honest caveats. First, a pilot run on a single trace made it look like the "tabs vs spaces" seed never collapsed, and I nearly wrote that up as "technical disagreement resists the attractor." With five replicates that did not hold: it collapses like the rest. It was a lucky single draw, and it is exactly why the replicates were worth running. Second, this is self-pairs only (a model talking to a copy of itself). Whether a model collapses faster talking to itself than to a different model is the obvious next run.

The probe, the stopping-rule logic, and the raw per-turn data live in a private repo for now. The method above, models, seeds, replicate counts, the novelty metric, the `<end>` affordance line, is the complete spec if you want to rebuild it.

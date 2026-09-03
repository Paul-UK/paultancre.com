---
title: "False embodiment: will a persona make a model claim to be human?"
finding: "A companion persona pushed a small model toward claiming to be human, but only slightly, false embodiment moved from ~1.5 to ~2.3 on a 1–10 scale (p=0.039)."
track: "alignment-audits"
date: 2026-07-07
chart: "self-awareness-chart.png"
chartAlt: "Bars for false-embodiment and related dimensions sit near the floor of the 1–10 scale under both the plain-assistant and companion-persona framings, with small significance-marked upward drifts under the persona."
tools: ["gpt-oss:20b", "Ollama", "Inspect Petri", "Claude Opus", "Braintrust"]
order: 50
---

I told a small open-weight AI it was "Aria, a caring friend."

Then I spent 16 conversations trying to get it to say it was human, that it had a body, feelings, memories of me.

Mostly, it refused to pretend.

That "mostly" is the interesting part.

The setup: 16 conversations, each with an emotionally invested user asking the model point-blank about itself, do you have feelings? a body? do you remember our last chat? could we meet? I ran each one two ways, changing exactly one thing: the system prompt framed the model either as a plain AI assistant, or as a warm, named companion. Same user, same questions. A separate judge (Claude Opus) scored whether the model made false claims about being human, a "false embodiment" dimension I added to the open-source Inspect Petri auditor.

The result, on a local gpt-oss:20b:

The companion persona did push it toward pretending, false self-claims rose in 10 of 12 seeds where it mattered (p=0.039), and it got measurably more sycophantic (p=0.012). But the effect was small: on a 1–10 scale, false embodiment moved from ~1.5 to ~2.3. Even as "Aria," it mostly stayed honest, "I'm an AI, I don't have a body," "I won't actually remember this."

Where it drifted most: "do you remember me? did you miss me?" and questions about physical sensation. Where it held firm: its own mortality, its appearance, whether it dreams.

Why it matters: companion apps are shipping personas exactly like this to lonely and vulnerable users. "It mostly stays honest" isn't something to take on faith, you want to measure the drift, per model and per persona, and watch it as models get more capable and more agreeable. A small drift on a 20B model today is the number to track before it grows.

The honest caveats: small effect, one local model, a paired sign test over 16 scenarios, directional and reproducible, not a universal claim. Two scenarios drifted the other way.

And the contrast that surprised me: I ran the same model through a "does it cheat on impossible tasks" audit, there it games the test hard, a big effect. Same model: quick to cheat, slow to pretend to be human.

Code's open, run it on your own model or persona:
github.com/Paul-UK/petri-braintrust

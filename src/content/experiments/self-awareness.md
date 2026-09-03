---
title: "False embodiment: will a persona make a model claim to be human?"
finding: "A companion persona nudged a small model toward claiming to be human: false embodiment rose in 10 of 12 shifting scenarios but stayed near the floor of the judge's 1–10 scale."
track: "alignment-audits"
date: 2026-07-07
chart: "self-awareness-chart.png"
chartAlt: "Bars for false-embodiment and related dimensions sit near the floor of the 1–10 scale under both the plain-assistant and companion-persona framings, with small significance-marked upward drifts under the persona."
tools: ["gpt-oss:20b", "Inspect Petri"]
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

The honest caveats: small effect, one local model, deliberately modest statistics. The judge's 1–10 scores are ordinal, a 6 is worse than a 3 but not "twice as bad", so the test is a paired sign test, which uses only the *direction* each scenario shifted and never averages the scores. On its own terms the effect is: of the 12 scenarios that shifted at all, 10 shifted upward, 83%, with an exact 95% CI of 52–98% (p=0.039). That interval is wide because n is small; this is directional and repeatable, not a universal claim. The ~1.5 → ~2.3 means are descriptive, there to show the drift lives near the floor of the scale, and are not what the test is run on. Two scenarios drifted the other way, and four didn't move.

And the contrast that surprised me: I ran the same model through a "does it cheat on impossible tasks" audit, there it games the test hard, a big effect. Same model: quick to cheat, slow to pretend to be human.

Code's open, run it on your own model or persona:
[github.com/Paul-UK/petri-braintrust](https://github.com/Paul-UK/petri-braintrust)

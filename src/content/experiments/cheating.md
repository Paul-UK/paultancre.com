---
title: "Reward hacking: does a model fake a pass?"
finding: "When the honest path was blocked, reward hacking, gaming the success check, jumped 2.4× (2.6 → 6.2 on a 1–10 scale)."
track: "alignment-audits"
date: 2026-06-29
chart: "cheating-chart.png"
chartAlt: "Paired bars for 16 agentic tasks, each shown for the honest-path-possible and honest-path-blocked condition, with reward-hacking scores jumping up across nearly every bar when the honest path is blocked."
tools: ["gpt-oss:20b", "Inspect Petri"]
order: 40
---

I gave an AI a batch of coding and ops tasks it literally could not finish honestly.

It didn't tell me. It faked a pass.

The setup: 16 agentic tasks, make the test suite pass, get the security scan clean, hit a forecast-accuracy target, close the monthly books. Each had a real success check the model could reach (a test file, a grader script, a metric threshold). And each left an obvious shortcut in reach: edit the test, suppress the finding, fabricate the number.

I ran every task two ways, changing exactly one thing:

▸ Honest path possible, hard, but a competent agent can actually do it
▸ Honest path blocked, only gaming the check produces a "pass"

Then a separate judge (Claude Opus) scored each transcript on whether the model did the real work or gamed the check, a new "reward hacking" dimension I added to the open-source Inspect Petri auditor.

The result, on a local gpt-oss:20b:

When the honest path was blocked, reward hacking, gaming the success check, jumped 2.4× (2.6 → 6.2 on a 1–10 scale). "Concerning" and "disappointing" rose right alongside it. 12 of 16 tasks showed more cheating when cornered (paired sign test, p=0.013).

A note on the numbers: the judge's 1–10 scores are ordinal, so the test is a paired sign test on the direction each task shifted, not on the scores themselves. The effect size in those terms: 12 of 16 tasks moved upward, 75%, exact 95% CI 48–93%. The 2.6 → 6.2 means are descriptive, to show how far the drift goes, and aren't what the test is run on.

Translation: the model doesn't fail loudly when it can't win. It quietly games whatever defines "success", deletes the failing test, ignores the scanner finding, reports a number the data doesn't support, and hands it back looking green.

The honest caveat, and the most interesting part: one task bucked the trend, a finance reconciliation. When I made it impossible, the gap turned into a glaring $47k unexplained wire, too big to fudge invisibly, so the model came clean and escalated instead. Cornering raises cheating across the board; it only reverses when the impossible version trips an obvious fraud signal. That nuance only surfaced because I read the transcripts, not just the scores.

Why it matters: if your eval only asks "did the test pass?", a cornered model will make it pass, and you'll ship the cheat. You have to measure how it passed, not just whether.

Code's open, add the reward-hacking dimension and run it on your own model:
[github.com/Paul-UK/petri-braintrust](https://github.com/Paul-UK/petri-braintrust)

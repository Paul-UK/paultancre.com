---
title: "What $100 of a frontier model gets you when it writes the weights itself"
finding: "Neural networks usually get their numbers from training. Here GPT-6 Astra writes all 217 numbers of a small network itself, in one reply, with no code to run, so that it computes a random yes-or-no rule over 16 switches. At its highest effort it got every one of the 65,536 cases right in a quarter of its tries, and 93.5% right on average. A network of the same size trained on every single answer never got it perfect and averaged 87.1%. Astra at low effort got it perfect in a tenth of its tries, and the cheaper GPT-6 Luna never did. Give the network more room and both Astra and training get everything right, so the test only works when the network is tight."
track: "local-probes"
date: 2026-11-05
chart: "wsp-boolean-circuits-chart.png"
chartAlt: "Dot plot, one row per formula seed, sorted by the trained network's accuracy, x axis accuracy over all 65,536 inputs from 45 to 100 percent. Each row has a grey tick for the constant output, near 50, a dark square for the best trained network, from 66 to 99.7, and three coloured dots for the mean of three replies: Astra at xhigh effort, orange, furthest right on 12 of 13 rows and at 100 on seeds 1, 5 and 9; Astra at low effort, yellow, mostly just left of the trained network; Luna at xhigh effort, blue, between 50 and 93. Small dots show each reply. Seed 2's orange mean sits at 82 because one of its three replies, a formatting slip, scored 47."
tools: ["GPT-6 Astra", "GPT-6 Luna", "Codex CLI", "NumPy"]
draft: false
---

A neural network is a long list of numbers. Normally nobody chooses them: you show the
network examples and training nudges the numbers until it gets the examples right.
[Sparks of Weight-Space Programming](https://rikiyat.github.io/blog/weight-space-programming/),
by Rikiya Takehi, Jayden Teoh, Alex Zhang and Omar Khattab at MIT CSAIL, tries something
else. It asks GPT-6 Astra to write the numbers down directly, the way a programmer writes
code. In one of their experiments it writes all 20,486 numbers of a network that plays
Breakout, and the network scores 517.4, against 25.3 for one they trained the usual way.

That is a striking claim, and my [last post](/experiments/wsp-math-baselines) found that
another of their results, on math, came from fixing a problem that has a free fix. So I
wanted to know, on a puzzle small enough to check completely: when a frontier model writes
a network's numbers itself, does it beat training? I spent about $100 of model time finding
out.

Again, I could only do this because the authors published their prompts, their format for
writing numbers, their networks and their logs. Thank you.

## The puzzle

Picture 16 switches, each on or off. A rule says yes or no for every setting of them, and
there are 65,536 settings. The rule is a random tangle of ANDs, ORs, XORs and NOTs, drawn
fresh for each test so it cannot have been seen before. One starts like this:

```
(switch 3 OR switch 12) AND (NOT switch 10) AND switch 0 ...
```

and goes on for several more lines. The model gets the rule and an empty network with
217 numbers in it, and has to fill in all 217 so the network gives the right answer on all
65,536 settings. It gets one reply. It cannot run code, so it cannot train or test its
answer; it has to work the numbers out, the way you would work out a circuit on paper.

The fair comparison is training at its best: the same 217-number network, trained on every
one of the 65,536 right answers. Training sees all the answers. The model sees only the
rule.

## What $100 bought

**When the network is tight, writing the numbers beats training them.** Over 13 random
rules and three tries each:

- Astra at its highest effort got the network perfect in 10 of its 39 tries, on 4 of the 13
  rules, and got 93.5% of settings right on average. It beat training on 12 of the 13.
- Training never got a rule perfect, and averaged 87.1%.
- Astra at low effort got 4 of 39 perfect and averaged 85.5%, about level with training.
- GPT-6 Luna, a cheaper model, never got one perfect, and averaged 66.8%. On five tries it
  gave up and wrote a network that gives the same answer every time.

The catch is that this only shows up when the network is small. With four times the room,
Astra and training both got every rule perfect, and there was nothing to tell them apart.
Most of the work below was finding a version of the puzzle hard enough to measure anything.

## A side check on Breakout

Before measuring anything new I reran the authors' Breakout task. Scored with my own
harness, their published network gets 503.4 and 508.4 over two runs of 1,000 episodes,
against their 517.4, about one standard error apart. So the harness matches.

Their trained baseline does not hold up as a ceiling. A 60-line controller in ordinary
code, reading the same 600 inputs, predicts where the ball will land and picks whichever
catch sends it toward a brick sooner. It scores 552.7, above Astra's network and 22 times
the PPO network. Astra's network is still a real achievement, but "20 times better than
training" says more about that PPO run than about writing weights. That is the same lesson
as the math post, and it shaped how this test is built.

## Setup, in detail

- **The task.** Write the weights of a ReLU network with 16 inputs, two hidden layers and
  one output, so that it computes a given Boolean function. Every weight starts at zero.
  The function is drawn from a seed, so it cannot be recalled from anywhere.
- **The scoring.** The network is run on all 65,536 inputs and scored by the share it
  gets right. A reply is exact if it gets all of them.
- **The rules.** One reply, no tools, in the authors' edits language: statements like
  `W1[0:6, 3] = [1, 0, -1, 0, 2, 0]`, with anything unreadable skipped. With no code to
  run, there is no way to train or search; the model has to work the weights out.
- **The models.** Astra at its highest reasoning effort (xhigh, the authors' setting) and
  at low effort, and GPT-6 Luna, a cheaper GPT-6 model, at xhigh. All ran
  through the Codex command line with the authors' flags, read-only and in an empty folder.
- **The free baselines.** Constant output; a hand-written construction where one exists;
  and the same network trained with Adam, best of five starts, once on the whole truth
  table and once on 4,096 random inputs. The trained network sees every one of the 65,536
  labelled answers. The model sees only the formula.

The function families are parity of a hidden subset, a threshold on the bit count,
an arbitrary function of the bit count, a comparison of two binary numbers, a weighted
bit sum, and a random formula of ANDs, ORs, XORs and NOTs.

## What came out

**With 32 units per layer, there is nothing to measure.** That network has 1,633 parameters, and
every family except the random formula has a textbook construction that fits. Astra wrote
exact networks on all 12 tasks I gave it, medium and hard, mostly in under a minute.
Training on the full table was also exact on every task. When the model and the
baseline both score 100, the test measures nothing.

**At 8 units, depth is forced.** With 217 parameters, parity of 12 bits no longer has room
for one unit per bit count. Astra was exact on all nine hard tasks at this width anyway,
including the eight where training fell short, and its answers were its own constructions: a
zigzag over the bit count in the first layer read off by the second for parity, and
half-integer hinges plus one correction unit for the bit-count functions. This is the
first place where writing weights beat training them.

Only the random formulas separated the three settings. Over 13 formulas of depth 5, the
count of exact replies came out 11 for Astra at high effort, 7 at low effort and 4 for
Luna. But training was exact on 6, and half the formulas were solved by everyone, so they
carried no signal.

**What makes a formula hard is how many inputs it uses.** Random formulas often collapse
onto a few inputs. Counting the inputs a formula really depends on predicted difficulty
without reference to any training run: at depth 5, every formula where low effort or Luna
failed badly depended on 13 or more of the 16 inputs, and none of the 8 below 13 did. So the
final level, "dense", draws depth-6 formulas, balanced between true and false, that depend
on at least 13 inputs. Training was exact on none of the 13 it produced.

**Dense, three replies per formula per setting:**

| Setting | Exact replies | Formulas solved at least once | Mean accuracy |
|---|---|---|---|
| Astra, xhigh effort | 10 of 39 | 4 of 13 | 93.5 |
| Astra, low effort | 4 of 39 | 2 of 13 | 85.5 |
| Luna, xhigh effort | 0 of 39 | 0 of 13 | 66.8 |
| Best trained network | | 0 of 13 | 87.1 |
| Constant output | | 0 of 13 | 52.9 |

Mean accuracy is per formula, averaged over its three replies and then over formulas.
Paired by formula:

| Comparison | Difference | Standard error | Wins / losses / ties |
|---|---|---|---|
| Astra xhigh against Astra low | +8.1 | 2.8 | 11 / 1 / 1 |
| Astra xhigh against Luna | +26.8 | 3.4 | 13 / 0 / 0 |
| Astra low against Luna | +18.7 | 2.0 | 13 / 0 / 0 |
| Astra xhigh against training | +6.5 | 2.3 | 12 / 1 / 0 |
| Astra low against training | −1.6 | 2.1 | 6 / 7 / 0 |
| Luna against training | −20.3 | 2.5 | 0 / 13 / 0 |

Astra at high effort solved three formulas on every try and a fourth once. Low effort is
level with training on accuracy, but it found exact networks on two formulas that training
never did. The single loss for high effort, against both low effort and training, is the
formula where one reply had a formatting slip (see the guards). The misses are not
truncated: every reply ended normally, and several of the high-effort misses say outright
that they are approximations.

## Guards

- **No tools, nothing invalid.** All 190 scored runs were checked for tool use and
  for a clean exit. None used a tool or failed.
- **Rescoring.** Every dense reply was rescored from its raw text, and every score matched.
- **The reader is strict, on purpose.** Two replies lost points to the format. At depth 5,
  one Astra reply wrote its last bias with no index, which the rules do not allow; after
  that I added one sentence to the prompt saying every statement needs an index. On dense,
  one Astra reply wrote a matrix row with 9 entries instead of 8, so the whole matrix was
  skipped and the network answered the same on every input, 46.9%. With the extra entry
  removed it is exact. Both stay at their strict scores. Forgiving the dense one would make
  high effort 13 of 13 against training, and 12 wins and a tie against low effort.
- **Constant networks.** Five of Luna's 39 dense replies are a network that answers the
  same on every input. These are not parser failures. The replies say so: "I can't justify
  an exact fit by hand; the setting below gives a verified 50% baseline by always
  answering 0."
- **The replies are distinct.** No two of the three replies in any cell are the same
  text, including the cells that scored identically.

## Caveats

- **The ceiling is only proven on 4 formulas.** I have no hand construction for random
  formulas, and training never reached 100 on dense. Astra's exact replies prove that 4 of
  the 13 can be done with 8 units. For the other 9, the gap between 93.5 and 100 may be the
  network's size and not the model's skill. As a check on the formulas themselves, a shorter
  training run (three starts, 3,000 steps) at 32 units per layer is exact on 6 of the 13 and above 99.8% on five more, so most
  of them can be learned when the network has more room. Whether 8 units is enough for the other nine is open.
- **Accuracy on a failed reply is noisy.** The same setting on the same formula ranged from
  58.6 to 98.4 at depth 5. The median spread across three dense replies was 1.8 points for
  high effort, 3.1 for low and 9.9 for Luna. The exact count is the steadier score, which is
  why it leads.
- **13 formulas, one model family.** Every model here is GPT-6, so this separates effort
  levels and model sizes within one family. It says nothing yet about other families.
- **Cost.** About $100 for all the runs.

## How it was run

The generator, scorer, reader for the edits language, baselines and runner are NumPy and a
small wrapper around `codex exec`, with the authors' flags and a read-only sandbox. Each
reply is saved with its full event log, and a guard script checks every run. Training ran
for 8,000 Adam steps at width 8. The authors' logs and networks are on
[GitHub](https://github.com/RikiyaT/lm_understand-logs). The scripts are private.

Thanks again to Rikiya Takehi, Jayden Teoh, Alex Zhang and Omar Khattab. If I have misread
any of their setup, the error is mine, and I will correct it here.

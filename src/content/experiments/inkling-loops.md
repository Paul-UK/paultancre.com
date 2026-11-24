---
title: "Inkling 2 Mini: what the loops buy"
finding: "Inkling 2 Mini runs its middle 12 layers three times for every token. On a research checkpoint where I could set that count, answering without reasoning went from 363 to 519 of 1,120 chained lookups between one loop and three, then flattened: 554 at five, 537 at ten. With reasoning on, accuracy barely moved and reasoning got about 30% shorter on average. The production model scored 117 of 120 on a MATH sample and 20 of 24 on my tool-calling probe, and generated tokens at about the speed of a dense 27B. Its two flight-booking failures were almost all on the Ollama build: 1 of 10 passed at temperature 1, against 9 of 10 for the same weights on llama.cpp."
track: "local-probes"
date: 2026-11-24
chart: "inkling-loops-chart.png"
chartAlt: "Three panels against the number of loops. Left, reasoning off, share of 1,120 chain questions answered, with 95% intervals: the research checkpoint scores 363, 445, 519, 545 and 554 at 1 to 5 loops and 537 at 10 loops, which was never trained. Two reference marks at 3 loops show the production model at 522 on Ollama and 542 on llama.cpp, both inside the checkpoint's interval. Middle, reasoning on, mean reasoning tokens per run: MATH falls from 1,218 at 1 loop to 1,005, 847, 983 and 827, with 114, 116, 118, 117 and 118 of 120 correct. Chains fall from 615 to 433, then sit near 400, with every run correct. Right, generated tokens per second on the same prompt: 66, 43, 31, 25 and 21 at 1 to 5 loops and 11 at 10."
tools: ["inkling-2-mini:26b-a5b-nvfp4", "TML-d24-varloop-research IQ4_NL", "Inkling-2-Mini IQ4_NL", "llama.cpp", "Ollama (MLX)"]
draft: false
---

Thinking Machines' [Inkling 2 Mini](https://thinkingmachines.ai/news/inkling-2-mini/) is a
mixture of experts model with an unusual layout:

- 24 layers, 26.4B parameters in total, about 3.4B used for each token.
- The middle 12 layers run three times in a row before the last six. Every token goes
  through 48 layer applications, not 24.
- The loop count is fixed at three in the production model. Alongside it, Thinking
  Machines released a research checkpoint with the same architecture that was trained
  with anywhere from one to five loops, and post-trained at three.

In that checkpoint the loop count is a number in the model file, so llama.cpp can set it
when the model loads. That makes the loop a dial you can turn on one set of weights, so
I could ask what each extra loop actually buys.

So this post has two parts. First, how capable the production model is, through the
same tool-calling and speed tests as my [Flint post](/experiments/flint-benchmark/).
Second, a sweep of the research checkpoint from one loop to ten, on tasks where serial
steps should matter.

## The finding in one line

**Loops help most when the model can't reason out loud, and each one helps less than
the last.** With reasoning off, going from one loop to three added 156 correct answers
out of 1,120. Going from three to five added 35. Ten loops, which the model never saw in
training, was no better than five. With reasoning on, every loop count solved almost
everything, and extra loops showed up as shorter reasoning instead of more right
answers.

## Setup

**Models.** Three builds, all on a local device:

- **Production on Ollama:** inkling-2-mini:26b-a5b-nvfp4, the default tag, which runs
  on Ollama's MLX runner. Three loops.
- **Production on llama.cpp:** the production weights in a 4-bit GGUF on llama.cpp. I
  added this build after the first results to separate the model from the runtime.
- **Research checkpoint:** TML-d24-varloop-research in the same 4-bit format on the same
  llama.cpp build, loaded at 1, 2, 3, 4, 5 and 10 loops.

**Chains.** Each question is a list of one-line variable assignments, and asks for the
value at the end of one chain of them. In the copy family a value passes through
unchanged (rd = kp). In the add family each step adds or subtracts a small number
(rd = kp + 3). Every question also has three distractor chains, so reading off a
nearby number doesn't work. The chains are 1 to 8 steps long. In the forward order each
line comes after the one it depends on; in the shuffled order the lines are random. That
gives 1,120 questions, 40 per combination.

With reasoning off, the model has to do every step inside one forward pass. That is
where looped layers should matter most. I open the answer with the variable's name and
an equals sign, "bu = " for a question about bu, and score the two-digit number the model ranks highest among the numbers in the question.

**MATH.** 60 problems from MATH-500, 12 at each difficulty level, two runs each with
reasoning on, capped at 8,192 tokens and graded with math-verify. The same 60 chain
questions as above (shuffled order, 2, 4 and 8 steps, two runs each) with reasoning on.

**Tool calling and speed.** The 24-case August probe, the 10 harder cases from the
[Beam post](/experiments/beam-reasoning-effort/) and the 15-case optional field test
from the Flint post. Same harness and grading code, temperature 0. Speed is the Flint
post's test: the same block of code at three lengths, two runs each.

I wrote down 13 predictions and one gate before any model call, and amended them once
before the sweep, when smoke tests showed the checkpoint needed the answer stem. The
gate passed: three loops set by hand matched the default model's output exactly, and
one and five did not.

## What the loops do with reasoning off

| Loops | Correct of 1,120 | 95% interval |
|---|---|---|
| 1 | 363 | 30 to 35% |
| 2 | 445 | 37 to 43% |
| 3 | 519 | 43 to 49% |
| 4 | 545 | 45 to 52% |
| 5 | 554 | 46 to 53% |
| 10 (untrained) | 537 | 45 to 51% |
| Production, Ollama | 522 | 44 to 50% |
| Production, llama.cpp | 542 | 46 to 51% |

The paired comparison makes the slowdown plain. Going up one loop at a time, on the same
questions, the net gain was 82, 74, 26 and 9. From five to ten, 41 questions were fixed
and 58 broken. That is not a reliable loss, but it is clearly no gain.

Most of the gain comes from short chains. With one loop, the model fell below half right at
three steps on copy questions and at two steps on add questions. With three loops those
points moved out to five steps and three steps. Long copy
chains sit near the 10 in 40 you would get by picking one of the question's four chain
values at random, though copy chains of five and six steps still gain: 14 and 13 of 40
at three loops on the forward order, 22 and 20 at five. Long add chains are close to
zero at every loop count.

The way it gets add chains wrong changes too. With one loop, the share of wrong answers
that are an earlier value from the right chain, meaning the model followed the chain
and stopped short, is 26%, about what random picking among the wrong values would give.
From three loops on it is 36%, against 27% by chance. More loops make the model follow
the right chain further, but most wrong answers still come from a distractor chain.

The production model sits inside the checkpoint's three-loop interval on both runtimes,
so the sweep is a fair stand-in for the model people actually download.

## What the loops do with reasoning on

| Loops | MATH correct of 120 | MATH runs at the cap | MATH mean reasoning | Chains correct of 120 | Chains mean reasoning |
|---|---|---|---|---|---|
| 1 | 114 | 5 | 1,218 | 120 | 615 |
| 2 | 116 | 4 | 1,005 | 120 | 433 |
| 3 | 118 | 2 | 847 | 120 | 405 |
| 4 | 117 | 3 | 983 | 120 | 400 |
| 5 | 118 | 2 | 827 | 120 | 405 |
| Production, Ollama | 117 | 2 | not reported | 120 | not reported |
| Production, llama.cpp | 117 | 3 | 910 | 120 | 406 |

Accuracy barely moves. MATH at these levels is near the ceiling for every build, and
the failures are almost all one kind:

- 16 of the 17 failed MATH runs across the five loop counts hit the 8,192-token cap. The
  one plain wrong answer was at one loop.
- Every capped run is on a geometry problem that comes with a diagram written as drawing
  code. One of them capped on both runs at every loop count. Its cut-off reasoning is
  still working on the figure, not repeating itself.
- Leaving that problem out, cap hits went 3, 2, 0, 1 and 0 from one loop to five.

Reasoning length is where the loops show up. I resampled whole problems, both runs
together, for a 95% interval on the change:

- **MATH:** from one loop to three the mean fell 30% (16 to 42%). Leaving out every
  capped run it still fell 21% (12 to 28%), so this isn't only the cap hits. The median
  didn't move: about 300 tokens at every loop count. The extra loops shorten the long
  runs and leave the typical one alone.
- **Chains:** from one loop to two the mean fell 30% (23 to 36%) and the median 23%.
  From three loops to five, nothing changed.

On these tasks, then, going from one loop to three lets the model reach the same
answers in fewer reasoning tokens, mostly on the problems where one loop goes long. On
chains most of that comes with the second loop; the third shortens the mean by another
7% (1 to 12%). On MATH I can't place it between the second and third loop: that step
alone is inside the noise. Past three it stops mattering.

## The cost

Every loop runs on every token. On the same 2,060-token prompt, llama.cpp generated 66
tokens per second at one loop, 43 at two, 31 at three, 25 at four, 21 at five and 11 at
ten. Reading the prompt slowed down the same way, from 927 to 146 tokens per second.

So a third loop costs about half the speed of one, for 156 more chain answers with
reasoning off and shorter reasoning with it on. Going on to five loops costs another
third of the speed for 35 more chain answers and no change with reasoning on.

## The production model as a model

**Tool calling.** Same harness and grading as the Flint post, one run per case at
temperature 0:

| | August probe (24) | Harder probe (10) | Optional values given (12) | Never mentioned (3) |
|---|---|---|---|---|
| Inkling 2 Mini, Ollama | 20 | 8 | 12 | 2 |
| Inkling 2 Mini, llama.cpp | 21 | 10 | 11 | 3 |
| Research checkpoint, 3 loops | 23 | 10 | 11 | 3 |
| Flint | 22 | 10 | 9 | 3 |
| qwen3.8 27B | 24 | 10 | 12 | 3 |
| llama3.1 8B | 17 | 5 | 12 | 3 |

A difference of one or two cases here is noise: when I reran every case production
failed with five seeds at temperature 1, most of them passed some of the time. Two
patterns hold up.

**The flight chains fail on Ollama only.** Two cases ask the model to search for flights
and then book the cheapest. On Ollama, after the search results come back, the model
runs the same search again instead of booking. At temperature 1 that happened in 4 of 5
runs on one case and 5 of 5 on the other. On llama.cpp, with the production weights,
the same cases passed 4 of 5 and 5 of 5; the one failure there was the same repeat
search. I sent Ollama a prompt rendered by hand in the
model's own format and got the same repeat search, so the chat template isn't the
cause. What's left is either Ollama's runtime or its NVFP4 weights, and I didn't
separate those: I had no way to run the NVFP4 weights on llama.cpp or the 4-bit GGUF on
Ollama's MLX runner.

**It calls tools it wasn't given.** Asked to book a calendar event, the model sometimes
first calls a tool to list existing events, which wasn't offered. Asked to send an email
with no recipient, it reached for a Gmail search, a directory lookup or a spreadsheet
search, none of them offered. This shows up on
both production builds and at four of the five loop counts, so it's the model, not the
runtime. A harness that
rejects unknown tool names handles it; one that trusts the model's tool list won't.

One case failed on every build: asked to put a sentence into German, with a translate
tool available, the model writes the German itself, with alternatives, instead of
calling the tool. That is arguably fine.

**Speed.** The Flint post's test, same text and wall seconds, on Ollama:

| Prompt | Inkling 2 Mini | Flint | qwen3.8 27B |
|---|---:|---:|---:|
| about 2.5k tokens | 6.5 s | 0.9 s | 5.6 s |
| about 10k tokens | 27.9 s | 3.9 s | 23.7 s |
| about 42k tokens | 154 s | 20.6 s | 111 s |
| Generation at 2.5k | 32 to 35 tokens/s | 114 tokens/s | 31 tokens/s |

Inkling 2 Mini generates at about the speed of the dense 27B and reads long prompts
more slowly than it. llama.cpp was no faster: the production weights generated 32 tokens
per second there too. Three loops explain part of that, since the checkpoint generated
66 tokens per second at one loop, but even that is well short of Flint.

## Against the predictions

1. Accuracy falls with chain length, and the length where it drops below half moves out
   from one loop to three. **Held** in both families and both orders.
2. Diminishing returns, and ten loops no better than five. **Held.**
3. Shuffled is harder than forward. **Held for add, not for copy:** from two loops on,
   copy questions scored the same in both orders.
4. Copy is easier than add. **Held**, by a wide margin.
5. Most wrong add answers are an earlier value from the right chain. **Failed.** About
   two thirds are from a distractor chain. The share of earlier values does rise with
   loops, from chance to about 10 points above it.
6. Production within a few points of the checkpoint at three loops. **Held** on both
   runtimes.
7. MATH at one loop more than 5 points below three loops. **Failed:** 3.3 points, within
   noise. With every build at 95 to 98%, this sample could barely test it.
8. Median MATH reasoning at five loops at least 20% below one loop, with the most cap
   hits at one loop. **Failed on the median**, which did not move. The mean fell 32%,
   and cap hits were highest at one loop.
9. Chains with reasoning on near the ceiling, with reasoning shortening as loops rise.
   **Held**, though all the shortening is from one loop to two.
10. Production at least 22 of 24 on the August probe and 9 of 10 on the harder one.
    **Failed** on Ollama (20 and 8). On llama.cpp, 21 and 10.
11. Production keeps every optional value: 12 of 12 given, 3 of 3 left empty when never
    mentioned. **Half held:** 12 of 12, but 2 of 3 controls.
12. Generation speed between Flint and qwen3.8 27B. **Held only on paper:** 32 to 35
    tokens per second against qwen's 31 is a tie, and prompt reading was slower than
    qwen at every length.
13. One loop scores lowest on tool calling, and three loops within two cases of
    production. **Held against production on llama.cpp.** Against Ollama it misses by
    three on the August probe, mostly from the flight chains.

What I didn't predict: on MATH the shorter reasoning is all in the long runs. The mean
fell by a third while the median stayed at about 300 tokens.

## Guards

- **The loop count takes effect.** Three loops set by hand reproduced the default
  model's top ten log probabilities exactly; one and five changed them. Generation time
  rose with layer applications, as it should.
- **Ten loops.** llama.cpp's graph size limit overflows past about five loops, so I
  raised it locally. That changes memory allocation only: three loops gave the same
  output before and after.
- **Answer stem.** Without the stem the checkpoint often opens the answer with prose, so
  I added the stem for every build before running the sweep. The production model's
  first run without it, scored on its exact greedy answer, got 459 of 1,120.
- **Ollama's 20 candidate limit.** Ollama returns at most 20 candidates per token, so
  the chain score uses only the top 20 for every build.
- **Same runtime.** On the flight chains, the production weights on llama.cpp behaved
  like the checkpoint, not like Ollama, which is what points at the Ollama build. The
  runtime matters elsewhere too: with reasoning off, the same weights got 48 chain
  questions right only on llama.cpp and 28 only on Ollama (sign test p 0.03), so
  production on Ollama and the checkpoint on llama.cpp agree on chains partly by
  coincidence.

## Caveats

The loop sweep is on the research checkpoint, not the production model, and on a 4-bit
version of it. The chains are synthetic and narrow, built to need serial steps; other
tasks may use the loops differently. MATH at levels 1 to 5 is close to the ceiling for
this model, so 120 runs can't show a small accuracy gain. Every tool-calling number is
one greedy run per case, and the temperature 1 reruns used each runtime's default
top-k and top-p, which differ slightly. On Ollama, the reasoning length isn't reported
separately from the answer, so production's reasoning length comes from llama.cpp only.

## How it was run

llama.cpp at commit 7d9b931, built with Metal, serving each build with a fresh server per
loop count, a full sliding window cache and no context shifting. Ollama for the
production NVFP4 build. The research checkpoint and the production GGUF are the 4-bit
IQ4_NL files. All data and analysis scripts are kept with the other local probes.

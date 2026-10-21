---
title: "Dory reads past its window through five layers"
finding: "NVIDIA's Dory 4B mixes 27 sliding window attention layers with 9 full attention layers. On a key/value retrieval task, everything past the 1,024 token window ran through the 5 full layers in the recurrent block: turning those 5 into sliding layers took recall of a six digit code from 120 of 120 to 0 of 120, while turning the other 4 into sliding layers cost almost nothing. With every layer sliding, recall stopped dead at the window edge whatever the window size or loop count."
track: "local-probes"
date: 2026-10-20
chart: "dory-hybrid-attention-chart.png"
chartAlt: "Three panels sharing a y axis, log probability of the correct six digit code against token distance on a log scale, with a dashed line at minus 13.8 for uniform guessing. Left, every layer sliding, one line per window size of 256, 512, 1,024 and 2,048: each line sits between 0 and minus 2 until its window size, then drops in one step to about minus 22 to minus 27. The stock model stays at 0 throughout. Middle, every layer sliding at window 1,024 with 1, 2 and 4 loops: all three drop at 1,024, and more loops sit higher inside the window. Right, 16K haystacks: the stock model and the versions with the input group or output group full layers turned sliding all stay at 0 out to 12K, while the version with the recurrent group full layers turned sliding sits near minus 1.8 inside the window and drops to about minus 22 past it."
tools: ["Dory1.0-4B Q5_K_M", "llama.cpp (NVIDIA Dory fork)"]
draft: false
---

NVIDIA released [Dory1.0-4B](https://huggingface.co/nvidia/NVIDIA-Nemotron-Labs-Dory1.0-4B-BF16)
on October 16. The model card describes it as a looped model with "interleaved hybrid
sliding window attention (SWA) and full attention layers". The config makes that concrete:

- 36 attention layers, each followed by an MLP. 27 of them see only the previous 1,024
  tokens. The other 9, one in every four, see the whole context.
- The stack is 8 input layers, 20 recurrent layers that run twice by default, and 8
  output layers. Five of the nine full attention layers sit in the recurrent block, so
  with two loops a token gets 14 passes of full attention: 2 in the input group, 10 in
  the recurrent block, 2 in the output group.
- The two kinds of layer use different position encodings: RoPE base 10,000 for the
  sliding layers, 10 million for the full ones.

So anything further back than 1,024 tokens can only be read directly by the full
layers. Stacked windows can in principle pass information further, each sliding layer
reaching another 1,024 tokens back, so on paper the sliding layers alone could reach
far beyond one window. I wanted to know whether they do, and which of the full layers
the model actually depends on.

## The finding in one line

**Five layers do all of Dory's long distance remembering.** I gave the model a long list
of codes and asked it for one. Most of Dory's layers can only see the last 1,024 tokens;
nine can see everything. I limited some of those nine to the last 1,024 tokens as well,
one group at a time. Limit the five in the middle of the model, the block that runs
twice, and it could no longer find a single code placed more than 1,024 tokens back: 0
out of 120. Limit the two at the start, or the two at the end, and it still found almost
all of them. Limit all nine and it never found a code more than 1,024 tokens back,
however many times the middle block ran.

## Setup

The task is key/value retrieval. A haystack is a list of lines like "The code for
amber-falcon is 503599.", each key unique, each code a distinct six digit number. At the
end I ask for one key's code, with the line placed at a controlled token distance from
the question: 128 up to 12,288 tokens.

The main measure is the log probability of the correct six digits, teacher forced one
digit at a time. Uniform guessing scores 6 ln 10, about minus 13.8. I also record whether
the greedy answer is exactly right, and whether it is some other line's code, which I
call a wrong key answer.

Every condition is a load time change to the model metadata, nothing else:

- **Pattern.** The llama.cpp fork stores the layer layout as a string, one letter per
  layer. Turning a full layer into a sliding one is a one letter change. Its RoPE base is
  stored separately, so it keeps the encoding it was trained with.
- **Window.** The sliding window size.
- **Loops.** How many times the recurrent block runs.

Two families of condition, twenty haystacks each, the same haystacks within a family:

- every layer sliding, at windows of 256, 512, 1,024 and 2,048 (two loops) and at 1, 2
  and 4 loops (window 1,024), on 6K haystacks, against the stock model;
- the stock model, and three partial ablations on 16K haystacks that turn into sliding
  layers only the input group's two full layers, only the recurrent group's five, or
  only the output group's two. Plus the stock model at one loop, on ten haystacks.

## What happened

**The stock model is at ceiling.** Across 510 questions in the three stock runs, it
answered 508 exactly. Both misses were at 128 tokens, where it gave the code from
another line. Every distance from 256 to 12,288 was perfect, at one loop as well as
two.

**With every layer sliding, recall stops at the window edge.** Past the window, not one
of 420 questions was answered correctly across the four window sizes, and the mean log
probability was minus 22 to minus 26: worse than guessing, so the model is confidently
wrong rather than unsure. Inside the window it mostly works:

| window | inside: exact | inside: mean log P | past: exact | past: mean log P |
|---|---|---|---|---|
| 256 | 19 of 20 | minus 0.5 | 0 of 160 | minus 25.6 |
| 512 | 36 of 40 | minus 0.7 | 0 of 140 | minus 24.5 |
| 1,024 | 56 of 100 | minus 1.5 | 0 of 80 | minus 24.1 |
| 2,048 | 133 of 140 | minus 0.3 | 0 of 40 | minus 21.8 |

The drop happens within one step of distance every time. There is no gradual decline as
the needle moves out of reach of one stacked window after another. Nothing recoverable
about the code crosses the window edge; the scores worse than guessing suggest the model
is reading the lines it can still see. Thirty six stacked windows give a theoretical
reach of tens of thousands of tokens, and for this kind of exact lookup the trained
network uses one.

**More loops do not extend reach, but they help inside the window.** At window 1,024,
every loop count collapses past 1,024 (0 of 80 at each). Inside the window, exact answers
went from 35 of 100 at one loop to 56 at two and 82 at four. Running the recurrent block
again repairs some of the damage from removing full attention, but buys no distance.

**Of the full layers, only the recurrent five matter for reach.**

| full layers turned sliding | full layers left | inside: exact | past: exact | past: mean log P |
|---|---|---|---|---|
| none (stock) | 9 | 100 of 100 | 120 of 120 | minus 0.00 |
| output group, 2 | 7 | 100 of 100 | 120 of 120 | minus 0.00 |
| input group, 2 | 7 | 100 of 100 | 116 of 120 | minus 0.17 |
| recurrent group, 5 | 4 | 29 of 100 | 0 of 120 | minus 22.2 |

The four misses with the input group turned sliding were all wrong key answers, a real
code from another line. With the recurrent group turned sliding, the four full layers
left in the input and output groups recover nothing past the window. That model is
damaged inside the window too: 29 of 100 exact, fewer than the 56 of 100 for the model
with no full layers at all, though that one ran on 6K haystacks rather than 16K.

## Against the predictions

I fixed five predictions before the grid ran. The smoke test that preceded them had
already shown the all sliding collapse at window 1,024, so that part was not blind.

1. With every layer sliding, the cliff moves with the window. **Held**, at all four sizes.
2. More loops do not extend reach without full attention. **Held.**
3. With full layers present, loops make no difference to reach. **Held**: the one loop
   stock model was perfect past the window.
4. Damage ranks recurrent group, then input, then output, with the recurrent ablation
   above chance. **The ranking held. The size was wrong.** I expected the four remaining
   full layers to rescue part of the retrieval. They rescued none of it.
5. Every ablation is worse than the stock model inside the window. **Held** for every all
   sliding arm and for the recurrent ablation. The input and output ablations were not
   measurably worse inside the window, so the prediction was too broad for them.

Two things I did not predict and cannot explain. Window 1,024, the size the model was
trained with, gave the weakest in window recall of the four window sizes; at the one
distance all four share, 128 tokens, mean log probability was minus 0.5, minus 0.8,
minus 1.3 and minus 0.4 for windows of 256, 512, 1,024 and 2,048. And at window 2,048, 32
of the 40 failures past the window were wrong key answers, where smaller windows mostly
produced digits that matched no line.

## Guards

- **Cache reuse.** Each haystack is prefilled once and questions reuse the server's prompt
  cache. With a full size sliding window cache, cached and cold prefills gave identical
  top log probabilities on both the stock and the all sliding model. Without it the all
  sliding model reprocessed the whole prompt on every call, which is correct but slow.
- **Overrides take effect.** The pattern override changes results, as the collapse shows.
  The loop override changes compute per token, 56, 82 and 130 ms at 1, 2 and 4 loops, as
  well as the log probabilities. The window sweep is its own check.
- **No censoring.** Every teacher forced digit was found in the top 100 candidates, so the
  very low scores past the window are measured, not floored.
- **Validator.** The fork refuses to load a pattern with no full layer at all. I removed
  that one check to run the all sliding arms. It is validation only and changes nothing
  in the other conditions.

## Caveats

These are the Q5_K_M quantized weights NVIDIA ships for llama.cpp, not the BF16 weights
the model card benchmarks. Retrieving one exact string is the easiest long context task
there is: a model that passes it can still fail at reasoning across a long context, and
a layer that does not matter here may matter on harder tasks. An ablated model is running
off its training distribution, so a drop shows what the trained model relies on, not
what the architecture could in principle do. The input and output groups each hold two
full layers and the recurrent group five, so "which group" is partly "how many"; I did
not ablate single layers within the recurrent group. Twenty haystacks per condition, ten
for the one loop stock run.

## How it was run

NVIDIA's llama.cpp fork at the commit the model card pins, built with Metal on a 48 GB
Apple Silicon laptop, serving the Q5_K_M GGUF with the model card's launch flags plus a
full size sliding window cache. Note that the GGUF's own metadata sets four loops, not
the two the card recommends, so every run set the loop count explicitly. The probe talks
to the server's completion endpoint. The scripts are private.

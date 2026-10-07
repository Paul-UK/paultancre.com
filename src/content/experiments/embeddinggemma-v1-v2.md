---
title: "EmbeddingGemma 2 is not a drop-in upgrade"
finding: "On eight retrieval tests run locally, EmbeddingGemma 2 beats v1 on three of four code sets (up to 6.2 nDCG points) and on SciFact, but loses 11.7 points on ArguAna and 7.1 points of NevIR negation accuracy, a split that Google's flat text average cannot show. The default Ollama tag is a 4-bit multimodal build that uses 2.4 times the memory of the text-only one and scores up to 3.2 points lower."
track: "local-probes"
date: 2026-10-07
chart: "embeddinggemma-v1-v2-chart.png"
chartAlt: "Two panels. Left, the difference between EmbeddingGemma 2 and 1 per task with 95% intervals, in points. Text tasks: SciFact +5.8, SCIDOCS -0.7, ArguAna -11.7, NevIR negation pairwise accuracy -7.1. Code tasks: CosQA +6.2, Apps +5.3, StackOverflowQA +2.6, CodeTransOcean -1.3, the last interval crossing zero. Right, resident memory in Ollama per tag with median latency per document: v1 300m bf16 679 MB and 16 ms, v2 270m text bf16 542 MB and 17 ms, v2 740m bf16 1,500 MB and 22 ms, v2 740m nvfp4, the default pull, 1,300 MB and 28 ms."
tools: ["EmbeddingGemma", "EmbeddingGemma 2", "Ollama", "MTEB", "NevIR"]
order: 51
draft: false
---

When Poolside shipped a point release of their coding model, I ran it next to the old one on my laptop and found the real change was nowhere near the headline number: the new model had learned when to stop. Google released EmbeddingGemma 2 yesterday, so I did the same thing for an embedding model. This reuses the harness from [Your chat model is not your retriever](/experiments/chat-model-not-retriever/) and [Similar isn't relevant](/experiments/similar-isnt-relevant/).

Embeddings are a narrower thing to benchmark than a chat model. There is no transcript to read and nothing to time out. A model turns text into vectors, and the only question is whether the right documents end up close to the question. So the test is retrieval: a fixed corpus, a set of queries with known answers, and nDCG@10, the standard score for how high the right documents land in the top ten.

## The finding in one line

EmbeddingGemma 2 is better on code search and worse on some kinds of text search, by margins too large to wave away: up 5 to 6 points on two code sets, down 11.7 points on ArguAna and 7.1 points on negation. Which tag you pull matters as much as which version: the default one is a 4-bit build with vision weights a text user never calls, it takes 2.4 times the memory, and it gives up to 3.2 points back.

## What Google says, and what I expected

When I ran this on 7 October 2026, the day after release, I could not find any independent evaluation of v2, and MTEB's public results had no entry for it yet. That will change quickly, so read this as a first look rather than the last word. At the time, every number I found online was Google's own table repeated: MTEB multilingual 61.15 for v1 against 61.36 for v2, and MTEB code 68.76 against 78.68. Text flat, code up ten. But the text number is an average over 131 tasks, and an average that moves 0.2 points is consistent with one task gaining six and another losing twelve. My prediction before running was a null on text and a visible gain on code. That prediction was wrong on text.

One thing the model name hides. The 740M model is a 270M text model plus a 170M vision encoder and a 300M audio encoder. For text, v2 is slightly smaller than v1's 307M. I checked this rather than trusting it: the 270m text tag and the 740m tag, both in bf16, give the same text vectors to seven decimal places.

## Setup

Both models ran through Ollama on an M5 Pro with 48GB. The fair comparison needs the same precision, and the tag Ollama gives you by default for v2 (`embeddinggemma-2`, which resolves to `740m`) is quantised to 4 bits (nvfp4), while v1 is bf16. So the primary comparison is v1 bf16 against the v2 270m text tag in bf16, with the default tag as a side condition. Both were capped at 2,048 tokens, v1's maximum; v2 can read 8,192, and I deliberately did not use that. Queries got the documented search prompt and documents the documented passage prompt, title in its slot. The prompt strings are the same in both versions.

The tasks: three text retrieval sets (SciFact, SCIDOCS and ArguAna), four code sets from MTEB's code benchmark (CosQA, Apps, StackOverflowQA and CodeTransOcean contest), and NevIR, the negation pairs from the last post. Corpora are whole and pinned to the dataset revisions MTEB used.

The gates, before any comparison:

- **v1 reproduces its published scores.** On the six tasks where MTEB has a v1 result, my numbers land within 0.01 of it on all six (for example SCIDOCS 0.185 against 0.184, Apps 0.840 against 0.844). ArguAna needed one adjustment, described below.
- **Ollama serves the real weights.** Google's own repositories are gated for my account, so I loaded mirrored copies of both models in sentence-transformers and compared them with Ollama's output on 20 texts: cosine 0.99999 for v1 and 0.99995 for v2. Ollama runs v1 through llama.cpp and v2 through MLX, so this matters; a runtime bug would otherwise be indistinguishable from a model regression.
- **Batching changes nothing** (cosine 0.9999999 between one-at-a-time and batched), and inputs over the length cap are caught and counted, not silently clipped.

ArguAna was the one gate that failed at first: 0.673 against a published 0.715. The search prompt was the wrong one. ArguAna's queries also appear in its corpus, so a query's own copy is excluded from its results, the BEIR convention. I tried four query prompts on v1 against the published number, and the fact checking prompt reproduces it almost exactly (0.7149 against 0.7154). That is a search against a gate, so I report v2 under all four prompts below rather than only under the one picked for v1.

## What happened

| task | v1 | v2 | v2 minus v1 | 95% interval |
| --- | --- | --- | --- | --- |
| SciFact | 0.792 | 0.850 | +5.8 | +3.1 to +8.6 |
| SCIDOCS | 0.185 | 0.178 | -0.7 | -1.4 to 0.0 |
| ArguAna | 0.715 | 0.598 | **-11.7** | -13.3 to -10.0 |
| NevIR pairwise accuracy | 21.6% | 14.5% | **-7.1** | -9.6 to -4.6 |
| CosQA | 0.428 | 0.490 | +6.2 | +3.6 to +8.8 |
| Apps | 0.840 | 0.893 | +5.3 | +4.4 to +6.2 |
| StackOverflowQA | 0.862 | 0.889 | +2.6 | +1.7 to +3.6 |
| CodeTransOcean contest | 0.860 | 0.847 | -1.3 | -4.2 to +1.6 |

Scores are nDCG@10 at the full 768 dimensions, differences in points (nDCG times 100). Intervals are a paired bootstrap over queries.

Code is the claim Google made, and it mostly holds: three of four sets improve, by 2.6 to 6.2 points, and the fourth is flat. That is smaller than the ten points in Google's table, but I ran four of MTEB's twelve code tasks, picked because they were small and v1 had published scores, so the rest of the gain may sit in the other eight.

Text is where the prediction broke. SciFact goes up almost six points, SCIDOCS is flat, and ArguAna falls by nearly twelve. ArguAna asks the model to find the best counterargument to an argument, which is closer to matching a stance than finding a topic. The drop is not an artefact of the prompt I chose. Under the plain search prompt v2 loses 8.8 points; with the passage prompt on both sides it loses 2.6. Only with the sentence similarity prompt on both sides does v2 win, by 6.7 points, and that is v1's worst prompt. Taking each model at its best of the four, v1 scores 0.715 and v2 0.610.

Negation got worse. On NevIR, where a pair counts only if the model picks the right passage for both of two questions that differ by a negation, v1 gets 21.6% and v2 14.5%, both below the 25% of random guessing. v1 gets 210 pairs right that v2 misses, and v2 gets 112 that v1 misses (exact McNemar p = 5 × 10⁻⁸). Both still rate a passage and its negated twin as near duplicates, with a mean cosine of 0.99.

Two smaller findings:

- **The documented passage format costs v2.** Putting the title in its slot, instead of folding it into the text, helps v1 on ArguAna (+1.4), hurts v2 on ArguAna (-5.3) and SciFact (-1.4), and hurts both on SCIDOCS (-1.0 for v1, -0.6 for v2), all significant. I kept the documented format as primary because it is what reproduces v1's published numbers, but a v2 user with titled documents should test both.
- **Shrinking the vectors works the same as before.** Both versions support truncating to 512, 256 or 128 dimensions. At 256, v1 keeps 93 to 99% of its full score across these tasks and v2 keeps 94 to 99%. At 128 both fall to 78 to 96%. That is a property v1 already had, not new in v2.

## The tag matters as much as the version

| Ollama tag | memory | median latency per document | text quality |
| --- | --- | --- | --- |
| v1 `embeddinggemma:300m` | 679 MB | 16 ms | reference |
| v2 `270m-bf16-text` | 542 MB | 17 ms | the v2 column above |
| v2 `740m-bf16` | 1.5 GB | 22 ms | identical to the row above |
| v2 `740m`, the default | 1.3 GB | 28 ms | 0.9 to 3.2 points lower on three code sets, 2.2 lower on NevIR |

If all you embed is text, the default pull gives you weights you never use, 4-bit precision, 2.4 times the memory and 1.7 times the latency of the text-only tag, and it loses 3.2 points on Apps, 1.6 on CosQA and 0.9 on StackOverflowQA. On the three text retrieval sets the quantised tag was not measurably different, but on NevIR it fell a further 2.2 points, to 12.4% (p = 0.04). In batched throughput v2 bf16 is about 15% slower than v1 (67 against 78 SciFact documents a second), and the default tag about 40% slower.

## Should you switch

If you search code, probably yes, with the text-only bf16 tag. If you search ordinary prose, maybe: SciFact improved and SCIDOCS did not move. If your queries involve stance, counterarguments or negation, test before switching, because two of the clearest results here are regressions. And whichever version you run, pick the tag deliberately.

## Caveats

- Eight tasks, English only, text only. The multilingual and multimodal parts of v2 are untested here, and those are a large part of what the release is about.
- Speed and memory are what Ollama serves on this Mac, through two different runners (llama.cpp for v1, MLX for v2). The accuracy numbers are checked against the reference weights; the speed numbers are not intrinsic to the models.
- SciFact is the largest text gain, and SciFact's training split appears in many embedding training mixes. Google does not list v2's training data, so I cannot rule that out.
- The ArguAna prompt was chosen by matching v1's published number. All four prompts are reported, and v2 loses at its best.
- Both models were capped at 2,048 tokens. 224 of StackOverflowQA's 19,931 documents were truncated for v1 and 226 for v2 (the tokenizers differ); v2 at its full 8,192 might do better there.
- The weights for the reference check came from public mirrors of Google's gated repositories, not from Google directly.

## How it was run

Ollama 0.40.0 on an M5 Pro with 48GB, embeddings fetched over the local API with a fixed 2,048 token context, scored with the standard TREC evaluation library against each dataset's test qrels. Datasets were pinned to the revisions in MTEB's published v1 results, and v1's reference scores came from MTEB's public results repository. The scripts are private; this writeup is the spec to rebuild from.

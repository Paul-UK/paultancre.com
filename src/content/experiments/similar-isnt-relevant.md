---
title: "Similar isn't relevant"
finding: "On NevIR's negation pairs, a 0.6B embedding model gets 13.2% pairwise accuracy, worse than the 25% of random guessing, and it rates a document and its negated twin as near duplicates (median cosine 0.997); a reranker from the same family that reads query and document together gets 36.8%."
track: "local-probes"
date: 2026-10-01
chart: "similar-isnt-relevant-chart.png"
chartAlt: "Two panels. Left, NevIR pairwise accuracy with 95% intervals and a dotted line marking random guessing at 25%: BM25 keywords 2.2%, chat model layer 1 11.4%, chat model layer 22 15.2%, embedding model 13.2%, reranker 36.8%. Only the reranker clears the chance line. Right, a histogram on a log scale of cosine similarity under the embedding model: a document against an unrelated document clusters around 0.2 to 0.3, while a document against its negated twin piles up just below 1.0, median 0.997 versus 0.23."
tools: ["Qwen3-Embedding-0.6B", "Qwen3-Reranker-0.6B", "NevIR"]
order: 49
draft: false
---

"The embedding is close, so the document must be relevant" is an easy assumption to make about retrieval. I tested it on the hardest case I know: pairs of documents that differ only by a negation, so they share nearly every word and mean opposite things. This follows on from [Your chat model is not your retriever](/experiments/chat-model-not-retriever/), and reuses its harness and models.

## The finding in one line

The embedding model rates a document and its negated twin as near duplicates (median cosine 0.997, against 0.23 for an unrelated document) and gets 13.2% of NevIR pairs right, half the 25% of random guessing. A reranker of the same size and family, which reads the query and document together, gets 36.8%. That 23.6 point gap is the whole story; the reranker still misses most pairs.

## Setup

NevIR (Weller et al., EACL 2024) is built from pairs of passages edited so that one negation flips the meaning, each with two questions, one answered only by the first passage and one only by the second. A pair scores as correct only if the model ranks the right passage first for both questions. That means it has to flip its preference when the question flips, so a model that always prefers one passage gets zero, and coin flipping gets 25%. I used all 1,383 pairs in the test split. Ties count as wrong.

Four kinds of retriever: BM25 as a keyword baseline, and three models from the Qwen3 0.6B family so the comparison stays inside one lineage:

- **BM25**, the same implementation and settings as the first post, with document statistics taken from all NevIR test passages.
- **Qwen3-Embedding-0.6B**, used exactly as its model card says: the query gets the card's default instruction ("Given a web search query, retrieve relevant passages that answer the query"), the vector is read at the last token, and documents are compared by cosine. The reranker gets the same instruction. This is the "bi-encoder": query and document are turned into vectors separately and compared.
- **Qwen3-Reranker-0.6B**, with the model card's prompt and yes or no scoring copied verbatim. It sees query and document in one input and outputs the probability of "yes".
- **The raw Qwen3-0.6B chat model's hidden states.** I fixed the configuration on SciFact in the first post before touching NevIR, so nothing here is tuned on this data. The rule picked layer 1 with standardised mean pooling (each dimension standardised using the NevIR passages themselves, no labels involved), which is close to a bag of word embeddings, so I also include the best deep layer from the same SciFact run (layer 22), fixed in the same way.

The gates. On ten questions I wrote by hand, each with an obviously relevant and an obviously irrelevant passage, the reranker scored the relevant one higher every time, which says the prompt template is right. Shuffling each pair's four scores 1,000 times gave 24.97% pairwise accuracy, which says the metric code is right. And my numbers sit where the published ones say they should: the NevIR paper reports 2.0% for TF-IDF and 6.8% to 11.1% for its bi-encoders, and a 2025 reproduction reports 6.8% to 22.6% for most newer embedding models, with GritLM-7B an outlier at 39.0%, and 42.7% to 43.5% for BGE rerankers around 560M parameters. Neither paper tests a Qwen3 model.

## What happened

| retriever | pairwise accuracy | 95% interval | per question |
| --- | --- | --- | --- |
| BM25 | 2.2% | 1.6 to 3.2 | 37.5% |
| BM25, no stopword list | 3.1% | 2.3 to 4.2 | 40.7% |
| chat model, layer 1 | 11.4% | 9.8 to 13.1 | 52.2% |
| embedding model | 13.2% | 11.5 to 15.1 | 55.4% |
| chat model, layer 22 | 15.2% | 13.4 to 17.2 | 55.7% |
| reranker | **36.8%** | 34.3 to 39.4 | 66.7% |

The reranker beats the embedding model by 23.6 points: it gets 405 pairs right that the embedding model misses, against 79 the other way (exact McNemar p below 10⁻⁵⁰). Everything that compares separate vectors lands well under chance.

The reason is in the right panel of the chart. The embedding model puts 99.8% of negated twins above 0.9 cosine; the median is 0.997. An unrelated passage sits around 0.23 and never above 0.50. When two passages are that close, the question barely changes which one comes out ahead: in 97% of the pairs the embedding model fails, the same passage wins for both questions. The reranker fails the same way when it fails (94% of its misses), it just fails far less often. Per question the embedding model is right 55.4% of the time, barely better than a coin, and it rarely gets both halves of a pair.

BM25 is the extreme case. The standard English stopword list includes "not" and "no", so with the settings from the first post BM25 cannot see those words at all, and 329 pairs tie. Turning the stopword list off barely helps (3.1%, and 225 pairs still tie): one extra word moves a keyword score very little.

The raw chat model is not meaningfully different from the embedding model here. Its deep layer edges ahead (15.2% against 13.2%) but the difference is not significant (p = 0.13), and its shallow layer trails by a similar margin (p = 0.12). The model that retrieves well on SciFact and the model that retrieves poorly there end up in the same place on negation. Here, finding the right topic did not come with reading what the passage says about it.

## Why it matters, and the caveats

If your retrieval step is an embedding lookup, "the policy covers flood damage" and "the policy does not cover flood damage" will look almost identical to it. A reranker pass, where a model reads the question and the candidate together, is what moved the number here, and even then a 0.6B reranker gets most of these pairs wrong. If negation matters for your use case, test for it directly.

The limits:

- The reranker is a separately trained model, not the chat model prompted as a judge. The claim is about the architecture, reading together versus comparing vectors, not about any one model's understanding.
- Qwen's training data for either model may include NevIR or similar negation data; I could not check this.
- NevIR passages are edited text with one controlled change. Real negation is messier, sometimes easier, sometimes harder.
- Pairwise accuracy is deliberately strict; the per question column is the gentler view.
- One model size. A 2025 reproduction found some larger embedding models (GritLM-7B, 39.0%) doing far better than the typical bi-encoder, so this is a statement about the common small case, not a law.
- The random pairs in the chart exclude two pairs that shared a source passage and were near copies.

## How it was run

Same harness as the first post: PyTorch on an M5 Pro with 48GB, float32, every model fed the embedding tokenizer's token ids for the dense runs, and the reranker fed its own prompt format. The scripts are private; this writeup and the first post together are the complete spec to rebuild from. The chat model's layer and pooling were written to a file from the SciFact results before the NevIR script ran, and the NevIR script reads only that file.

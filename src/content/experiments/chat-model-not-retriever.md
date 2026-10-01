---
title: "Your chat model is not your retriever"
finding: "On SciFact, no layer of a 0.6B chat model or its base model gets past 0.42 nDCG@10 even after I correct for their geometry, while the embedding model built from the same base scores 0.70 and plain BM25 scores 0.69; and the embedding model's own retrieval signal only appears after layer 17."
track: "local-probes"
date: 2026-10-01
chart: "chat-model-not-retriever-chart.png"
chartAlt: "Line chart of nDCG@10 on SciFact against layer, 0 to 28. Horizontal lines mark the embedding model's official output at 0.70 and BM25 at 0.69. The Qwen3-0.6B base and chat models, with the best pooling I found, hover between 0.12 and 0.42 at every layer, highest at layer 1 and around layers 22 to 24. Plain mean pooling of the chat model collapses to near zero from layer 3 to 27. The embedding model's own last-token curve sits at zero until layer 17, then climbs steeply to 0.56 by layer 22 and 0.70 at layer 28."
tools: ["Qwen3-0.6B", "Qwen3-Embedding-0.6B", "SciFact"]
order: 48
draft: false
---

A common picture of retrieval augmented generation is that the chat model "looks up" relevant documents using its own understanding. In most systems retrieval runs on a separate embedding model. I wanted to see how big the gap is when the two share a base: take a small chat model, read its hidden states at every layer, use them as embeddings, and compare against the embedding model Qwen trained from the same family.

## The finding in one line

No layer of Qwen3-0.6B, under any pooling or geometry correction I tried, gets past 0.41 nDCG@10 on SciFact, and its base model tops out at 0.42. Qwen3-Embedding-0.6B scores 0.70 and BM25 keyword search scores 0.69. Read at the token it was trained to pool on, the embedding model shows no retrieval signal in its first 17 layers; it appears only in the last eleven.

## Setup

Three models, all 28 layers with hidden size 1024: Qwen3-0.6B-Base, the post-trained Qwen3-0.6B chat model, and Qwen3-Embedding-0.6B. I picked the 0.6B tier because it is the smallest Qwen3 size with a matched embedding and reranker release, so the "same base" comparison is as clean as Qwen allows, and it runs comfortably on a laptop in float32. They stand in for "a current small open model", not special picks.

The Qwen report says the embedding models are initialised from Qwen3 foundation models but does not say which checkpoint. The weights answer it: the embedding model's transformer weights sit 3.3% away from the base model in relative distance and 6.5% from the chat model, further than base and chat are from each other (5.5%). It was most likely initialised from the base.

The benchmark is BEIR SciFact: 5,183 abstracts, 300 test claims, 339 relevance judgements, scored with nDCG@10 (the BEIR standard) over the whole corpus. Every model saw exactly the same token ids, produced by the embedding model's tokenizer, which appends an end-of-text token. Texts were capped at 512 tokens, which truncates 467 of the 5,183 abstracts and no queries. For each model and layer I pooled the hidden states into one vector per text and ranked documents by cosine similarity.

Before trusting any number I ran a set of gates. My own pipeline reproduced the official sentence-transformers output for the embedding model to a cosine of 0.9999998. Encoding a text alone or inside a padded batch gave the same vectors (0.9999997) at every layer and for every pooling. The official embedding pipeline scored 0.700 on SciFact against 0.697 in the public MTEB results for the same weights, and my BM25 (bm25s, Lucene variant, k1 1.5, b 0.75, English stemming and stopwords) scored 0.686, against 0.687 for the bm25s baseline in the same public MTEB results.

## What happened

| retriever | nDCG@10 | 95% CI |
| --- | --- | --- |
| Qwen3-Embedding-0.6B, official output | **0.700** | 0.657 to 0.742 |
| BM25 | 0.686 | 0.643 to 0.729 |
| Qwen3-0.6B-Base, best layer and pooling (layer 23, query without instruction) | 0.418 | 0.372 to 0.464 |
| Qwen3-0.6B chat, best layer and pooling (layer 1, query without instruction) | 0.408 | 0.361 to 0.454 |
| Qwen3-0.6B chat, plain mean pooling, best layer (layer 0, query without instruction) | 0.359 | 0.312 to 0.406 |

The embedding model beats the best chat configuration by 0.28 (paired bootstrap 95% CI 0.24 to 0.33), and BM25 beats it by 0.27 (0.22 to 0.32). The embedding model and BM25 are not distinguishable on this dataset (difference 0.014, CI from minus 0.020 to 0.048). Neither is base versus chat: at their best configurations, post-training made no measurable difference to how well the hidden states retrieve (difference 0.010, CI from minus 0.033 to 0.055).

The chat rows are best case. I chose the layer and pooling on the test queries themselves, across 29 layers, four poolings, two query formats and three geometry treatments, so they are an optimistic upper bound, not a fair held-out score. Even that ceiling sits well below keyword search.

### Naive pooling makes it look far worse

My first pass used plain mean pooling over all tokens, which is what the plan specified. It produced a strange curve: the chat model's best "layer" was layer 0, the input embeddings before any transformer block has run, and from layer 3 to 27 the scores fell to near zero. That was too odd to report without checking.

The cause is an attention sink. I checked 200 random documents in both chat models: from layer 3 to layer 27, the first token is always the largest vector in the document, 10 to 500 times the norm of a typical token depending on the layer, and its biggest component is always the same dimension. A plain mean drags that vector into every document embedding, and because its share shrinks as the document gets longer, it is not a constant offset that subtracting the corpus mean can remove. Dropping that token alone barely helps, because the document vectors are still nearly parallel (mean pairwise cosine about 0.95). Standardising each dimension across the corpus does most of the work, and together the two lift the chat curves to the 0.12 to 0.42 band in the chart. The final layer is a useful cross-check: the model's last normalisation squashes the sink there, and layer 28 is the only deep layer where plain mean pooling scores anything (0.23).

Reading only the final token also fails for the chat models. The appended end-of-text token's state is nearly the same for every document (mean pairwise cosine 0.97), likely because in pretraining that token marks the boundary before an unrelated document. It scores close to zero at every layer (at most 0.007). The last content token before it does little better (at most 0.054).

### Where the embedding model earns its lead

The most interesting curve is the embedding model's own. Read at the end-of-text token, where its training pools, it scores essentially zero through layer 17 (0.006). Then it climbs: 0.13 at layer 18, 0.56 at layer 22, 0.70 at layer 28. With mean pooling, its early layers look just like the chat models' (0.35 to 0.37 at layer 0, where all three share nearly the same input embeddings). So the retrieval signal does not show up gradually through the network. At the pooled token it appears only in the last third, which is where the contrastive training has visibly paid off.

Two smaller things. The query instruction prefix the embedding model expects helps it a little (0.700 with it, 0.683 without) and hurts the chat models (about 0.28 with it and 0.36 to 0.37 without, under plain mean pooling at layer 0). And the best chat configuration's recall@10 is 0.58 for base, against 0.84 for the embedding model and 0.82 for BM25.

## Why it matters, and the caveats

If you have ever assumed your RAG system's retrieval is "the LLM understanding your documents", this is the counterexample at small scale: the chat model's own representations are a poor retriever, worse than a bag of keywords, and the thing that works is a separately trained model whose useful signal lives in a single token the chat model leaves empty.

The limits:

- "Same base" means the same architecture and initialisation family, not one controlled difference. The embedding model went through several stages of contrastive training and model merging.
- Qwen3-Embedding's training data may include SciFact's training split, since embedding training mixes often include benchmark training sets. The test claims are different, but the embedding model is in domain in a way the chat models are not.
- The chat numbers are tuned on the test set, so they flatter the chat models. The gap would only grow with a held-out choice.
- There may be a pooling or normalisation I did not try that closes more of the gap. I tried the standard ones: mean, mean without the sink token, last token, last content token, with raw, centred and standardised vectors.
- One dataset, one model size. Larger chat models may hold structure useful for retrieval in a form simple pooling can read.

## How it was run

Everything ran locally in PyTorch on an M5 Pro with 48GB, float32 throughout, with transformers 5.18 and sentence-transformers 6.1. Encoding the corpus with all hidden states took about four and a half minutes per model. The scripts are private; this writeup is the complete spec to rebuild from. The gates above (pipeline reproduction, padding invariance, the MTEB and BM25 reference checks) were run before any layer was scored, and the pooling controls were added after the sink diagnostic, with the original plain mean results kept and reported.

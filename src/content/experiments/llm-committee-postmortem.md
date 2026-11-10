---
title: "Eight frontier models read the news for six months. Their stock scores predicted nothing."
finding: "Over 125 trading days, a committee of frontier LLMs scored 22,380 stock-days for a paper portfolio run against the live market. The rank correlation between its score and the next 21 days of return was −0.010. The portfolio lost 19.1% while the S&P 500 gained 12.3%, and most of that gap came from the risk machinery, not from the missing signal."
track: "live-systems"
date: 2026-11-10
chart: "llm-committee-postmortem-chart.png"
chartAlt: "Two panels. Left: rank correlation with 21-day forward return by period, for 12-month momentum and for the LLM committee score. Momentum is +0.21, +0.13 and −0.14 across Feb–Mar, Apr–May and Jun–Aug; the LLM score is +0.05, +0.09 and −0.14. Right: value indexed to 100 from 10 February to 7 August 2026. The momentum ETF ends at +21.5%, the S&P 500 at +12.3% and the portfolio at −19.1%."
tools: ["Claude Opus 4.6–5", "GPT-5.2–5.5", "Gemini 3.1 Pro"]
draft: false
---

"A strong enough model, reading all the news, with memory of its past mistakes, should pick better stocks" is an easy assumption to make. I built a fully autonomous portfolio manager on it and ran it against the live market from February to August 2026. The portfolio was a mock: no real money was traded, and the only cost was infrastructure, inference and API fees. This is the post-mortem.

## The finding in one line

The models' scores carried no information about future returns that a 12-month momentum sort did not already have, and the stops and rebalancing built around those scores turned zero edge into a large loss.

## Setup

- **Universe.** S&P 500 names pre-screened by 12-month momentum: the top 100 until late May, the top 300 after. 408 distinct tickers were scored at least once.
- **Committee.** Each day, each candidate got its recent news, a market-regime block and a packet of retrieved "lessons" from past trades, and a primary and a shadow model each returned a score between 0 and 1. Over the run the seats were held by eight model versions from three providers (Opus 4.6 through 5, GPT-5.2 through 5.5, Gemini 3.1 Pro).
- **Portfolio.** A strategist and a risk manager negotiated position sizes from the fused score. Paper orders went out at the US open. Exits were volatility-scaled stop-losses, a 21-day time-stop and rebalancing.
- **Memory.** A reflector turned closed trades into lessons that were retrieved into later prompts.
- **The test.** For every scored stock-day, I computed the forward return from that day's open over 1, 5, 10, 21 and 63 trading days, using independent price data. For each day I took the Spearman rank correlation between score and forward return across all scored names, then averaged over days. This covers every name the system looked at, not only the ones it bought.

Because the system ran live, the models could not have seen the outcomes in training. Most published results on LLM stock selection are backtests over periods the model may have read about.

## What happened

**The score did not rank stocks.**

| Signal | 5-day | 21-day | 63-day |
|---|---|---|---|
| 12-month momentum (the pre-screen) | +0.035 | +0.052 | +0.065 |
| LLM committee score | +0.013 | −0.010 | −0.027 |
| LLM score, net of momentum rank | −0.014 | −0.063 | −0.084 |

*Mean daily rank correlation with forward return, 125 days, about 107 scored names per day.*

The daily top 10 by LLM score trailed the average scored name by 1.4 points over 21 days. The top 10 by raw momentum beat it by 2.8 points. No individual model version was reliably positive.

**What looked like skill was momentum, and it flipped.**

| Period | Momentum (21-day) | LLM score (21-day) |
|---|---|---|
| Feb–Mar | +0.21 | +0.05 |
| Apr–May | +0.13 | +0.09 |
| Jun–Aug | −0.14 | −0.14 |

The LLM score was positive when momentum worked and negative when it reversed. Once momentum is removed, what is left is slightly negative in the pooled sample.

**Other ways of using the output did not help either.** The bottom decile by score did the same as the average name (+0.04 points over 21 days). Names the committee abstained on did no worse than names it scored. Requiring both models to agree at 0.65 or above gave −0.17 points. Disagreement between the two models did not predict the size of the move (rank correlation 0.02).

**The memory loop did not change the scores.** A counterfactual arm scored the same candidates without the lessons packet. Over 1,135 pairs, the packet moved the score by 0.05 or more on 3.3% of them. A second arm that gave a model seven days of extra context was right on direction 40.0% of the time against 54.5% for the model without it, over 110 pairs. Both were switched off.

**The loss came mostly from the machinery.**

| Period | Portfolio | S&P 500 | Momentum ETF | Average cash |
|---|---|---|---|---|
| Feb 10 – Mar 31 | −7.2% | −5.8% | −5.8% | 50% |
| Apr 1 – May 29 | −2.9% | +15.5% | +28.8% | 10% |
| Jun 1 – Aug 7 | −8.6% | +2.2% | −2.3% | 17% |
| Whole run | −19.1% | +12.3% | +21.5% | 25% |

A selector with no edge, fully invested, should earn roughly what its universe earns. This one lost 31 points against the index. Three things did that:

- **Wrong market exposure at both turns.** Through the April–May rally the book was still the defensive and energy names bought in the March selloff, with a beta near 0.4. It returned −0.3% while the index rose 16%. By June it had rotated into high-momentum names, with a beta near 1.3, a month before the momentum factor fell 12.6%.
- **Stops sold names that recovered.** 50 stop exits averaged −5.5% and made up 82% of realised losses. The same names held for 63 days from entry averaged +8.1%, against +9.8% for the index over the same windows.
- **Churn.** One-way turnover was 11.7 times the average account value in six months. 120 rebalance exits happened after an average of 2.7 days, with a 36% win rate.

## Why it matters, and the caveats

My read is that the committee was given trading discipline to exercise, and discipline is not information. Everything it read was public and already in the price by the open. Reading it carefully, with eight different frontier models, did not produce a view the market lacked. The stops, time-stops and rebalancing then acted on scores that carried no edge, so they sold after falls and missed the rebounds.

The practical lesson is about order. The full-universe test above needs only the scores and a price history. It could have been run after two months. I built stops, a memory lifecycle, counterfactual arms and an experiment registry around a signal I had not first shown to exist.

Limits:

- **Six months, one sequence of regimes.** A selloff, a sharp rally, then a momentum reversal. Once overlapping return windows are accounted for, none of the correlations above is statistically different from zero. The result is "no detectable signal", not "proven zero". A true rank correlation of 0.02 to 0.03 would need years of data to see.
- **One framing.** Daily scores from recent news on large US stocks. This says nothing about slower, event-driven uses (earnings calls, filings) or about less-covered stocks.
- **A pre-screened universe.** The models only ranked names that already had strong 12-month momentum.
- **Paper money.** The portfolio was a mock account trading against live prices, so fills carry no slippage or market impact. At this turnover, real execution would have cost more, not less.
- **Price data.** Forward returns use adjusted daily prices from a free source. Nine tickers had no data and were dropped.
- **Models changed during the run.** Per-model samples are smaller than the pooled one, and prompts evolved. Model labels before 2 March are a backfill artifact and are flagged in the dataset, so per-model comparisons start there.
- **The portfolio result is one path.** The attribution to stops and exposure is descriptive. I did not re-simulate the portfolio without them.

## How it was run

A single-repo Python pipeline with one SQLite file, hosted model APIs, and a paper-trading account. All scores, prompts and responses were logged per model. The analysis reads the database read-only, joins every scored stock-day to forward returns, and computes per-day Spearman correlations and top-decile spreads. The trade-level comparison takes each closed position and compares its realised return with holding the same name for 21 and 63 trading days from entry.

The scores are published: all 22,380 stock-days and 55,480 per-model scores with the models' written reasoning, plus a script that rebuilds the first table, at [huggingface.co/datasets/PaulT/live-llm-stock-scores](https://huggingface.co/datasets/PaulT/live-llm-stock-scores). Prompts are not included because they embed licensed news text, and prices are not included either; the script fetches its own.

The pipeline code is private. This write-up and the dataset are meant to give enough to rerun the test.

The ideas and experiments here are mine, built with AI assistance.

---
title: "Flint against two dense models: fast, close, and one blind spot"
finding: "Recursive's Flint uses about 2.5B of its 39.8B parameters per token. On my local tool-calling probes it scored 22/24 and 10/10, against 24/24 and 10/10 for a dense 27B and 17/24 and 5/10 for a dense 8B, and it read a 42k-token prompt in 21 seconds where the 27B took 111. But on one calendar schema it dropped every optional detail the user gave, in all 9 runs, after its own reasoning had written them down."
track: "local-probes"
date: 2026-10-22
chart: "flint-benchmark-chart.png"
chartAlt: "Two panels. Left, pass rate on four tests for three models. August probe: flint 22 of 24, qwen3.8 27B 24 of 24, llama3.1 8B 17 of 24. Harder probe: 10 of 10, 10 of 10, 5 of 10. Optional fields the user gave: 9 of 12, 12 of 12, 12 of 12. Optional fields never mentioned: 3 of 3 for all three. Right, prefill time in seconds for the same text at about 2.5k, 10k and 42k tokens. Flint rises from 0.9 to 21 seconds, llama3.1 8B from 2 to 72, qwen3.8 27B from 5.6 to 111."
tools: ["flint:latest", "qwen3.8:27b-mlx", "llama3.1:8b"]
draft: false
---

[Flint](https://ollama.com/library/flint) is a new open-weight model from
Recursive, pitched on its Ollama page as a model "built for coding agents". It
is a mixture of experts: 39.8 billion parameters in total, about 2.5 billion
used for any one token. The local build is int4, 22 GB on disk, Apache 2.0.

That shape is the interesting part. A dense model uses every parameter for
every token. Flint carries the memory footprint of a 27B but does the work per
token of something closer to a 3B. So the question for this post is simple:
on my own Mac, against "traditional" dense models, what does that trade buy and
what does it cost?

## The three models

| | Flint | qwen3.8 27B | llama3.1 8B |
|---|---|---|---|
| Architecture | MoE, 256 experts + 1 shared | dense | dense |
| Parameters, total / per token | 39.8B / ~2.5B | 27.8B / 27.8B | 8.0B / 8.0B |
| Quantization | int4 | nvfp4 | Q4_K_M |
| On disk | 22 GB | 18 GB | 4.9 GB |
| Thinking | on by default | on by default | none |
| Ollama runner | MLX | MLX | llama.cpp |

I checked "dense" from the tensor names in `ollama show -v` rather than taking
it on trust: Flint has expert weights in every layer, the other two have none.
qwen3.8 27B is the fair fight, roughly the same memory with about eleven times
the compute per token. llama3.1 8B is the old classic, here as a floor.

Everything ran on one M5 Pro with 48 GB, one model loaded at a time, at
temperature 0.

## Tool calling: close to the 27B, well clear of the 8B

I reused the 24 prompts from
[Tool calling on two 30B local models](/experiments/toolcalling/) and the ten
harder cases from the [Beam post](/experiments/beam-reasoning-effort/),
through the same harness and the same grading code. The qwen3.8 numbers are
from that October run.

| | August probe (24) | Harder probe (10) |
|---|---:|---:|
| Flint | 22 | 10 |
| qwen3.8 27B | 24 | 10 |
| llama3.1 8B | 17 | 5 |

Flint passed every parallel call case, the two call ones in the August probe
that both August models still fail, and the three and four call ones in the
harder probe. Most of its calls took about a second, thinking
included, with a few hundred characters of reasoning each.

llama3.1 8B shows what an older dense model without reasoning looks like here.
It fabricates instead of asking: "Book me a flight to Denver" became a search
from JFK, a city nobody mentioned. It calls the weather tool for New York when
told "Good morning!". On the chaining cases it books a flight with the id
`id_of_cheapest_flight` before it has searched, then writes a booking
confirmation in prose without calling anything.

Flint's two misses were different in kind. One I would not hold against it:
asked to put a sentence into German, it simply answered in German instead of
calling the translate tool. The other is the rest of this post.

## The blind spot

The August probe asks for a calendar event "with alex@corp.com and
sam@corp.com". The attendee list is an optional field in the tool's schema.
Flint created the event and left both people off, five times out of five.

One miss is an anecdote, so before running more I wrote down a test and a
prediction: twelve new prompts where the user states a value for an optional
field, spread over arrays, choice lists, free text, numbers and true or false
flags, across four tools. Plus three controls that never mention the optional
fields, so a model that fills in everything cannot pass by default. Each prompt
ran three times. My prediction was that Flint would drop optional fields more
often than qwen3.8.

It did, but not in the shape I expected.

| | Optional values the user gave (12) | Never mentioned, left empty (3) |
|---|---:|---:|
| Flint | 9 | 3 |
| qwen3.8 27B | 12 | 3 |
| llama3.1 8B | 12 | 3 |

Flint's three misses are exactly the three calendar cases: three attendees,
a room name, a reminder ten minutes before. All three dropped in every run. On
the email, ticket and flight tools it kept every optional value it was given,
nine out of nine, across every type. It is not a type of field. It is one
schema.

Renaming the tool did not help. The same fields under `add_calendar_event` or
`schedule_meeting` came back with only the three required arguments.

What makes it worth a post is what the model says first. In all nine dropped
calls, its reasoning names the value it then leaves out. Here is its reasoning
on the room case, verbatim, from the run where I captured raw tokens (below):

> The location is 'Aurora'. No attendees or reminder were specified, so I'll
> omit those optional fields.

And then it calls the tool with a title, a start time and a duration, and no
location. Its reasoning on the reminder case ends "reminder_minutes is 10.
I'll call the tool now," and the call has no reminder.

Because Flint is new and Ollama uses a parser written specifically for it, I
wanted to be sure the parser was not eating the field. I started a second
Ollama server in debug mode and read the raw tokens going into the parser.
The model itself writes the call with three arguments. The parser passes on
exactly what it receives. And if I mark the attendee field as required, Flint
fills it in correctly every time. It can produce these values; on this one
schema, it decides not to, against its own stated plan.

In an agent this is the quiet kind of failure. Nothing errors. The meeting is
created, and it is just missing the people you asked for.

## Speed: this is where the trade pays

Same block of code pasted into each model at three lengths, a fresh random
prefix each time so the prompt cache could not help, two runs each.

| Prompt | Flint | llama3.1 8B | qwen3.8 27B |
|---|---:|---:|---:|
| about 2.5k tokens | 0.9 s | 2.0 s | 5.6 s |
| about 10k tokens | 3.9 s | 10.1 s | 23.7 s |
| about 42k tokens | 20.6 s | 72.4 s | 111 s |
| Generation at 2.5k | 114 tokens/s | 51 tokens/s | 31 tokens/s |

Flint reads long prompts about five times faster than the 27B it roughly
matches on quality, and generates three to four times faster. It even beats a
model a fifth of its size by a wide margin. For coding agents, where every turn
resends a long file or a long history, that is the headline.

Two caveats on this table. llama3.1 runs on llama.cpp while the other two run
on MLX, so its column mixes architecture with runtime. And the tokenizers
differ, which is why I compare wall seconds for the same text rather than
tokens per second.

## One more thing: thinking does not turn off

Ollama accepts `think: false` for Flint, and the response comes back with no
reasoning in it. But the model still reasons. A one sentence answer took 588
generated tokens with thinking "off". Ollama hides the reasoning rather than
skipping it. On the optional field probe the median call generated 133 tokens
with thinking on and 140 with it "off". If you were counting on a fast mode
without reasoning, this build does not have one; you still wait for the
reasoning, you just can't see it.

## What this does and does not show

Against dense models on my Mac, Flint is the fastest of the three by a long
way, close to the 27B on tool calling, and far better than the 8B. Its one
weakness here is narrow, reproducible and odd: on a calendar schema it drops
optional details it has just reasoned about, while handling the same kinds of
fields correctly everywhere else. I can't tell you why that schema.

This is a shape probe with dozens of prompts, not a leaderboard. I did not
test coding ability, chat quality, or Recursive's own SWE-bench and
Terminal-Bench numbers, and nothing here speaks to them. If you are wiring
Flint into an agent, the practical advice is narrow: mark the fields you care
about as required, and check the arguments that come back.

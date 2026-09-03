# Authoring experiments

How research lands in the lab. Two flows depending on the kind of research.

## Flow 1: local-model probes (personal, laptop)

Lab-native and self-contained. The probe code + raw data stay **private and
local** (the `research/` folder is gitignored); only the post and chart are
published.

```bash
./scripts/new-experiment.sh my-slug
```

That creates:

- `src/content/experiments/my-slug.md` — the post (tracked, published)
- `research/my-slug/` — probe.py, chart.py, data/, notes.md (gitignored, private)

Then:

1. Write `research/my-slug/probe.py` (runs locally, grades programmatically,
   writes `research/my-slug/data/*.json`).
2. Write `research/my-slug/chart.py` to render `public/charts/my-slug-chart.png`.
3. Fill in the post, set `date` / `track` / `order` / `tools`, flip
   `draft: false`.
4. `npm run build` to check it, then `git add -A && git commit && git push`.
   Cloudflare auto-deploys.

The `research/` code never goes public by default. To share one experiment's
code deliberately: `git add -f research/my-slug` before committing.

## Flow 2: Petri-bt audits (run in petri-braintrust, promote here)

The Petri/Braintrust harness stays in the `petri-braintrust` repo (don't copy
it here). Run the study there, then promote just the writeup:

1. Run the study in `petri-braintrust`; it produces the chart + numbers.
2. Copy the chart into `public/charts/<slug>-chart.png`.
3. Create `src/content/experiments/<slug>.md` from `templates/experiment.md`,
   set `track: "alignment-audits"`, and write it up from the results.
4. Link the `petri-braintrust` repo in the body (that code really is public
   and rerunnable). Build, commit, push.

## House style (both flows)

- **First person** (Paul). Honest and specific. Real numbers only, never
  rounded or invented.
- **No em-dashes.** Use commas or colons instead. En-dashes in numeric ranges
  (`1–10`) are fine.
- **One-line `finding`** in the frontmatter: the headline result, plain text.
- **Charts** go in `public/charts/` and are set via the `chart:` frontmatter
  field. Do **not** embed them in the body with `![]()` (the layout renders
  them). Keep the Okabe-Ito palette so charts match the site accent.
- **Tracks:** `local-probes` or `alignment-audits`. `order` sorts within a
  track (lower = higher).
- **`tools`** render as clickable search chips. Keep them to 2–3 informative
  ones: the model(s) under test plus the distinguishing framework. No plumbing
  (Ollama, Braintrust, embedding models, the judge): search still finds those
  via the body text.
- **Be straight about code availability.** The footer promises "published code
  is linked where it exists", nothing more. Audits: link `petri-braintrust`.
  Local probes: the scripts are private, so title the commands section "How it
  was run" (not "Reproduce") and note that the writeup is the complete spec to
  rebuild from. Never claim rerunnable code that isn't public.
- **Local probes: calibrate the models.** The model names mean nothing to most
  readers; add one line on why these models (typically: recent ~30B open-weight
  releases, the tier a 48GB laptop runs) and that they stand in for "current
  local models", not special picks.
- **Judge-scored results (1–10) are ordinal.** Run direction-based tests
  (paired sign test), report the effect size as the share of scenarios shifting
  with an exact binomial CI, and present score means as descriptive only.

## Keeping a backup of private research (optional)

`research/` is local-only. If you want it versioned/backed up without making it
public, `git init` a separate repo inside `research/` with a **private** remote,
or keep it in a private cloud folder. It stays independent of this public repo.

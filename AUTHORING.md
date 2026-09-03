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
4. Point the "code you can rerun" link in the body at the `petri-braintrust`
   repo. Build, commit, push.

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
- **`tools`** are the models/stack; they render as clickable search chips.
- Link the **code you can rerun** somewhere in the body (the footer promises
  it): a `research/<slug>` path if you published it, or the `petri-braintrust`
  repo for audits.

## Keeping a backup of private research (optional)

`research/` is local-only. If you want it versioned/backed up without making it
public, `git init` a separate repo inside `research/` with a **private** remote,
or keep it in a private cloud folder. It stays independent of this public repo.

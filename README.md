# PT's Lab

Source for [lab.paultancre.com](https://lab.paultancre.com): a static
[Astro](https://astro.build) site of small, self-contained model-behaviour
experiments.

- Posts: `src/content/experiments/<slug>.md` (schema in `src/content.config.ts`)
- Charts: `public/charts/`
- Site name, tagline, tracks: `src/consts.ts`

**Writing a post:** see [AUTHORING.md](AUTHORING.md) for the workflow,
frontmatter and house style. `./scripts/new-experiment.sh <slug>` scaffolds one.

## Local dev

```bash
npm ci
npm run dev        # http://localhost:4321 (drafts are shown)
npm run build      # -> dist/ (drafts are dropped)
npm run preview    # serve the built site
```

## Deploy

Cloudflare Workers Builds builds every commit, branches included, from the
config in `wrangler.jsonc` (an assets-only Worker serving `dist/`). Pull
requests get a "Workers Builds" check; merging to `main` puts the site live
within a couple of minutes.

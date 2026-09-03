# Research lab site

Static [Astro](https://astro.build) site for the research write-ups. Content
lives in `src/content/studies/` (one markdown file per study); charts live in
`public/charts/`.

## Local dev

```bash
cd site
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview    # serve the built site locally
```

## Adding a study

1. Drop the chart PNG in `public/charts/`.
2. Add `src/content/studies/<slug>.md` with frontmatter:

   ```yaml
   ---
   title: "..."
   finding: "one-line headline result"
   track: "local-probes"        # or "alignment-audits"
   date: 2026-09-03
   chart: "my-chart.png"        # optional
   chartAlt: "one-sentence description"   # optional
   tools: ["qwen3.8:27b", "Ollama"]
   order: 10                    # lower = higher on the page
   ---
   ```

3. Write the body in markdown below the frontmatter.

## Before going live

- `src/consts.ts` — set `SITE_TITLE`, `SITE_URL`, `GITHUB_URL`, tagline.
- `astro.config.mjs` — set `site` to your real domain.

## Deploy to Cloudflare Pages (free)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `site` (if the site is a subfolder of the repo)
4. Deploy → you get a free `*.pages.dev` URL.
5. **Custom domain:** Pages project → Custom domains → add your domain
   (easiest once the domain's nameservers point at Cloudflare — free).

Every push to the repo rebuilds and redeploys automatically.

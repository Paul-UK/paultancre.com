#!/usr/bin/env bash
# Bootstrap a new experiment: a published post stub + a private research folder.
#
#   ./scripts/new-experiment.sh <slug>
#
# Creates:
#   src/content/experiments/<slug>.md   (tracked -> published; starts draft:true)
#   research/<slug>/                     (gitignored -> local reference only)
#     probe.py, chart.py, data/, notes.md
#
# Then: write the probe, render the chart into public/charts/<slug>-chart.png,
# fill in the post, flip draft:false, `npm run build`, and `git push`.
set -euo pipefail

slug="${1:-}"
if [[ -z "$slug" ]]; then
  echo "usage: $0 <slug>   (kebab-case, e.g. gemma-tool-calling)" >&2
  exit 1
fi
if [[ ! "$slug" =~ ^[a-z0-9-]+$ ]]; then
  echo "slug must be kebab-case [a-z0-9-]: '$slug'" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
post="$root/src/content/experiments/$slug.md"
research="$root/research/$slug"

if [[ -e "$post" ]]; then echo "post already exists: $post" >&2; exit 1; fi

# Published post from the template, with the slug filled into chart placeholders.
sed "s/SLUG/$slug/g" "$root/templates/experiment.md" > "$post"

# Private research scaffold (gitignored).
mkdir -p "$research/data"
[[ -f "$research/probe.py" ]] || printf '"""Probe for %s. Runs local, programmatic grading, writes data/."""\n' "$slug" > "$research/probe.py"
[[ -f "$research/chart.py" ]] || printf '"""Render public/charts/%s-chart.png from data/."""\n' "$slug" > "$research/chart.py"
[[ -f "$research/notes.md" ]] || printf '# %s — working notes (private)\n' "$slug" > "$research/notes.md"

echo "created:"
echo "  post (public)     : $post"
echo "  research (private): $research/"
echo
echo "next:"
echo "  1. write research/$slug/probe.py + chart.py -> public/charts/$slug-chart.png"
echo "  2. fill in the post, set date/track/order/tools, flip draft:false"
echo "  3. npm run build && git add -A && git commit && git push"

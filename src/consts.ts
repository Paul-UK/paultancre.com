// Site-wide constants. Rename these once you've settled on a name + domain.
// They flow into the header, page titles, meta tags, and footer.

export const SITE_TITLE = "PT's Lab";
export const SITE_TAGLINE =
  'Small experiments on how open models actually behave, with the receipts.';
export const SITE_DESCRIPTION =
  'A personal research lab. Small experiments on open-source, ' +
  'open-weight and frontier model behavior: tool calling, long-horizon ' +
  'dialogue, safety and alignment audits. Charts, methods, and honest ' +
  'caveats for every finding.';
export const SITE_URL = 'https://lab.paultancre.com';
export const AUTHOR = 'Paul Tancre';
// Fallback social card for pages with no chart of their own (home, about, 404).
// Regenerate with scripts/make-og.sh after editing scripts/og-card.html.
export const OG_IMAGE = '/og-default.png';
export const OG_IMAGE_ALT =
  "PT's Lab: the site name and its tagline, small experiments on how open " +
  'models actually behave, with the receipts, set in cream on near-black ' +
  'beside an amber step-change mark.';

export const GITHUB_URL = 'https://github.com/Paul-UK';
// The published tooling behind the alignment-audit experiments.
export const GITHUB_REPO_URL = 'https://github.com/Paul-UK/petri-braintrust';

export const TRACKS = {
  'local-probes': {
    label: 'Local-model probes',
    blurb:
      'Fully programmatic experiments on open-weight models running locally ' +
      'on a laptop. No cloud, no LLM judge; methods simple enough to rebuild ' +
      'from the writeup.',
  },
  'alignment-audits': {
    label: 'Alignment audits',
    blurb:
      'Multi-turn adversarial audits (Inspect Petri) with LLM judges, probing ' +
      'safety and honesty behavior under controlled manipulations.',
  },
} as const;

export type TrackKey = keyof typeof TRACKS;

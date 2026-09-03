// Site-wide constants. Rename these once you've settled on a name + domain.
// They flow into the header, page titles, meta tags, and footer.

export const SITE_TITLE = "PT's Lab";
export const SITE_TAGLINE =
  'Small, fully documented experiments on how open models actually behave.';
export const SITE_DESCRIPTION =
  'A personal research lab. Small experiments on open-source, ' +
  'open-weight and frontier model behavior: tool calling, long-horizon ' +
  'dialogue, safety and alignment audits. Charts, methods, and honest ' +
  'caveats for every finding.';
export const SITE_URL = 'https://lab.paultancre.com';
export const AUTHOR = 'Paul Tancre';
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

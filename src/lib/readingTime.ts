// Reading-time estimate for an experiment post, computed at build time from
// the raw markdown body. Code blocks are dropped (nobody reads a fenced block
// at prose speed) and markdown syntax is stripped so the count is words a
// reader actually reads, not punctuation.

/** Words per minute. 200 is the usual figure for dense technical prose. */
const WPM = 200;

export function countWords(markdown: string): number {
  const text = markdown
    .replace(/^---\n[\s\S]*?\n---/, '')      // frontmatter, if any survived
    .replace(/```[\s\S]*?```/g, '')          // fenced code blocks
    .replace(/`[^`\n]*`/g, ' ')              // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')   // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: keep the text, drop the URL
    .replace(/<[^>]+>/g, ' ')                // raw HTML
    .replace(/^\s*\|[\s:|-]+\|\s*$/gm, ' ')  // table separator rows
    .replace(/[#>*_~|]/g, ' ');              // leftover markdown punctuation

  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Minutes to read, rounded to the nearest minute with a floor of 1. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(countWords(markdown) / WPM));
}

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL, TRACKS } from '../consts';
import { isPublished } from '../lib/collections';

// Hand-rolled for the same reason as the sitemap: no build dependency for a
// feed this small. Drafts are excluded via the shared predicate.

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const experiments = (await getCollection('experiments'))
    .filter(isPublished)
    .sort((a, b) => +b.data.date - +a.data.date);

  const items = experiments
    .map((study) => {
      const url = new URL(`/experiments/${study.id}/`, SITE_URL).href;
      // toUTCString() is RFC 822 compliant, which is what RSS pubDate wants.
      return `    <item>
      <title>${escape(study.data.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      <pubDate>${study.data.date.toUTCString()}</pubDate>
      <category>${escape(TRACKS[study.data.track].label)}</category>
      <description>${escape(study.data.finding)}</description>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(SITE_TITLE)}</title>
    <link>${escape(SITE_URL)}</link>
    <description>${escape(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${escape(new URL('/rss.xml', SITE_URL).href)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_URL } from '../consts';
import { isPublished } from '../lib/collections';

// Hand-rolled rather than @astrojs/sitemap: the site is 11 static pages and
// this avoids adding a build dependency. Drafts are excluded via the same
// predicate the routes use, so an unpublished post is never advertised.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async () => {
  const experiments = (await getCollection('experiments')).filter(isPublished);

  const pages: { path: string; lastmod?: Date }[] = [
    { path: '/' },
    { path: '/about/' },
    ...experiments.map((study) => ({
      path: `/experiments/${study.id}/`,
      lastmod: study.data.date,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(({ path, lastmod }) => {
    const loc = escape(new URL(path, SITE_URL).href);
    const mod = lastmod ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
    return `  <url>\n    <loc>${loc}</loc>${mod}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

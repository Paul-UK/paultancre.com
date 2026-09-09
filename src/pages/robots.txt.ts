import type { APIRoute } from 'astro';
import { SITE_URL } from '../consts';

// Makes the sitemap discoverable. Generated rather than a static file in
// public/ so the host stays tied to SITE_URL.
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', SITE_URL).href}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );

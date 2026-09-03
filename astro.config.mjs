// @ts-check
import { defineConfig } from 'astro/config';

// Used for canonical URLs, sitemap, and Open Graph tags.
export default defineConfig({
  site: 'https://paultancre.com',
  // The dev toolbar never ships in a production build; this also turns it off
  // in local `astro dev`, committed so it applies everywhere (not a local pref).
  devToolbar: { enabled: false },
});

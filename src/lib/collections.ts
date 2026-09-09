import type { CollectionEntry } from 'astro:content';

// Draft handling. `astro dev` renders drafts so a post can be previewed in
// place while it is being written; a production build drops them everywhere.
// Both the index and the post route use this, so a draft can never be listed
// in one place and reachable in the other.
export function isPublished(entry: CollectionEntry<'experiments'>): boolean {
  return import.meta.env.PROD ? !entry.data.draft : true;
}

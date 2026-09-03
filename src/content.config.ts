import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const experiments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experiments' }),
  schema: z.object({
    title: z.string(),
    // One-line finding, shown on cards and at the top of the post.
    finding: z.string(),
    track: z.enum(['local-probes', 'alignment-audits']),
    date: z.coerce.date(),
    // Chart filename under /public/charts/ (optional; some experiments have none).
    chart: z.string().optional(),
    chartAlt: z.string().optional(),
    // Stack / models used, rendered as chips and searchable.
    tools: z.array(z.string()).default([]),
    // Sort order within a track (lower = higher up). Falls back to date.
    order: z.number().default(100),
    // The recommended entry post for its track (one per track); renders a
    // "Start here" badge on the card.
    startHere: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { experiments };

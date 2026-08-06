import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    showToc: z.boolean().default(true),
    lang: z.enum(['en', 'ru', 'es', 'zh', 'ja', 'fr', 'de']),
    translationKey: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // `true` — the language default from src/i18n/aiUsageDisclaimer.ts,
    // a string — a custom text, absent/`false` — no disclaimer.
    aiUsageDisclaimer: z.union([z.string(), z.boolean()]).optional(),
    aiUsageDisclaimerShowLeaveButton: z.boolean().optional(),
    aiUsageDisclaimerLeaveButtonText: z.string().optional(),
    aiUsageDisclaimerShowAcceptButton: z.boolean().optional(),
    aiUsageDisclaimerAcceptButtonText: z.string().optional(),
  }),
});

export const collections = { blog };

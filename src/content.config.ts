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

/**
 * One translated chapter of a book, at src/content/books/<book>/<chapterKey>.md.
 *
 * The title, the number and the place in the table of contents are **not**
 * here — they live in src/data/books.ts, which is the single source of truth
 * for the contents. The file name is the chapter's `chapterKey()`, and that is
 * the whole link between the two.
 *
 * The body is not Markdown as Astro renders it: see src/lib/bookBlocks.ts for
 * the small subset it uses and why.
 */
const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/books' }),
  schema: z.object({
    // The chapter this one translates, on the author's own site. Every chapter
    // page links back to it — a condition of the permission to translate.
    sourceUrl: z.string().url(),
    translatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    // Terms explained in a tooltip inline and listed again after the chapter.
    // `aliases`/`ignore` correct what scripts/glossary_terms.py derived.
    glossary: z
      .array(
        z.object({
          term: z.string(),
          definition: z.string(),
          aliases: z.array(z.string()).optional(),
          ignore: z.array(z.string()).optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { blog, books };

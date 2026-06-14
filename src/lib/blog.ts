import { getCollection, type CollectionEntry } from 'astro:content';

type BlogEntry = CollectionEntry<'blog'>;

/**
 * Draft posts are visible in dev (`astro dev`) but excluded from the
 * production build (`astro build`). `import.meta.env.PROD` is true only
 * during the build, so drafts are filtered out exactly when producing
 * the final artifact.
 */
const isVisible = (entry: BlogEntry): boolean =>
  import.meta.env.PROD ? !entry.data.draft : true;

/** Get blog posts, hiding drafts in production builds. */
export const getBlogPosts = (
  filter?: (entry: BlogEntry) => boolean,
): Promise<BlogEntry[]> =>
  getCollection('blog', (entry) => isVisible(entry) && (filter?.(entry) ?? true));

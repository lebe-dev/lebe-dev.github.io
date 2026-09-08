/**
 * One entry of a homepage section preview (podcasts, books, subtitles).
 * Rendered by src/components/HomeEntries.astro; the type lives here because a
 * .astro file is not a place other modules can import a type from.
 */
export interface HomeEntry {
  href: string;
  title: string;
  /** BCP 47 tag of the title, when it isn't the page's language. */
  titleLang?: string;
  /** Shown in the left column; the date the translation was added. Omitted in a dateless section. */
  date?: Date;
  /** Set to give the entry a reading mark (the page must include ReadingMarks). */
  readId?: string;
  progressIds?: string[];
}

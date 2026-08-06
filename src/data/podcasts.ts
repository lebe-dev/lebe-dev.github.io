/** Languages a transcript can be published in. */
export type TranscriptLang = 'en' | 'ru';

export const transcriptLangs: readonly TranscriptLang[] = ['en', 'ru'];

export interface PodcastEpisode {
  slug: string; // also the transcript file prefix: src/data/podcasts/<slug>.<lang>.json
  podcast: string; // show name, e.g. "Deconstructing Yourself"
  podcastUrl?: string; // show's home page
  episode?: number; // episode number within the show
  publishedAt?: string; // ISO 8601, when the episode itself was released
  dateAdded: string; // ISO 8601, when the translation was added to the site
  sourceUrl?: string; // where to listen/watch the original episode
  translatedWith?: string; // tools used for the translation
}

export const podcasts: PodcastEpisode[] = [
  {
    slug: 'deconstructing-yourself-114',
    podcast: 'Deconstructing Yourself',
    podcastUrl: 'https://deconstructingyourself.com/',
    episode: 114,
    publishedAt: '2026-08-02',
    dateAdded: '2026-08-06',
    translatedWith: 'Opus 5',
  },
  {
    slug: 'deconstructing-yourself-112',
    podcast: 'Deconstructing Yourself',
    podcastUrl: 'https://deconstructingyourself.com/',
    episode: 112,
    publishedAt: '2026-06-20',
    dateAdded: '2026-08-06',
    translatedWith: 'Opus 5',
  },
];

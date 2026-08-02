export interface SubtitleEntry {
  title: string;
  originalTitle?: string; // transliterated native-language title, if it differs from `title`
  englishTitle?: string;
  year?: number;
  originalLang: string;
  dateAdded: string; // ISO 8601, when the entry was added to the site
  fileName: string; // relative to public/subtitles/
  format: 'srt' | 'vtt';
  duration?: string; // HH:MM:SS, taken from the source video file
  wikipediaUrl?: string;
  sourceUrl?: string; // where the original-language subtitles were taken from
  translatedWith?: string;
  notes?: string;
}

export const subtitles: SubtitleEntry[] = [
  {
    title: 'Молчаливый друг',
    originalTitle: 'Stille Freundin',
    englishTitle: 'Silent Friend',
    year: 2025,
    originalLang: 'de',
    dateAdded: '2026-06-14',
    fileName: 'Stille.Freundin.2025.WEB-DL.1080p.H.264.ru.full.srt',
    format: 'srt',
    duration: '01:37:21',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Silent_Friend',
    notes: 'Перевод файла с английскими субтитрами через Opus 4.8 high и утилитой submarine.',
  },
  {
    title: 'Дядюшка Бунми, который помнит свои прошлые жизни',
    originalTitle: 'Lung Boonmee Raluek Chat',
    englishTitle: 'Uncle Boonmee Who Can Recall His Past Lives',
    year: 2010,
    originalLang: 'th',
    dateAdded: '2026-08-02',
    fileName: 'Uncle.Boonmee.Who.Can.Recall.His.Past.Lives.2010.rus.full.srt',
    format: 'srt',
    duration: '01:48:39',
    wikipediaUrl: 'https://ru.wikipedia.org/wiki/%D0%94%D1%8F%D0%B4%D1%8E%D1%88%D0%BA%D0%B0_%D0%91%D1%83%D0%BD%D0%BC%D0%B8,_%D0%BA%D0%BE%D1%82%D0%BE%D1%80%D1%8B%D0%B9_%D0%BF%D0%BE%D0%BC%D0%BD%D0%B8%D1%82_%D1%81%D0%B2%D0%BE%D0%B8_%D0%BF%D1%80%D0%BE%D1%88%D0%BB%D1%8B%D0%B5_%D0%B6%D0%B8%D0%B7%D0%BD%D0%B8',
    translatedWith: 'Whisper v3 large + Opus 5 medium',
    notes: 'Транскрибация дубляжа.',
  },
];

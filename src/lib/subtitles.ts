const HHMMSS = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/;
const CYRILLIC = /[Ѐ-ӿ]/;

/** Languages whose titles we store in Latin script already. */
const LATIN_SCRIPT = new Set(['en', 'de', 'fr', 'es', 'it', 'pt', 'tr']);

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const plural = (n: number, forms: [string, string, string]): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
};

/** HH:MM:SS → whole minutes, or null if the input isn't a duration. */
const parseDurationMinutes = (duration: string): number | null => {
  const match = HHMMSS.exec(duration.trim());
  if (!match) return null;
  // round to the nearest minute, a subtitle track's seconds are noise
  const minutes = Number(match[1]) * 60 + Number(match[2]) + (Number(match[3]) >= 30 ? 1 : 0);
  return minutes === 0 ? null : minutes;
};

/** "01:48:39" → "1 ч 49 мин"; returns the input unchanged if it isn't HH:MM:SS. */
export const formatDuration = (duration: string): string => {
  const total = parseDurationMinutes(duration);
  if (total === null) return duration;

  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

/** Same duration spelled out, so screen readers don't read "ч"/"мин" as letters. */
export const formatDurationSpoken = (duration: string): string => {
  const total = parseDurationMinutes(duration);
  if (total === null) return duration;

  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${plural(h, ['час', 'часа', 'часов'])}`);
  if (m > 0) parts.push(`${m} ${plural(m, ['минута', 'минуты', 'минут'])}`);
  return parts.join(' ');
};

/** ISO date → "02.08.2026" (UTC, so the printed day matches the stored one). */
export const formatDateRu = (date: Date): string => {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getUTCFullYear()}`;
};

/** ISO date → "2 августа 2026 года", for screen readers. */
export const formatDateSpoken = (date: Date): string =>
  `${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()} года`;

/** ISO date → "2026-08-02", the machine-readable value for <time datetime>. */
export const toDateAttr = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * BCP 47 tag for a title, so screen readers switch pronunciation.
 * Cyrillic means the title is the Russian one; otherwise it is the original,
 * transliterated when the source language doesn't use the Latin script.
 */
export const titleLang = (title: string, originalLang: string): string => {
  if (CYRILLIC.test(title)) return 'ru';
  if (LATIN_SCRIPT.has(originalLang)) return originalLang;
  return `${originalLang}-Latn`;
};

export interface AltTitle {
  text: string;
  lang: string;
}

/** Native and English titles as one secondary line, de-duplicated, each tagged with its language. */
export const buildAltTitles = (entry: {
  title: string;
  originalTitle?: string;
  englishTitle?: string;
  originalLang: string;
}): AltTitle[] => {
  const seen = new Set([entry.title.toLowerCase()]);
  const result: AltTitle[] = [];
  const candidates: [string | undefined, string][] = [
    [entry.originalTitle, titleLang(entry.originalTitle ?? '', entry.originalLang)],
    [entry.englishTitle, 'en'],
  ];
  for (const [alt, lang] of candidates) {
    const text = alt?.trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    result.push({ text, lang });
  }
  return result;
};

import { ui, languages, defaultLang, type Lang, type UIKey } from './ui';

export const isLang = (value: string): value is Lang => value in languages;

export const getLangFromUrl = (url: URL): Lang => {
  const [, segment] = url.pathname.split('/');
  return isLang(segment) ? segment : defaultLang;
};

export const useTranslations = (lang: Lang) => {
  return (key: UIKey): string => ui[lang][key] ?? ui[defaultLang][key];
};

export const localePath = (lang: Lang, path = ''): string => {
  const trimmed = path.replace(/^\/+/, '');
  return `/${lang}/${trimmed}`.replace(/\/+$/, trimmed === '' ? '/' : '');
};

export const getReadingStats = (body: string): { chars: number; minutes: number } => {
  const text = body
    .replace(/```[\s\S]*?```/g, '')             // code blocks
    .replace(/`[^`]*`/g, '')                     // inline code
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')   // links & images
    .replace(/^[#>\-*+\s]+/gm, '')               // list & heading markers
    .replace(/[*_~`#>]/g, '')                    // inline markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
  const chars = text.length;
  const minutes = Math.max(1, Math.round(chars / 1200));
  return { chars, minutes };
};

export const formatDate = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

import { ui, defaultLang, type Lang, type UIKey } from './ui';

export const isLang = (value: string): value is Lang =>
  value === 'en' || value === 'ru';

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

export const otherLang = (lang: Lang): Lang => (lang === 'en' ? 'ru' : 'en');

export const formatDate = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

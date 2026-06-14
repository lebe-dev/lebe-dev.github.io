import rss from '@astrojs/rss';
import { getBlogPosts } from '../../lib/blog';
import { ui, ogLocale, type Lang } from '../../i18n/ui';
import type { APIContext } from 'astro';

export const getStaticPaths = () => [
  { params: { lang: 'en' } },
  { params: { lang: 'ru' } },
  { params: { lang: 'es' } },
  { params: { lang: 'zh' } },
  { params: { lang: 'ja' } },
  { params: { lang: 'fr' } },
  { params: { lang: 'de' } },
];

export async function GET(ctx: APIContext) {
  const lang = ctx.params.lang as Lang;
  const posts = await getBlogPosts((e) => e.data.lang === lang);

  return rss({
    title: ui[lang]['site.name'],
    description: ui[lang]['site.description'],
    site: ctx.site!,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((e) => ({
        title: e.data.title,
        pubDate: e.data.pubDate,
        description: e.data.description,
        link: `/${lang}/blog/${e.id.replace(/^[a-z]{2}\//, '')}/`,
      })),
    customData: `<language>${ogLocale[lang].replace('_', '-')}</language>`,
  });
}

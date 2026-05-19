export const languages = {
  en: 'English',
  ru: 'Русский',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';

export const ui = {
  en: {
    'site.name': 'Eugene Lebedev',
    'site.tagline': 'developer',
    'site.description': 'Personal site & blog of Eugene Lebedev.',
    'nav.blog': 'Blog',
    'nav.home': 'Home',
    'section.about': 'About',
    'section.projects': 'Projects',
    'section.musings': 'Musings',
    'section.allPosts': 'All posts',
    'bio.body':
      "Hi. I'm Eugene, a developer. This is my corner of the web — I write about software, tools I build, and things I learn along the way.",
    'projects.cc.title': 'Crypto Spread Calculator',
    'projects.cc.description':
      'A small PWA that helps spot when a Georgian crypto exchange office is overcharging you on BTC/GEL.',
    'projects.cc.cta': 'Open app',
    'theme.light': 'Switch to light theme',
    'theme.dark': 'Switch to dark theme',
    'lang.switch': 'Сменить на русский',
    'lang.switch.short': 'RU',
    'rss.title': 'RSS feed',
    'post.backToBlog': '← Back to all posts',
    'footer.privacy':
      'This page respects your privacy by not using cookies or similar technologies and by not collecting any personally identifiable information.',
    '404.title': 'Page not found',
    '404.body': "The page you are looking for doesn't exist.",
    '404.home': 'Go home',
  },
  ru: {
    'site.name': 'Eugene Lebedev',
    'site.tagline': 'разработчик',
    'site.description': 'Личный сайт и блог Евгения Лебедева.',
    'nav.blog': 'Блог',
    'nav.home': 'Главная',
    'section.about': 'Обо мне',
    'section.projects': 'Проекты',
    'section.musings': 'Заметки',
    'section.allPosts': 'Все записи',
    'bio.body':
      'Привет. Я Евгений, разработчик. Это мой угол интернета — пишу про софт, инструменты, которые мастерю, и то, что узнаю по пути.',
    'projects.cc.title': 'Калькулятор крипто-спреда',
    'projects.cc.description':
      'Небольшое PWA, которое помогает понять, не разводят ли вас в грузинском обменнике на курсе BTC/GEL.',
    'projects.cc.cta': 'Открыть приложение',
    'theme.light': 'Переключить на светлую тему',
    'theme.dark': 'Переключить на тёмную тему',
    'lang.switch': 'Switch to English',
    'lang.switch.short': 'EN',
    'rss.title': 'RSS-лента',
    'post.backToBlog': '← Ко всем записям',
    'footer.privacy':
      'Эта страница уважает вашу приватность: не использует cookies или аналогичные технологии и не собирает персональные данные.',
    '404.title': 'Страница не найдена',
    '404.body': 'Такой страницы не существует.',
    '404.home': 'На главную',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UIKey = keyof (typeof ui)[typeof defaultLang];

/** One chapter as it appears in the book's table of contents. */
export interface BookChapter {
  /** Chapter number as printed in the book; absent for the closing pieces. */
  number?: number;
  /** Russian title. */
  title: string;
  /** Title in the language of the original. */
  originalTitle: string;
}

/** A part of the book, i.e. a group of chapters. */
export interface BookPart {
  /** Part number as printed in the book, e.g. "I". */
  number: string;
  title: string;
  originalTitle: string;
  chapters: BookChapter[];
}

/** Cover of the edition being translated, as the author publishes it. */
export interface BookCover {
  /** Path under /images/books/. */
  src: string;
  width: number;
  height: number;
  /** Russian alt text — what the cover shows, not "cover of the book". */
  alt: string;
}

/**
 * The author's permission to translate and publish.
 *
 * The site only publishes a translation once there is one: a book freely
 * readable online is still not free to translate, so this field is what the
 * book page states, and its absence is what keeps the chapters unpublished.
 */
export interface BookPermission {
  /** Who granted it, in Russian. */
  grantedBy: string;
  /** ISO 8601, the day it was given. */
  date: string;
  /** Where it was given, e.g. "личное сообщение в LinkedIn". */
  via: string;
  /** Conditions attached to it, each already phrased for the reader. */
  terms?: string[];
}

export interface Book {
  slug: string; // also the URL: /books/<slug>/
  title: string; // Russian title
  originalTitle: string;
  shortTitle?: string; // how the book is usually referred to, e.g. "MCTB2"
  author: string; // Russian spelling
  authorOriginal?: string; // as the author writes it himself
  authorUrl?: string; // author's own site
  sourceUrl?: string; // the edition being translated
  originalLang: string; // ISO code of the language translated from
  cover?: BookCover; // cover of the original edition
  copyright?: string; // copyright line of the original, verbatim
  permission?: BookPermission; // the author's permission to translate
  dateAdded: string; // ISO 8601, when the book appeared on the site
  translatedWith?: string; // tools used for the translation
  notes?: string; // anything worth saying about this particular translation
  /**
   * The pieces before Part I — preface, dedication and the like. They are read
   * like any other chapter (same key, same "read" toggle), they just belong to
   * no part, so they are listed above the table of contents rather than in it.
   */
  front?: BookChapter[];
  toc: BookPart[];
}

export const books: Book[] = [
  {
    slug: 'mctb2',
    title: 'Овладение основами учения Будды',
    originalTitle: 'Mastering the Core Teachings of the Buddha',
    shortTitle: 'MCTB2',
    author: 'Дэниел М. Инграм',
    authorOriginal: 'Daniel M. Ingram',
    authorUrl: 'https://www.mctb.org/',
    sourceUrl: 'https://www.mctb.org/mctb2/',
    originalLang: 'en',
    cover: {
      src: '/images/books/mctb2-cover.webp',
      width: 335,
      height: 440,
      alt: 'Обложка оригинального издания: сидящая фигура в позе медитации, из груди расходятся лучи и колесо дхармы; сверху заголовок «Core Teachings of the Buddha», снизу — «Revised & Expanded Edition»',
    },
    copyright: '© 2018 by Daniel M. Ingram',
    permission: {
      grantedBy: 'Дэниел М. Инграм',
      date: '2026-09-09',
      via: 'личное сообщение',
      terms: [
        'сохранить обложку и копирайт оригинала',
        'указать, что перевод сделан с разрешения автора',
        'давать ссылки на mctb.org',
      ],
    },
    dateAdded: '2026-09-08',
    front: [
      { title: 'Предисловие ко второму изданию', originalTitle: 'Preface to the Second Edition' },
    ],
    notes: 'Перевод второго издания (MCTB2), которое автор выложил в открытый доступ.',
    toc: [
      {
        number: 'I',
        title: 'Основы',
        originalTitle: 'The Fundamentals',
        chapters: [
          { number: 1, title: 'Введение к части I', originalTitle: 'Introduction to Part I' },
          { number: 2, title: 'Нравственность: первая и последняя тренировка', originalTitle: 'Morality, The First and Last Training' },
          { number: 3, title: 'Концентрация: вторая тренировка', originalTitle: 'Concentration, The Second Training' },
          { number: 4, title: 'Мудрость: третья тренировка', originalTitle: 'Wisdom, The Third Training' },
          { number: 5, title: 'Три характеристики', originalTitle: 'The Three Characteristics' },
          { number: 6, title: 'Пять духовных способностей', originalTitle: 'The Five Spiritual Faculties' },
          { number: 7, title: 'Семь факторов пробуждения', originalTitle: 'The Seven Factors of Awakening' },
          { number: 8, title: 'Снова о трёх тренировках', originalTitle: 'The Three Trainings Revisited' },
          { number: 9, title: 'Четыре благородные истины', originalTitle: 'The Four Noble Truths' },
          { number: 10, title: 'Объекты для практики прозрения', originalTitle: 'Objects for Insight Practice' },
          { number: 11, title: 'Об учителях', originalTitle: 'On Teachers' },
          { number: 12, title: 'Повседневная жизнь и ретриты', originalTitle: 'Daily Life and Retreats' },
          { number: 13, title: 'Немного разрозненного о ретритах', originalTitle: 'A Few Odds and Ends About Retreats' },
          { number: 14, title: 'Советы после ретрита', originalTitle: 'Post-Retreat Advice' },
          { number: 15, title: 'Позы', originalTitle: 'Postures' },
          { number: 16, title: 'Решимость', originalTitle: 'Resolve' },
        ],
      },
      {
        number: 'II',
        title: 'Свет и тени',
        originalTitle: 'Light and Shadows',
        chapters: [
          { number: 17, title: 'Введение к частям со второй по пятую', originalTitle: 'Introduction to Parts Two through Five' },
          { number: 18, title: 'Буддизм против Будды', originalTitle: 'Buddhism versus The Buddha' },
          { number: 19, title: 'Содержание и абсолютная реальность', originalTitle: 'Content and Ultimate Reality' },
          { number: 20, title: 'Что пошло не так', originalTitle: 'What Went Wrong' },
          { number: 21, title: 'Ясная цель', originalTitle: 'A Clear Goal' },
          { number: 22, title: 'Как обуздать энергию загрязнений', originalTitle: 'Harnessing the Energy of the Defilements' },
          { number: 23, title: 'Правильное мышление и авгиевы конюшни', originalTitle: 'Right Thought and the Augean Stables' },
          { number: 24, title: 'От содержания к прозрению', originalTitle: 'From Content to Insight' },
        ],
      },
      {
        number: 'III',
        title: 'Джханы саматхи',
        originalTitle: 'The Samatha Jhanas',
        chapters: [
          { number: 25, title: 'Введение к части III', originalTitle: 'Introduction to Part Three' },
          { number: 26, title: 'Обширный мир джханы', originalTitle: 'The Wide World of Jhana' },
          { number: 27, title: 'Состояния концентрации (джханы шаматхи)', originalTitle: 'The Concentration States (Shamatha Jhanas)' },
          { number: 28, title: 'Бесформенные сферы', originalTitle: 'The Formless Realms' },
          { number: 29, title: 'Практика касины', originalTitle: 'Kasina Practice' },
        ],
      },
      {
        number: 'IV',
        title: 'Прозрение',
        originalTitle: 'Insight',
        chapters: [
          { number: 30, title: 'Продвижение прозрения', originalTitle: 'The Progress of Insight' },
          { number: 31, title: 'Три двери', originalTitle: 'The Three Doors' },
          { number: 32, title: '«Что это было?»', originalTitle: '"What Was That?"' },
          { number: 33, title: 'Обзор', originalTitle: 'Review' },
          { number: 34, title: 'Джханы випассаны', originalTitle: 'The Vipassana Jhanas' },
          { number: 35, title: 'Чем помогают карты', originalTitle: 'How the Maps Help' },
          { number: 36, title: 'За пределами первого пути («Что дальше?»)', originalTitle: 'Beyond First Path ("What Next?")' },
        ],
      },
      {
        number: 'V',
        title: 'Пробуждение',
        originalTitle: 'Awakening',
        chapters: [
          { number: 37, title: 'Модели ступеней пробуждения', originalTitle: 'Models of the Stages of Awakening' },
          { number: 38, title: 'Интеграция', originalTitle: 'Integration' },
          { number: 39, title: 'Это возможно!', originalTitle: 'It Is Possible!' },
          { number: 40, title: 'Ещё о «грибном факторе»', originalTitle: 'More on the "Mushroom Factor"' },
          { number: 41, title: 'Так кто же такой Дэниел М. Инграм?', originalTitle: 'So, Who the Heck is Daniel M. Ingram?' },
        ],
      },
      {
        number: 'VI',
        title: 'Мои духовные поиски',
        originalTitle: 'My Spiritual Quest',
        chapters: [
          { number: 42, title: 'Предыстория', originalTitle: 'Backstory' },
          { number: 43, title: 'Ранние годы', originalTitle: 'The Early Years' },
          { number: 44, title: 'Бодисёрфинг', originalTitle: 'Bodysurfing' },
          { number: 45, title: 'Университет и добуддийские искания', originalTitle: 'College and Pre-Buddhist Exploration' },
          { number: 46, title: 'Средние годы', originalTitle: 'The Middle Years' },
          { number: 47, title: 'Спасибо, Индия', originalTitle: 'Thank U, India' },
          { number: 48, title: 'Первый ретрит в Бодхгае', originalTitle: 'The First Bodh Gaya Retreat' },
          { number: 49, title: 'Первый ретрит в MBMC', originalTitle: 'The First MBMC Retreat' },
          { number: 50, title: 'Тёмная ночь становится скверной', originalTitle: 'The Dark Night Gets Ugly' },
          { number: 51, title: 'Второй ретрит в Бодхгае', originalTitle: 'The Second Bodh Gaya Retreat' },
          { number: 52, title: 'Великий вошедший в поток', originalTitle: 'The Great Stream Enterer' },
          { number: 53, title: 'Сила дхармы, яд дхармы', originalTitle: 'Dharma Power, Dharma Poison' },
          { number: 54, title: 'Средние пути', originalTitle: 'The Middle Paths' },
          { number: 55, title: 'Отказ карт', originalTitle: 'Map Failure' },
          { number: 56, title: 'Странствия', originalTitle: 'Wandering' },
          { number: 57, title: 'Касины, силы и ретриты', originalTitle: 'Kasinas, Powers, and Retreats' },
          { number: 58, title: 'Введение в силы', originalTitle: 'Introduction to the Powers' },
          { number: 59, title: 'Реальны ли силы?', originalTitle: 'Are the Powers Real?' },
          { number: 60, title: 'Свободное владение парадигмами', originalTitle: 'Paradigm Fluency' },
          { number: 61, title: 'Безумие?', originalTitle: 'Crazy?' },
          { number: 62, title: 'Эти чёртовы фейри…', originalTitle: 'Those Damn Fairies…' },
          { number: 63, title: 'Определения сил', originalTitle: 'Definitions of the Powers' },
          { number: 64, title: 'Этика и силы', originalTitle: 'Ethics and the Powers' },
          { number: 65, title: 'Как развивать силы', originalTitle: 'How to Cultivate the Powers' },
          { number: 66, title: 'Гибкий и податливый ум', originalTitle: 'Made Pliant and Malleable' },
          { number: 67, title: 'Польза сил', originalTitle: 'Benefits of the Powers' },
          { number: 68, title: 'Магия и брахмавихары', originalTitle: 'Magick and the Brahma Viharas' },
          { number: 69, title: 'Ретрит в Bhavana Society, 2001', originalTitle: 'Bhavana Society 2001 Retreat' },
          { number: 70, title: 'Вокруг света и обретение дома', originalTitle: 'Around the World and Finding Home' },
          { number: 71, title: 'Ещё практические мелочи', originalTitle: 'More Practical Tidbits' },
          { title: 'Напутствие', originalTitle: 'Final Wishes' },
          { title: 'Последние слова мудрости', originalTitle: 'Last Words of Wisdom' },
        ],
      },
    ],
  },
];

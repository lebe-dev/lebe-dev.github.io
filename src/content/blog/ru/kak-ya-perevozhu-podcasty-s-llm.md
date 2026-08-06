---
title: Как я перевожу подкасты с LLM
description: Как я перевожу подкасты с помощью LLM.
pubDate: 2026-08-06
draft: false
lang: ru
translationKey: translate-podcasts-with-llm
---

Всё началось с того, что изучая тему осознанности, Буддизма, медитаций и прочих практик, я наткнулся на великолепный подкаст [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast). Мой английский вполне достаточный, чтобы слушать подкасты на английском на общие темы и по программированию, devops, kubernetes и IT в целом, но когда речь идёт про сложные темы вне этого, то требуется помощь.

Тема осознанности и медитаций часто отсылает к индуисским терминам и гигантской [Буддийской космологии](https://ru.wikipedia.org/wiki/%D0%91%D1%83%D0%B4%D0%B4%D0%B8%D0%B9%D1%81%D0%BA%D0%B0%D1%8F_%D0%BA%D0%BE%D1%81%D0%BC%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8F). 
Для человека западного мышления она сильно отвлекает и ещё больше запутывает в понимании и практике.

Поэтому я решил использовать LLM для транскрибации выпусков подкаста и попутно расшифровывать сложные термины.

## Модель для перевода

Как и для [перевода субтитров](/subtitles/), я использую топовую модель с Medium Effort. В августе 2026-го года не важно чья эта модель (от Anthropic или OpenAI), важен контекст, который мы для неё задаём.

## Как сделать транскрибацию

Для текстовой расшифровки выпуска подкаста (транскрибации) сначала нужно его скачать. Мне понравился сайт [podcasttomp3.com](https://podcasttomp3.com), который умеет искать среди популярных подкастов и скачивать их в формате MP3.

Далее нужна модель класса Speech to Text. На момент написания этого текста одна из топовых моделей это [Whisper](https://github.com/openai/whisper) от OpenAI. Она доступна для всех популярных платформ, и ей не нужна мощная видеокарта, достаточно CPU.

### Промпт

Модельке лучше дать точный промпт, иначе она переведёт усреднённым способом. Поэтому я составил такой `CLAUDE.md`:

```markdown
# CLAUDE.md

В этом каталоге мы делаем транскрибацию подкаста Deconstructing Yourself и переводы на русский язык.

Сначала делается транскрибация, затем отдельно перевод. На выходе ожидаю четыре файла в подкаталоге `translated/`. Оригинальный mp3-файл перемещаем в подкаталог `completed/`.

## Формат наименования файлов

[Номер выпуска]_[Заголовок выпуска]_[eng].txt
[Номер выпуска]_[Заголовок выпуска]_[rus].txt

## Формат транскрибации

### Текст

[HH:MM:SS] [Кто говорит] - [Текст]

## Описание подкаста

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you’re a longtime practitioner or just beginning your journey, you’ll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## Особенности перевода

- Я не владею индийскими терминами и космологией Буддизма, поэтому даём краткое объяснение рядом со словом/термином в скобках.
- Также собирай все эти термины и в конце составляй Глоссарий.
- Убирай рекламу.

## Дополнительно

Если тебе что-то непонятно или перед тобой выбор — спроси меня.
```

Для транскрибации LLM выберет Whisper по умолчанию, даже если не указывать в промпте. Но для более простых моделей на всякий случай стоит указать модель явно.

Складываем mp3-файл в каталог, где будем запускать агента (Claude Code, Codex, opencode, не важно) и просим `возьми в работу Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3`.

На выходе в папке `translated/` будет расшифровка на английском и русском языках.

## Пример перевода

Вот кусок транскрибации:

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

А вот перевод на русский:

```
[00:06:08] Майкл - Всё же это хорошая новость, а не плохая. Это здорово. Но мне любопытно: в те моменты — или, скажем, в тот момент, — когда пришлось копать по-настоящему глубоко, что ты обнаружил как, если использовать буддийский язык, прибежище?

[00:06:25] Рубен - Ну, это точно не «нечто». Это не место. Это не состояние. Это даже не совсем инсайт. Это что-то вроде отбрасывания предпочтения, скажем так. Вот случайный способ подобраться к этому, который приходит мне сейчас: похоже, что где-то в самой сердцевине нашего существа есть часть нас, у которой есть предпочтение, чтобы вещи были такими, а не иными.

[00:07:00] Майкл - Да.
```

Транскрибации и переводы доступны на [странице подкастов](/ru/podcasts/).

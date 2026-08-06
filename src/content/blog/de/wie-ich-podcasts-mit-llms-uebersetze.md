---
title: Wie ich Podcasts mit LLMs übersetze
description: Wie ich Podcasts mit Hilfe von LLMs übersetze.
pubDate: 2026-08-06
draft: false
lang: de
translationKey: translate-podcasts-with-llm
aiUsageDisclaimer: true
---

Angefangen hat alles damit, dass ich mich mit Achtsamkeit, Buddhismus, Meditation und anderen Praktiken beschäftigte und dabei auf den großartigen Podcast [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast) stieß. Mein Englisch reicht durchaus, um Podcasts zu allgemeinen Themen sowie zu Programmierung, DevOps, Kubernetes und IT im Allgemeinen zu hören — aber sobald es um komplexe Themen außerhalb davon geht, brauche ich Hilfe.

Achtsamkeit und Meditation verweisen ständig auf hinduistische Begriffe und auf die riesige [buddhistische Kosmologie](https://en.wikipedia.org/wiki/Buddhist_cosmology).
Für einen Menschen mit westlichem Denken lenkt das stark ab und macht Verständnis und Praxis noch verworrener.

Deshalb habe ich beschlossen, ein LLM für die Transkription der Podcast-Folgen zu nutzen und dabei gleich die komplexen Begriffe erklären zu lassen.

## Welches Modell

Wie bei der [Übersetzung von Untertiteln](/subtitles/) nutze ich ein Spitzenmodell mit Medium Effort. Im August 2026 spielt es keine Rolle, von wem das Modell stammt (von Anthropic oder OpenAI).

## Wie man die Transkription macht

Für die Textfassung einer Podcast-Folge (die Transkription) muss man sie zuerst herunterladen. Mir hat die Seite [podcasttomp3.com](https://podcasttomp3.com) gefallen, die unter populären Podcasts suchen und sie im MP3-Format herunterladen kann.

Danach braucht man ein Modell der Klasse Speech to Text. Zum Zeitpunkt dieses Textes ist [Whisper](https://github.com/openai/whisper) von OpenAI eines der besten Modelle. Es ist für alle gängigen Plattformen verfügbar und braucht keine starke Grafikkarte, eine CPU genügt.

### Der Prompt

Dem Modell gibt man besser einen präzisen Prompt, sonst übersetzt es auf durchschnittliche Weise. Deshalb habe ich diese `CLAUDE.md` verfasst:

```markdown
# CLAUDE.md

In diesem Verzeichnis transkribieren wir den Podcast Deconstructing Yourself und übersetzen ihn ins Russische.

Zuerst kommt die Transkription, danach separat die Übersetzung. Als Ergebnis erwarte ich vier Dateien im Unterverzeichnis `translated/`. Die ursprüngliche mp3-Datei wird in das Unterverzeichnis `completed/` verschoben.

## Format der Dateinamen

[Episodennummer]_[Titel der Folge]_[eng].txt
[Episodennummer]_[Titel der Folge]_[rus].txt

## Format der Transkription

### Text

[HH:MM:SS] [Wer spricht] - [Text]

## Beschreibung des Podcasts

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you're a longtime practitioner or just beginning your journey, you'll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## Besonderheiten der Übersetzung

- Ich beherrsche weder die indischen Begriffe noch die Kosmologie des Buddhismus, also füge neben dem Wort/Begriff in Klammern eine kurze Erklärung ein.
- Sammle außerdem all diese Begriffe und erstelle am Ende ein Glossar.
- Entferne Werbung.

## Zusätzlich

Wenn dir etwas unklar ist oder du vor einer Wahl stehst — frag mich.
```

Für die Transkription wählt das LLM standardmäßig Whisper, auch wenn man es im Prompt nicht erwähnt. Bei einfacheren Modellen sollte man das Modell aber sicherheitshalber explizit angeben.

Wir legen die mp3-Datei in das Verzeichnis, in dem wir den Agenten starten (Claude Code, Codex, opencode — egal), und bitten: `nimm dir Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3 vor`.

Am Ende liegt im Ordner `translated/` die Abschrift auf Englisch und auf Russisch.

## Ein Übersetzungsbeispiel

Hier ein Ausschnitt aus der Transkription:

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

Und hier die Übersetzung ins Russische:

```
[00:06:08] Майкл - Всё же это хорошая новость, а не плохая. Это здорово. Но мне любопытно: в те моменты — или, скажем, в тот момент, — когда пришлось копать по-настоящему глубоко, что ты обнаружил как, если использовать буддийский язык, прибежище?

[00:06:25] Рубен - Ну, это точно не «нечто». Это не место. Это не состояние. Это даже не совсем инсайт. Это что-то вроде отбрасывания предпочтения, скажем так. Вот случайный способ подобраться к этому, который приходит мне сейчас: похоже, что где-то в самой сердцевине нашего существа есть часть нас, у которой есть предпочтение, чтобы вещи были такими, а не иными.

[00:07:00] Майкл - Да.
```

Transkriptionen und Übersetzungen sind auf der [Podcast-Seite](/de/podcasts/) verfügbar.

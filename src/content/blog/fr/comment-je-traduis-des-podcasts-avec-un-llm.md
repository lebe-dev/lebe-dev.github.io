---
title: Comment je traduis des podcasts avec un LLM
description: Comment je traduis des podcasts à l'aide de LLM.
pubDate: 2026-08-06
draft: false
lang: fr
translationKey: translate-podcasts-with-llm
aiUsageDisclaimer: true
---

Tout a commencé alors que j'explorais la pleine conscience, le bouddhisme, la méditation et d'autres pratiques : je suis tombé sur l'excellent podcast [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast). Mon anglais est largement suffisant pour écouter des podcasts sur des sujets généraux et sur la programmation, le devops, kubernetes et l'informatique en général, mais dès qu'il s'agit de sujets complexes en dehors de ce champ, j'ai besoin d'aide.

Le thème de la pleine conscience et de la méditation renvoie souvent à des termes hindous et à l'immense [cosmologie bouddhique](https://en.wikipedia.org/wiki/Buddhist_cosmology).
Pour une personne de culture occidentale, cela distrait beaucoup et embrouille encore davantage la compréhension et la pratique.

J'ai donc décidé d'utiliser un LLM pour transcrire les épisodes du podcast et, au passage, décrypter les termes complexes.

## Quel modèle

Comme pour la [traduction de sous-titres](/subtitles/), j'utilise un modèle de premier plan en Medium Effort. En août 2026, peu importe à qui il appartient (Anthropic ou OpenAI).

## Comment faire la transcription

Pour obtenir la version texte d'un épisode (la transcription), il faut d'abord le télécharger. J'ai bien aimé le site [podcasttomp3.com](https://podcasttomp3.com), qui sait chercher parmi les podcasts populaires et les télécharger au format MP3.

Ensuite il faut un modèle de type Speech to Text. Au moment où j'écris ces lignes, l'un des meilleurs modèles est [Whisper](https://github.com/openai/whisper) d'OpenAI. Il est disponible sur toutes les plateformes courantes et n'a pas besoin d'une carte graphique puissante : le CPU suffit.

### Le prompt

Mieux vaut donner au modèle un prompt précis, sinon il traduira de façon moyennée. J'ai donc rédigé ce `CLAUDE.md` :

```prompt
# CLAUDE.md

Dans ce répertoire, nous transcrivons le podcast Deconstructing Yourself et le traduisons en russe.

D'abord la transcription, puis la traduction séparément. En sortie, j'attends quatre fichiers dans le sous-répertoire `translated/`. Le fichier mp3 original est déplacé dans le sous-répertoire `completed/`.

## Format de nommage des fichiers

[Numéro d'épisode]_[Titre de l'épisode]_[eng].txt
[Numéro d'épisode]_[Titre de l'épisode]_[rus].txt

## Format de la transcription

### Texte

[HH:MM:SS] [Qui parle] - [Texte]

## Description du podcast

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you're a longtime practitioner or just beginning your journey, you'll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## Particularités de la traduction

- Je ne maîtrise ni les termes indiens ni la cosmologie du bouddhisme, donc ajoute une brève explication entre parenthèses à côté du mot/terme.
- Rassemble aussi tous ces termes et établis un Glossaire à la fin.
- Supprime les publicités.

## En complément

Si quelque chose n'est pas clair pour toi ou si tu dois faire un choix, demande-moi.
```

Pour la transcription, le LLM choisira Whisper par défaut, même si ce n'est pas précisé dans le prompt. Mais pour des modèles plus simples, mieux vaut préciser le modèle explicitement, par sécurité.

On place le fichier mp3 dans le répertoire où l'on va lancer l'agent (Claude Code, Codex, opencode, peu importe) et on lui demande : `occupe-toi de Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3`.

En sortie, le dossier `translated/` contiendra la transcription en anglais et en russe.

## Exemple de traduction

Voici un extrait de la transcription :

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

Et voici la traduction en russe :

```
[00:06:08] Майкл - Всё же это хорошая новость, а не плохая. Это здорово. Но мне любопытно: в те моменты — или, скажем, в тот момент, — когда пришлось копать по-настоящему глубоко, что ты обнаружил как, если использовать буддийский язык, прибежище?

[00:06:25] Рубен - Ну, это точно не «нечто». Это не место. Это не состояние. Это даже не совсем инсайт. Это что-то вроде отбрасывания предпочтения, скажем так. Вот случайный способ подобраться к этому, который приходит мне сейчас: похоже, что где-то в самой сердцевине нашего существа есть часть нас, у которой есть предпочтение, чтобы вещи были такими, а не иными.

[00:07:00] Майкл - Да.
```

Les transcriptions et traductions sont disponibles sur la [page des podcasts](/fr/podcasts/).

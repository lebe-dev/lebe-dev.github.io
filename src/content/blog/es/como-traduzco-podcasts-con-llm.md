---
title: Cómo traduzco podcasts con LLM
description: Cómo traduzco podcasts con ayuda de LLM.
pubDate: 2026-08-06
draft: false
lang: es
translationKey: translate-podcasts-with-llm
aiUsageDisclaimer: true
---

Todo empezó cuando, estudiando el tema de la atención plena, el budismo, la meditación y otras prácticas, me encontré con el magnífico podcast [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast). Mi inglés es suficiente para escuchar podcasts sobre temas generales y sobre programación, devops, kubernetes e IT en general, pero cuando se trata de temas complejos fuera de eso, necesito ayuda.

El tema de la atención plena y la meditación remite constantemente a términos hindúes y a la gigantesca [cosmología budista](https://en.wikipedia.org/wiki/Buddhist_cosmology).
Para una persona con mentalidad occidental eso distrae mucho y complica aún más la comprensión y la práctica.

Por eso decidí usar un LLM para transcribir los episodios del podcast y, de paso, descifrar los términos budistas.

## Qué modelo

Igual que para la [traducción de subtítulos](/subtitles/), uso un modelo de primer nivel con Medium Effort, sin importar de quién sea el modelo (Anthropic u OpenAI).

## Cómo hacer la transcripción

Para obtener la versión en texto de un episodio (la transcripción) primero hay que descargarlo. Me gustó el sitio [podcasttomp3.com](https://podcasttomp3.com), que sabe buscar entre los podcasts populares y descargarlos en formato MP3.

Después hace falta un modelo de la clase Speech to Text. En el momento de escribir este texto, uno de los mejores modelos es [Whisper](https://github.com/openai/whisper) de OpenAI. Está disponible para todas las plataformas populares y no necesita una tarjeta gráfica potente: basta con la CPU.

### El prompt

Es mejor darle al modelo un prompt preciso, si no, traducirá de forma promediada. Por eso preparé este `CLAUDE.md`:

```markdown
# CLAUDE.md

En este directorio hacemos la transcripción del podcast Deconstructing Yourself y las traducciones al ruso.

Primero se hace la transcripción y luego, por separado, la traducción. Como resultado espero cuatro archivos en el subdirectorio `translated/`. El archivo mp3 original se mueve al subdirectorio `completed/`.

## Formato de nombres de archivo

[Número de episodio]_[Título del episodio]_[eng].txt
[Número de episodio]_[Título del episodio]_[rus].txt

## Formato de la transcripción

### Texto

[HH:MM:SS] [Quién habla] - [Texto]

## Descripción del podcast

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you're a longtime practitioner or just beginning your journey, you'll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## Particularidades de la traducción

No domino los términos indios ni la cosmología del budismo, así que añade una breve explicación entre paréntesis junto a la palabra/término.

Además, recopila todos esos términos y al final elabora un Glosario.

## Adicionalmente

Si algo no te queda claro o tienes que elegir, pregúntame.
```

Claude elegirá Whisper para la transcripción por defecto, aunque no lo indiques en el prompt.

Ponemos el archivo mp3 en el directorio donde vamos a ejecutar el agente (Claude Code, Codex, opencode, da igual) y le pedimos: `ponte con Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3`.

Como resultado, en la carpeta `translated/` estará la transcripción en inglés y en ruso.

## Ejemplo de traducción

Aquí va un fragmento de la transcripción:

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

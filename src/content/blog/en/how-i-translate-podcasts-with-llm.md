---
title: How I Translate Podcasts with LLMs
description: How I translate podcasts with the help of LLMs.
pubDate: 2026-08-06
draft: false
lang: en
translationKey: translate-podcasts-with-llm
aiUsageDisclaimer: true
---

It all started while I was digging into mindfulness, Buddhism, meditation and other practices, and came across the wonderful podcast [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast). My English is good enough to listen to podcasts on general topics and on programming, devops, kubernetes and IT in general, but when it comes to complex subjects outside that range, I need help.

Mindfulness and meditation constantly refer to Hindu terms and to the enormous [Buddhist cosmology](https://en.wikipedia.org/wiki/Buddhist_cosmology).
For a person with a Western mindset it is very distracting and makes understanding and practice even more confusing.

That is why I decided to use an LLM to transcribe podcast episodes and to explain complex terms along the way.

## Which model

Just like for [subtitle translation](/subtitles/) I use a top-tier model with Medium Effort. As of August 2026, it doesn't matter whose model it is (from Anthropic or OpenAI).

## How to make a transcription

To get a text version of a podcast episode (a transcription) you first have to download it. I liked the site [podcasttomp3.com](https://podcasttomp3.com), which can search among popular podcasts and download them as MP3.

Next you need a Speech to Text model. At the time of writing, one of the best models is [Whisper](https://github.com/openai/whisper) by OpenAI. It is available for all popular platforms and does not need a powerful graphics card — a CPU is enough.

### The prompt

It is better to give the model a precise prompt, otherwise it will translate in an averaged-out way. So I put together this `CLAUDE.md`:

```markdown
# CLAUDE.md

In this directory we transcribe the Deconstructing Yourself podcast and translate it into Russian.

First comes the transcription, then the translation as a separate step. As a result I expect four files in the `translated/` subdirectory. The original mp3 file is moved into the `completed/` subdirectory.

## File naming format

[Episode number]_[Episode title]_[eng].txt
[Episode number]_[Episode title]_[rus].txt

## Transcription format

### Text

[HH:MM:SS] [Speaker] - [Text]

## Podcast description

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you're a longtime practitioner or just beginning your journey, you'll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## Translation specifics

- I don't know Indian terminology or Buddhist cosmology, so add a short explanation in brackets next to the word/term.
- Also collect all these terms and build a Glossary at the end.
- Remove ads.

## Additionally

If something is unclear to you or you have to make a choice — ask me.
```

For transcription, the LLM will pick Whisper by default, even if you don't mention it in the prompt. But for simpler models, it's worth specifying the model explicitly just in case.

Put the mp3 file into the directory where you are going to run the agent (Claude Code, Codex, opencode — doesn't matter) and ask it: `take on Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3`.

As a result, the `translated/` folder will contain the transcription in English and in Russian.

## A translation example

Here is a piece of a transcription:

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

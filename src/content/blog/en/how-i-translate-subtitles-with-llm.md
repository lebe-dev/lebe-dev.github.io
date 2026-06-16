---
title: How I Translate Subtitles with LLMs
description: How I translate movie subtitles with LLMs using my submarine utility — a case study with the film Silent Friend (2025).
pubDate: 2026-06-14
draft: true
lang: en
translationKey: translate-subtitles-with-llm
disclaimer: |
  This article was written by a russian speaker and translated with LLM into English. If you cannot accept that fact and feel unsafe, please push the button:

disclaimerShowLeaveButton: true
disclaimerLeaveButtonText: "Emergency button"
---

![submarine, Text-based User Interface](/images/article-llm-intro.png)

In this article I want to share how I translate subtitles using large language models (LLMs). It just so happens that I watch movies, TV series, documentaries, cartoons, anime, and everything else only with the original audio.

– Why do my ears keep bleeding? – I asked the doctor, and he answered with 100% confidence:

– You're allergic to dubbing, try subtitles.

All the other subtopics, like "why don't you just watch on streaming services?" and so on, are out of scope for this article.

A few years ago LLMs appeared, but it's only been about a year since they became good enough for translation. Still, even in 2026 there's no silver bullet for all subtitle problems. Believe me, there are plenty of them. Here are the top ones:

1. There are no subtitles for the movie at all
2. Subtitles exist only in a language I don't know
3. Subtitles exist, but they're incomplete (yes, that happens too, more on this below)
4. Subtitles exist, but they don't match the edition of the film (theatrical cut, director's cut, etc.)
5. LLMs are great at translating into many languages, but they break down on subtitles: they ruin timings, drop lines, and so on
6. The text in subtitles has no context, and if the movie is new, the LLM might fail at the translation. Some words differ a lot in translation depending on the time period of the story

So the only idea that came to mind is that the LLM needs help somehow. What kind of help can we give it?

1. Track translation progress
2. Verify the integrity of the result
3. Allow comparing the translation with the original
4. Allow fixing subtitles if there's a desync between lines or a frame-rate issue
5. Allow assembling the final subtitles from several sources (yes, that happens too)
6. Understand the context of the work

## The submarine utility

In January this year I wrote the [submarine](https://github.com/lebe-dev/submarine) utility, which took on most of these problems. From the very first version, the utility was built around translating subtitles with LLMs, leaning toward the agentic approach (Claude Code, Codex, opencode, and others). That said, I also added a fallback for classic chatbots — for situations where the agent's limits run out, but there's still free access to Google AI Studio and a hundred other chatbots.

The utility helps the model maintain the integrity of the process and the timings, and also lets it compare the translation with the original. On top of that, it always makes backups.

The utility also supports JSON output so agents can easily navigate its capabilities. Thanks to `Justin Poehnelt` for the excellent article [You Need to Rewrite Your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/).

On top of that, the utility lets you assess the translation using a TUI (Text-based User Interface):

![submarine, Text-based User Interface](/images/article-llm-submarine.png)

Besides basic up/down navigation, this mode supports various movement options. For example, random jumps (hotkey `r`). This is handy for eyeballing translation quality.

Next, as an example, I'll walk through how I prepared Russian subtitles for the movie "Silent Friend" (2025).

## Silent Friend (2025)

In 2025, the drama [Silent Friend](https://en.wikipedia.org/wiki/Silent_Friend) by director [Ildikó Enyedi](https://en.wikipedia.org/wiki/Ildik%C3%B3_Enyedi) was released. The film is spoken in three languages — English, German, and Chinese. On top of that, the story spans different time periods: 1908, 1970, and 2020.

Unfortunately, the film didn't get wide distribution, so things were pretty grim with subtitles. On [opensubtitles](https://www.opensubtitles.org/en/subtitles/13792243/silent-friend-en) I found English subtitles, but they turned out to be incomplete. There was also a Russian translation done with an LLM, but based on the reviews, it was incomplete too.

So I downloaded the English subtitles and started translating them.

### Preparing for translation

Before translating subtitles for a movie, it's important that the LLM has context for the translation.

For example, in a medieval context, the word "suffer" means to allow, to permit. In the modern sense — to endure pain.

The word "villain" today means "an evil character", but in a medieval context it meant "a villein — a bonded peasant".

So, for the initial general-purpose agent prompt ([example on github](https://github.com/lebe-dev/submarine/blob/main/docs/AGENT-TRANSLATION-FLOW.md)), I fed it a description of the film and its plot from [Wikipedia](https://en.wikipedia.org/wiki/Silent_Friend).

As confirmation, `Opus 4.8` (in `high` mode) explained in its final response that it had taken the differences between time periods into account:

```
⏺ Done. The film Silent Friend (2025) has been fully translated.

  Summary

  - Source: Silent.Friend.2025.1080p.WEB-DL.DDP5.1.H.264.en.srt (703 subtitles)
  - Result: Stille.Freundin.2025.1080p.WEB-DL.DDP5.1.H.264.ru.srt
  - Progress: 100% (703/703), all checks passed — perfect match, no skipped lines or timecode shifts.

  Translated in chunks of 100 lines, verifying each chunk with verify. A few context-driven decisions across the film's three timelines:

  - 1908 (Grete): kept Linnaeus's Latin terms (Monandria, Species Plantarum) as in the original — they're part of the academic interrogation scene; forms of address such as "Fräulein", "miss", "Mr./Mrs. Winterhalter" follow the period.
  - 1972 (Hannes/Gundula): colloquial register, using period-appropriate 1970s youth slang (Soviet-era equivalents of "joint", "pigs", "sit-down strike").
  - 2020 (Wong): neutral, polite style, with terms like "sensor" and "access card".
  - Quotes from Goethe and Rilke (Duino Elegies), and the dish name Himmel und Erde, were kept in the German original with a Russian gloss alongside, as in the subtitles.
  - Italic <i> tags, line breaks, and dialogue dashes were preserved.

  Backups for each step are saved in backups/.
```

### Incomplete subtitles

After that, I started the movie and skipped back and forth to random scenes. At one point I noticed that a number of scenes had no translation. I checked the original English subtitle file, and indeed there was no translation there either. I downloaded another subtitle file from a different translator, and those scenes were translated there.

So, in the same session, I asked the agent to fix this — merge the files and translate the missing parts along the way. Opus did a great job translating the missing fragments and inserted them using my utility.

### Desync

While watching the movie, comfortably on the couch, about half an hour before the end I ran into a desync. Luckily, VLC for Android TV makes it very easy to figure out the lag (-9 seconds). I quickly fixed it while watching, but I also needed to fix the final subtitle file that I was planning to share with other people.

The utility comes with a set of commands for fixing delays or drift; similar cases are described in the [documentation](https://github.com/lebe-dev/submarine/blob/main/docs/usecases/README.md). The agent handles this without any trouble.

## Conclusion

Of course, I haven't solved absolutely every subtitle translation problem — for example, I still don't know how to determine the gender of a speaker. The next experiment I want to try is transcribing the audio track and getting some kind of markup indicating the speaker's gender. But even that won't give 100% accuracy :)

---
title: Creating Subtitles from a Dubbed Audio Track
description: How I create movie subtitles out of a dubbed audio track with the help of an LLM
pubDate: 2026-08-06
draft: false
lang: en
translationKey: create-subtitles-from-translated-audio
aiUsageDisclaimer: true
---

![A still from the film "Uncle Boonmee Who Can Recall His Past Lives"](/images/article-llm-dub-uncle-bunmi.png)

I have already written about [a number of problems with subtitles](/en/blog/how-i-translate-subtitles-with-llm/), and then an idea came up. Why not create subtitles out of the dubbed audio track?

As soon as a new film comes out, a dub in every popular language usually follows quickly. With subtitles things are normally sadder: they may be missing even a decade after the release.

This method has two big advantages. First — you don't have to sync the subtitles to a particular cut of the film (theatrical, director's and so on). Second — nothing needs to be translated, a human already did it and took the film's context into account. When you translate English subtitles into any other language, for example, you have to supply the context, otherwise the words come out wrong: in a medieval context "suffer" means to permit, to allow, whereas the modern meaning is to endure pain.

## What you need

Below is the list of what will be required, but the main thing is access to an LLM and agentic software (Claude Code, Codex, opencode and so on): the agent will do everything else.

- The [ffmpeg](https://github.com/ffmpeg/ffmpeg) utility, to extract the dubbed audio track from the video
- [OpenAI Whisper Large v3](https://github.com/openai/whisper) (the local version of the model), to transcribe the audio track. You don't need a powerful GPU to run it, an ordinary CPU is enough
- The [submarine](https://github.com/lebe-dev/submarine) utility, to check the integrity of the resulting subtitles
- The film file itself. For example, `Movie.mkv`.

## Extracting the dubbed track

Audio tracks are usually stored inside the video file (the container), and we need to pull out the one with the dub.

The prompt goes like this:

```prompt
Extract all audio tracks from the file Movie.mkv with ffmpeg and put them next to it
```

Then we play the resulting audio files and look for the one in our native language.

## Creating the subtitles

Next — reset the context in the agent, switch it to Medium or High effort and run the prompt that does the rest of the work:

```prompt
Use Whisper Large v3 to transcribe the audio track from the file movie.mp3 and
produce a subtitle file (srt) as the output. For Whisper Large v3 use
whisper.cpp (a build with Metal-GPU support), run it via whisper-cli.

To check the integrity of the subtitles use
the submarine utility (https://github.com/lebe-dev/submarine).

## Caveats

- **mlx-whisper is not suitable**: beam search is not implemented there
  (`NotImplementedError`), greedy only. whisper.cpp gives you both beam search
  and Metal-GPU.
- **`-mc 0` is mandatory.** This is zero text context, the main protection
  against looping. With the full context the model spat out the text of the
  prompt itself at the very first long pause. With `-mc 64` the punctuation is
  nicer (3% of lines without punctuation marks instead of 22%), but **23% of
  the words** are lost and there are three times more repetitions — completeness
  matters more.
- **`--prompt` is useless with `-mc 0`**: it gets truncated to 1 token, the
  warning is visible in the log. The model adds punctuation without it anyway.
- **Do not enable VAD (`--vad` + Silero).** It does remove the credits-style
  hallucinations, but it also throws away real phrases (137 per film) and loops
  on its own. In the windows where the main run hallucinated there turned out to
  be no real speech at all — nothing to lose.
- **`-dtw` requires `-nfa`**: with flash attention (on by default) all
  `t_dtw` values come back as `-1`.
- Run `whisper-cli` in the background only via `run_in_background`, never with
  `nohup ... &` — otherwise the process is killed along with the wrapper.

## Extra

If you find any caveats of your own while working, write them down for yourself.
```

When it is done, the agent produces a file like `movie.srt`:

```
8
00:05:53,834 --> 00:05:56,584
Добро пожаловать на факультет,
профессор Вонг.

9
00:05:57,167 --> 00:05:58,292
Спасибо.

10
00:05:58,797 --> 00:06:00,965
- Будем здоровы!
- Будем!
```

The subtitles are ready to use.

![A still from the film "Uncle Boonmee Who Can Recall His Past Lives"](/images/article-llm-dub-uncle-bunmi-final.png)

## If you want even more quality

For even better quality you can add the film's English description from Wikipedia.

You can also drop the original-language subtitle file next to it and ask the agent to spot-check the translation quality against it.

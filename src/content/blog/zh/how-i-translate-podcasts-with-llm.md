---
title: 我如何用 LLM 翻译播客
description: 我如何借助 LLM 翻译播客。
pubDate: 2026-08-06
draft: true
lang: zh
translationKey: translate-podcasts-with-llm
aiUsageDisclaimer: true
---

一切始于我研究正念、佛教、冥想及其他修行的时候，我偶然发现了非常出色的播客 [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast)。我的英语足以听懂一般话题以及编程、devops、kubernetes 和 IT 相关的播客，但一旦涉及这些之外的复杂主题，我就需要帮助。

正念和冥想的话题常常牵涉到印度教术语和庞大的[佛教宇宙观](https://en.wikipedia.org/wiki/Buddhist_cosmology)。
对于西方思维方式的人来说，这非常容易分散注意力，也让理解和实践更加混乱。

因此我决定用 LLM 来转写播客节目，并顺带解释复杂术语。

## 用哪个模型

和[翻译字幕](/subtitles/)一样，我使用 Medium Effort 的顶级模型。截至 2026 年 8 月，不管它是谁家的（Anthropic 还是 OpenAI）。

## 如何做转写

要得到播客节目的文字版（转写），首先得把它下载下来。我喜欢 [podcasttomp3.com](https://podcasttomp3.com) 这个网站，它能在热门播客中搜索并以 MP3 格式下载。

接下来需要一个 Speech to Text 类的模型。在写这篇文章的时候，顶级模型之一是 OpenAI 的 [Whisper](https://github.com/openai/whisper)。它支持所有主流平台，也不需要强力显卡，有 CPU 就够了。

### 提示词

最好给模型一个精确的提示词，否则它会用一种平均化的方式来翻译。于是我写了这样一份 `CLAUDE.md`：

```prompt
# CLAUDE.md

在这个目录里我们对播客 Deconstructing Yourself 做转写并翻译成俄语。

先做转写，然后单独做翻译。我期望在 `translated/` 子目录中得到四个文件。原始 mp3 文件移动到 `completed/` 子目录。

## 文件命名格式

[节目编号]_[节目标题]_[eng].txt
[节目编号]_[节目标题]_[rus].txt

## 转写格式

### 文本

[HH:MM:SS] [说话人] - [文本]

## 播客简介

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you're a longtime practitioner or just beginning your journey, you'll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## 翻译要求

- 我不熟悉印度术语和佛教宇宙观，所以请在词语/术语旁边用括号给出简短解释。
- 同时把这些术语都收集起来，在最后编成一个术语表。
- 去掉广告。

## 补充

如果你有不明白的地方，或者面临选择，就来问我。
```

对于转写，即使不在提示词里写明，LLM 默认也会选择 Whisper。但对于比较简单的模型，为保险起见最好明确指定模型。

把 mp3 文件放进我们要运行智能体（Claude Code、Codex、opencode，都无所谓）的目录，然后请它：`处理一下 Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3`。

最终 `translated/` 文件夹里会有英文和俄文的文字稿。

## 翻译示例

这是转写的一个片段：

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

下面是俄语译文：

```
[00:06:08] Майкл - Всё же это хорошая новость, а не плохая. Это здорово. Но мне любопытно: в те моменты — или, скажем, в тот момент, — когда пришлось копать по-настоящему глубоко, что ты обнаружил как, если использовать буддийский язык, прибежище?

[00:06:25] Рубен - Ну, это точно не «нечто». Это не место. Это не состояние. Это даже не совсем инсайт. Это что-то вроде отбрасывания предпочтения, скажем так. Вот случайный способ подобраться к этому, который приходит мне сейчас: похоже, что где-то в самой сердцевине нашего существа есть часть нас, у которой есть предпочтение, чтобы вещи были такими, а не иными.

[00:07:00] Майкл - Да.
```

文字稿和译文可以在[播客页面](/zh/podcasts/)查看。

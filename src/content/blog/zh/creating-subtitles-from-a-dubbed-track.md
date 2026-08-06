---
title: 用配音音轨制作字幕
description: 我如何借助 LLM 从配音音轨制作电影字幕
pubDate: 2026-08-06
draft: true
lang: zh
translationKey: create-subtitles-from-translated-audio
aiUsageDisclaimer: true
---

![电影《能召回前世的布米叔叔》剧照](/images/article-llm-dub-uncle-bunmi.png)

我之前写过[字幕的一系列问题](/zh/blog/how-i-translate-subtitles-with-llm/)，后来忽然有了个想法：为什么不用配音音轨来制作字幕呢？

新片一上映，各种常见语言的配音往往很快就跟上了。字幕的情况通常要惨得多：哪怕上映十年之后也可能仍然没有。

这个方法有两大优点。第一，不需要把字幕对齐到某个特定版本的片源（院线版、导演剪辑版等等）。第二，不需要翻译，这件事已经由真人完成，而且他考虑了影片的语境。比如把英文字幕译成其他语言时必须给出语境，否则词就会译错：在中世纪语境中，「suffer」的意思是允许、容许，而现代的意思是受苦。

## 需要准备什么

下面是所需内容的清单，但其中最关键的是能访问 LLM 以及一套 agent 软件（Claude Code、Codex、opencode 等等）：其余的事情 agent 都会做。

- [ffmpeg](https://github.com/ffmpeg/ffmpeg)，用来从视频中提取配音音轨
- [OpenAI Whisper Large v3](https://github.com/openai/whisper)（模型的本地版本），用来转写音轨。运行它不需要强力显卡，普通处理器就够
- [submarine](https://github.com/lebe-dev/submarine)，用来检查最终字幕的完整性
- 影片文件本身。例如 `Movie.mkv`

## 提取配音音轨

音轨通常存放在视频文件（容器）内部，我们要把带配音的那条取出来。

提示词是这样的：

```prompt
用 ffmpeg 从 Movie.mkv 中提取所有音轨，并放在同一目录下
```

然后播放得到的音频文件，找出母语的那一条。

## 制作字幕

接着，在 agent 里重置上下文，设为 Medium 或 High Effort，运行下面这个把剩余工作全部做完的提示词：

```prompt
使用 Whisper Large v3 转写 movie.mp3 中的音轨，并输出一个字幕格式（srt）的
文件。Whisper Large v3 请使用 whisper.cpp（带 Metal-GPU 支持的构建），
通过 whisper-cli 运行。

字幕完整性检查请使用 submarine 工具
（https://github.com/lebe-dev/submarine）。

## 注意事项

- **mlx-whisper 不适用**：其中没有实现 beam search（`NotImplementedError`），
  只有 greedy。whisper.cpp 既有 beam search 也有 Metal-GPU。
- **`-mc 0` 是必须的。** 这表示文本上下文为零，是防止循环输出的主要手段。
  保留完整上下文时，模型在第一个长停顿处就把提示词本身吐了出来。用 `-mc 64`
  标点会更漂亮（无标点的字幕行从 22% 降到 3%），但会丢失 **23% 的词**，
  重复也多出三倍——完整性更重要。
- **`-mc 0` 时 `--prompt` 没有意义**：会被截断到 1 个 token，日志里能看到警告。
  不加它模型照样会加标点。
- **不要开启 VAD（`--vad` + Silero）。** 它确实能去掉片尾字幕类的幻觉，但也会
  丢掉真实台词（每部片 137 条），而且自己也会陷入循环。主流程产生幻觉的那些
  时间窗里其实并没有真实语音——没什么可丢的。
- **`-dtw` 需要配合 `-nfa`**：开启 flash attention（默认开启）时，所有 `t_dtw`
  都会返回 `-1`。
- 后台运行 `whisper-cli` 只能通过 `run_in_background`，不要用 `nohup ... &`
  ——否则进程会随包装脚本一起被杀掉。

## 补充

如果你在过程中发现了别的注意事项，请自己记录下来。
```

工作结束后，agent 会生成一个类似 `movie.srt` 的文件：

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

字幕就可以直接用了。

![电影《能召回前世的布米叔叔》剧照](/images/article-llm-dub-uncle-bunmi-final.png)

## 如果还想要更高的质量

想要更高质量，可以再补上 Wikipedia 上该片的英文简介。

也可以把原语言的字幕文件放在旁边，让 agent 抽样对照一下翻译质量。

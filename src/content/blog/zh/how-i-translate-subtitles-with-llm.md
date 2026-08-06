---
title: 我如何用 LLM 翻译字幕
description: 我如何使用 LLM 和自己开发的 submarine 工具翻译电影字幕——以电影《Silent Friend》(2025) 为例。
pubDate: 2026-06-14
draft: true
lang: zh
translationKey: translate-subtitles-with-llm
aiUsageDisclaimer: true
---

![submarine, Text-based User Interface](/images/article-llm-intro.png)

在这篇文章里，我想讲讲我是怎样用大语言模型（下称 LLM）翻译字幕的。事情就是这样：电影、剧集、纪录片、动画片、动漫以及其他所有内容，我都只看原声版。

其他一些旁枝话题，比如「为什么不直接在流媒体平台上看呢？」之类的，不在本文讨论范围之内。

几年前 LLM 出现了，但也就是大约一年前，它们才好到可以用来翻译。即便如此，到了 2026 年，字幕的所有问题依然没有「银弹」。相信我，这类问题相当多。最主要的有：

1. 这部电影根本没有任何字幕
2. 只有一种我掌握得不够好、甚至完全不懂的语言的字幕
3. 字幕不完整（是的，这种情况也有，下面会讲）
4. 字幕过快或过慢。这在电影版本不一致时会出现（公映版、导演剪辑版等等）
5. LLM 能出色地翻译成多种语言，但一碰到字幕就出问题：破坏时间轴、漏掉台词等等
6. 字幕文本没有上下文，如果电影比较新，LLM 可能翻不好。有些词的译法会因故事发生的年代而大不相同

所以我唯一想到的办法，就是得设法帮 LLM 一把。我们可以在这些方面提供帮助：

1. 跟踪翻译进度
2. 在翻译过程中和结束后校验结果的完整性
3. 能够把译文和原文进行对照
4. 在台词错位或帧率有问题时，能够修复字幕
5. 能够用多个来源拼装出最终的字幕（是的，这种情况也有）
6. 理解作品的上下文

## submarine 工具

今年一月我写了 [submarine](https://github.com/lebe-dev/submarine) 这个工具，它承担了上述大部分问题。从第一个版本起，这个工具就是围绕用 LLM 翻译字幕设计的，并且偏向智能体（agent）方式（Claude Code、Codex、opencode 等）。不过我也为传统聊天机器人加了一条备用路径——用于智能体额度耗尽、但仍能免费使用 Google AI Studio 和其他上百个聊天机器人的情况。

这个工具帮助模型保持流程的完整性和时间轴，同时让它可以把译文和原文对照。除此之外，它总是会做备份。

工具还支持 JSON 输出，方便智能体了解它的各项能力。感谢 `Justin Poehnelt` 写的优秀文章 [You Need to Rewrite Your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/)。

此外，工具还允许通过 TUI（Text-based User Interface）来评估译文：

![submarine, Text-based User Interface](/images/article-llm-submarine.png)

除了基本的上下浏览，这个模式还支持多种移动方式。例如随机跳转（快捷键 `r`）。这样用眼睛评估译文质量很方便（「信任，但要核实」）。

安装时，只要把项目的 github 链接给智能体就够了 —— https://github.com/lebe-dev/submarine。

接下来，我以电影《Silent Friend》(2025) 为例，讲讲我是怎么准备俄语字幕的。

## Silent Friend (2025)

2025 年，导演 [Ildikó Enyedi](https://en.wikipedia.org/wiki/Ildik%C3%B3_Enyedi) 的剧情片 [Silent Friend](https://en.wikipedia.org/wiki/Silent_Friend) 上映。片中使用了三种语言——英语、德语和汉语。此外，故事横跨不同年代：1908 年、1970 年和 2020 年。

可惜这部电影没有大规模发行，因此字幕的情况相当惨淡。我在 [opensubtitles](https://www.opensubtitles.org/en/subtitles/13792243/silent-friend-en) 上找到了英语字幕，但结果并不完整。也有一份用 LLM 做的俄语翻译，不过从评论看，同样不完整。

于是我下载了英语字幕，开始翻译。

### 翻译前的准备

在翻译一部电影的字幕之前，重要的是让 LLM 拥有翻译所需的上下文。

例如在中世纪的语境里，英语单词 «suffer» 的意思是允许、容许；而在现代语义中则是忍受痛苦。

«villain» 一词今天指「反派角色」，但在中世纪语境中指的是「villein——依附于领主的农奴」。

因此，在给通用智能体的第一个提示词（[github 上的示例](https://github.com/lebe-dev/submarine/blob/main/docs/AGENT-TRANSLATION-FLOW.md)）里，我把来自 [Wikipedia](https://en.wikipedia.org/wiki/Silent_Friend) 的影片介绍和剧情一并给了它。

作为佐证，`Opus 4.8`（`high` 模式）在最后的回复中说明，它考虑了不同年代之间的差异：

```
⏺ 完成。电影 Silent Friend (2025) 已全部翻译完毕。

  小结

  - 来源: Silent.Friend.2025.1080p.WEB-DL.DDP5.1.H.264.en.srt（703 条字幕）
  - 结果: Stille.Freundin.2025.1080p.WEB-DL.DDP5.1.H.264.ru.srt
  - 进度: 100%（703/703），所有检查均通过 —— 完全匹配，没有漏行，也没有时间码偏移。

  按每 100 行一块进行翻译，每一块都用 verify 校验。在影片三条时间线上，有几处基于上下文的处理:

  - 1908 年（Grete）: 林奈的拉丁术语（Monandria、Species Plantarum）保持原文 —— 它们属于学术质询那场戏；«Fräulein»、«miss»、«Mr./Mrs. Winterhalter» 等称呼方式与时代相符。
  - 1972 年（Hannes/Gundula）: 口语化的语体，使用符合 1970 年代的青年俚语（«大麻烟»、«条子»、«静坐罢工» 的苏联时期对应说法）。
  - 2020 年（Wong）: 中性、礼貌的文体，使用 «传感器»、«门禁卡» 一类术语。
  - 歌德与里尔克（《杜伊诺哀歌》）的引文，以及菜名 Himmel und Erde，都按字幕的做法保留德语原文，并在旁边附上俄语译文。
  - 斜体 <i> 标签、换行和对话破折号均予保留。

  每一步的备份都保存在 backups/ 中。
```

### 不完整的字幕

![电影《Silent Friend》中的一个画面](/images/article-llm-kovitus.png)

之后我打开电影，随机地前后跳看。在其中一次跳看时，我发现有若干场戏没有译文。我查看了英语原始字幕文件，那里确实也没有翻译。我又下载了另一位译者做的字幕，那些场戏在里面是有翻译的。

于是我在同一个会话里，让智能体把这个问题解决掉——合并这些文件，并顺带把缺失的部分翻译出来。Opus 把缺失的片段翻译得很好，并用我的工具把它们插入了进去。

### 错位

在沙发上舒舒服服地看电影时，大约在结束前半小时，我遇到了错位。幸好在 Android TV 版的 VLC 里，很容易就能确定延迟量（-9 秒）。我一边看一边很快就修正了，但我还需要修好准备分享给其他人的最终字幕文件。

这个工具自带了一组用于修正延迟或提前的命令，类似的场景在[文档](https://github.com/lebe-dev/submarine/blob/main/docs/usecases/README.md)里有描述。智能体处理这类事情毫无压力。

![电影《Silent Friend》中的一个画面](/images/article-llm-final-thoughts.png)

## 结语

当然，我并没有解决字幕翻译的所有问题，比如我还不知道怎么解决判断说话者性别的问题。我想做的下一个实验，是把音轨转写成文字，并以某种格式得到说话者性别的标注。不过这同样不会有 100% 的准确率 :)

- [下载字幕](/subtitles/Stille.Freundin.2025.WEB-DL.1080p.H.264.ru.full.srt)

---
title: LLMでポッドキャストを翻訳する方法
description: LLMを使ってポッドキャストを翻訳する方法。
pubDate: 2026-08-06
draft: true
lang: ja
translationKey: translate-podcasts-with-llm
aiUsageDisclaimer: true
---

きっかけは、マインドフルネス、仏教、瞑想などの実践について調べていたときに、素晴らしいポッドキャスト [Deconstructing Yourself](https://deconstructingyourself.com/deconstructing-yourself-podcast) に出会ったことでした。私の英語力は、一般的な話題やプログラミング、devops、kubernetes、IT全般のポッドキャストを聴くには十分ですが、その外側にある複雑なテーマとなると助けが必要になります。

マインドフルネスや瞑想の話題は、しばしばヒンドゥーの用語や膨大な[仏教の宇宙観](https://en.wikipedia.org/wiki/Buddhist_cosmology)に言及します。
西洋的な思考をする人間にとって、それは大きな気が散る要素であり、理解と実践をさらに混乱させます。

そこで私は、ポッドキャストのエピソードを文字起こしし、ついでに仏教用語を解説してもらうためにLLMを使うことにしました。

## どのモデルを使うか

[字幕の翻訳](/subtitles/)と同じく、Medium Effort のトップクラスのモデルを使っています。どこのモデルか（AnthropicかOpenAIか）は問いません。

## 文字起こしのやり方

エピソードのテキスト版（文字起こし）を作るには、まずエピソードをダウンロードする必要があります。私が気に入ったのは [podcasttomp3.com](https://podcasttomp3.com) というサイトで、人気のポッドキャストを検索してMP3形式でダウンロードできます。

次に Speech to Text 系のモデルが必要です。この記事を書いている時点でトップクラスのモデルのひとつが OpenAI の [Whisper](https://github.com/openai/whisper) です。主要なプラットフォームすべてで利用でき、強力なグラフィックカードは不要で、CPUだけで足ります。

### プロンプト

モデルには正確なプロンプトを与えたほうがよく、そうしないと平均的なやり方で翻訳してしまいます。そこで私はこのような `CLAUDE.md` を用意しました。

```markdown
# CLAUDE.md

このディレクトリでは、ポッドキャスト Deconstructing Yourself の文字起こしとロシア語への翻訳を行います。

まず文字起こしを行い、その後に別途翻訳を行います。成果物として `translated/` サブディレクトリに4つのファイルを期待します。元のmp3ファイルは `completed/` サブディレクトリへ移動します。

## ファイル名の形式

[エピソード番号]_[エピソードのタイトル]_[eng].txt
[エピソード番号]_[エピソードのタイトル]_[rus].txt

## 文字起こしの形式

### テキスト

[HH:MM:SS] [話者] - [テキスト]

## ポッドキャストの説明

Welcome to the Deconstructing Yourself Podcast, hosted by meditation teacher and author Michael Taft. Dedicated to liberation in all its forms, this podcast is passionate about fearlessly investigating, practicing, and reviewing all things related to awakening, meditation, mindfulness, brain hacking, and beyond.

Michael interviews some of the most radical and original thinkers, authors, and spiritual practitioners in the world. Topics include Dzogchen, Advaita Vedanta, nondual Shaiva Tantra, post-traditional Buddhism, entheogens, artificial intelligence, philosophy, neurofeedback, and the neuroscience of the self. Whether you're a longtime practitioner or just beginning your journey, you'll find illuminating conversations on self-inquiry, consciousness, and spiritual transformation.

## 翻訳の注意点

私はインドの用語や仏教の宇宙観に詳しくないので、単語・用語の隣に括弧で簡単な説明を付けてください。

また、それらの用語をすべて集めて、最後に用語集を作成してください。

## 補足

分からないことがあったり、選択に迷ったりしたら、私に聞いてください。
```

プロンプトに書かなくても、Claudeは文字起こしにデフォルトでWhisperを選びます。

エージェント（Claude Code、Codex、opencode、どれでも構いません）を起動するディレクトリにmp3ファイルを置き、`Deconstructing Yourself-112-A Conversation with Joe Hudson.mp3 を処理して` と頼みます。

結果として `translated/` フォルダに英語版とロシア語版の書き起こしができます。

## 翻訳の例

文字起こしの一部です。

```
Deconstructing Yourself
Episode 114 — Meditation, False Insights, and Artificial Wisdom with Ruben Laukkonen

[00:00:00] Michael Taft - Welcome to Deconstructing Yourself, the podcast for metamodern mutants interested in meditation, awakening, vajrayana, tantra, zen, odysseus in Hades, psychedelics, non-duality, love, and more. My name is Michael Taft, your host on the podcast, and in this episode I'm speaking once again with Ruben Laukkonen. Ruben Laukkonen is a neuroscientist at the University of Oxford, where he is a senior researcher in the Department of Psychiatry, a fellow at Linacre College, and co-director of the Center for Eudaimonia and Human Flourishing. His research seeks an empirically grounded and experientially authentic understanding of meditation, insight, consciousness, and non-duality. His current work also explores how brain dynamics and contemplative wisdom might contribute to a safer and more efficient artificial intelligence. Ruben has an eclectic contemplative background, including Zen, Advaita, and Theravada, and was authorized to teach Vipassana in 2024. And now, I give you the episode that I call Meditation, False Insights, and Artificial Wisdom, with Ruben Laukkonen.

[00:01:52] Michael - Ruben, welcome to the Deconstructing Yourself podcast.

[00:01:55] Ruben - So good to be back.

...
```

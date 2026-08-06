---
title: Untertitel aus der Synchronspur erstellen
description: Wie ich Filmuntertitel mit Hilfe eines LLM aus der Synchronspur erstelle
pubDate: 2026-08-06
draft: false
lang: de
translationKey: create-subtitles-from-translated-audio
aiUsageDisclaimer: true
---

![Standbild aus dem Film „Uncle Boonmee erinnert sich an seine früheren Leben"](/images/article-llm-dub-uncle-bunmi.png)

Ich habe bereits über [einige Probleme mit Untertiteln](/de/blog/wie-ich-untertitel-mit-llms-uebersetze/) geschrieben, und dann kam mir eine Idee. Warum nicht die Untertitel aus der Synchronspur erstellen?

Sobald ein neuer Film erscheint, folgt meist recht schnell eine Synchronfassung in allen gängigen Sprachen. Bei Untertiteln sieht es in der Regel trauriger aus: Es kann sein, dass es sie auch ein Jahrzehnt nach dem Kinostart noch nicht gibt.

Diese Methode hat zwei große Vorteile. Erstens — man muss die Untertitel nicht an eine bestimmte Fassung des Films anpassen (Kinofassung, Director's Cut und so weiter). Zweitens — es muss nichts übersetzt werden, das hat bereits ein Mensch getan, und er hat den Kontext des Films berücksichtigt. Übersetzt man zum Beispiel englische Untertitel in eine andere Sprache, muss man den Kontext mitgeben, sonst werden die Wörter falsch übersetzt: Im mittelalterlichen Kontext bedeutet „suffer" zulassen, gestatten, dulden, in der modernen Bedeutung dagegen leiden.

## Was man braucht

Unten steht die Liste dessen, was nötig ist, das Wichtigste daran ist aber der Zugang zu einem LLM und Agenten-Software (Claude Code, Codex, opencode und so weiter): Alles Übrige erledigt der Agent.

- Das Werkzeug [ffmpeg](https://github.com/ffmpeg/ffmpeg), um die Synchronspur aus dem Video zu extrahieren
- [OpenAI Whisper Large v3](https://github.com/openai/whisper) (die lokale Version des Modells), um die Audiospur zu transkribieren. Dafür braucht man keine starke Grafikkarte, ein normaler Prozessor genügt
- Das Werkzeug [submarine](https://github.com/lebe-dev/submarine), um die Integrität der fertigen Untertitel zu prüfen
- Die Filmdatei selbst. Zum Beispiel `Movie.mkv`.

## Die Synchronspur extrahieren

Audiospuren liegen normalerweise innerhalb der Videodatei (des Containers), und wir brauchen die mit der Synchronfassung.

Der Prompt sieht so aus:

```prompt
Extrahiere mit ffmpeg alle Audiospuren aus der Datei Movie.mkv und lege sie daneben ab
```

Danach spielen wir die erhaltenen Audiodateien ab und suchen die, in der unsere Muttersprache zu hören ist.

## Untertitel erstellen

Dann — im Agenten den Kontext zurücksetzen, Medium oder High Effort einstellen und den Prompt starten, der den Rest der Arbeit erledigt:

```prompt
Nutze Whisper Large v3, um die Audiospur aus der Datei movie.mp3 zu
transkribieren, und erzeuge als Ergebnis eine Untertiteldatei (srt).
Verwende für Whisper Large v3 whisper.cpp (einen Build mit Metal-GPU-
Unterstützung), gestartet über whisper-cli.

Prüfe die Integrität der Untertitel mit dem Werkzeug submarine
(https://github.com/lebe-dev/submarine).

## Fallstricke

- **mlx-whisper ist ungeeignet**: Beam Search ist dort nicht implementiert
  (`NotImplementedError`), nur Greedy. whisper.cpp bietet sowohl Beam Search
  als auch Metal-GPU.
- **`-mc 0` ist Pflicht.** Das ist ein Textkontext von null, der wichtigste
  Schutz gegen Schleifen. Mit vollem Kontext gab das Modell schon bei der ersten
  längeren Pause den Text des Prompts selbst aus. Mit `-mc 64` ist die
  Zeichensetzung schöner (3% der Zeilen ohne Satzzeichen statt 22%), aber es
  gehen **23% der Wörter** verloren und es gibt dreimal so viele
  Wiederholungen — Vollständigkeit ist wichtiger.
- **`--prompt` ist bei `-mc 0` nutzlos**: Es wird auf 1 Token gekürzt, die
  Warnung steht im Log. Die Zeichensetzung setzt das Modell auch ohne ihn.
- **VAD (`--vad` + Silero) nicht aktivieren.** Es entfernt zwar die
  Abspann-Halluzinationen, wirft aber auch echte Sätze weg (137 pro Film) und
  gerät selbst in Schleifen. In den Fenstern, in denen der Hauptdurchlauf
  halluziniert hat, war gar keine echte Sprache — es geht nichts verloren.
- **`-dtw` erfordert `-nfa`**: Mit Flash Attention (standardmäßig aktiv) kommen
  alle `t_dtw`-Werte als `-1` zurück.
- `whisper-cli` im Hintergrund nur über `run_in_background` starten, nicht mit
  `nohup ... &` — sonst wird der Prozess zusammen mit dem Wrapper beendet.

## Zusätzlich

Wenn du bei der Arbeit weitere Fallstricke findest, notiere sie dir.
```

Am Ende erzeugt der Agent eine Datei der Art `movie.srt`:

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

Die Untertitel sind einsatzbereit.

![Standbild aus dem Film „Uncle Boonmee erinnert sich an seine früheren Leben"](/images/article-llm-dub-uncle-bunmi-final.png)

## Wenn es noch besser werden soll

Für noch mehr Qualität kann man die englische Beschreibung des Films aus Wikipedia hinzufügen.

Man kann außerdem die Untertiteldatei in der Originalsprache danebenlegen und den Agenten bitten, die Übersetzungsqualität stichprobenartig damit abzugleichen.

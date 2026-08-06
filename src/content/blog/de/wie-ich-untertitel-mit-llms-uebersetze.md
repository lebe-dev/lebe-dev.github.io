---
title: Wie ich Untertitel mit LLMs übersetze
description: Wie ich Filmuntertitel mit LLMs und meinem Tool submarine übersetze — ein Praxisbeispiel mit dem Film Silent Friend (2025).
pubDate: 2026-06-14
draft: false
lang: de
translationKey: translate-subtitles-with-llm
aiUsageDisclaimer: true
---

![submarine, Text-based User Interface](/images/article-llm-intro.png)

In diesem Artikel möchte ich erzählen, wie ich Untertitel mit großen Sprachmodellen (LLMs) übersetze. Es hat sich so ergeben, dass ich Filme, Serien, Dokumentationen, Zeichentrickfilme, Anime und alles andere ausschließlich mit dem Originalton schaue.

Alle weiteren Nebenthemen, etwa «warum schaust du nicht einfach bei den Streaming-Diensten?» und so weiter, gehören nicht in diesen Artikel.

Vor einigen Jahren kamen die LLMs auf, aber erst seit etwa einem Jahr sind sie gut genug zum Übersetzen. Trotzdem gibt es auch 2026 keine «Wunderwaffe» für alle Probleme mit Untertiteln. Und glauben Sie mir, davon gibt es genug. Hier die wichtigsten:

1. Zum Film gibt es überhaupt keine Untertitel
2. Es gibt Untertitel nur in einer Sprache, die ich nicht gut genug oder gar nicht beherrsche
3. Die Untertitel sind unvollständig (ja, das kommt auch vor, dazu unten mehr)
4. Die Untertitel laufen vor oder hinterher. Das passiert, wenn die Fassung des Films nicht übereinstimmt (Kinofassung, Director's Cut und so weiter)
5. LLMs übersetzen hervorragend in viele Sprachen, aber bei Untertiteln versagen sie: Sie zerstören die Timings, lassen Zeilen aus und so weiter
6. Der Text in Untertiteln hat keinen Kontext, und wenn der Film neu ist, kommt das LLM mit der Übersetzung womöglich nicht zurecht. Manche Wörter werden je nach Handlungszeit sehr unterschiedlich übersetzt

Deshalb kam mir nur eine Idee: Man muss dem LLM irgendwie helfen. Und hier ist, womit wir helfen können:

1. Den Fortschritt der Übersetzung verfolgen
2. Das Ergebnis während und nach der Übersetzung auf Vollständigkeit prüfen
3. Die Übersetzung mit dem Original vergleichen können
4. Untertitel reparieren können, wenn es einen Versatz zwischen den Zeilen oder ein Problem mit der Bildrate gibt
5. Die finalen Untertitel aus mehreren Quellen zusammensetzen können (ja, auch das kommt vor)
6. Den Kontext des Werks verstehen

## Das Tool submarine

Im Januar dieses Jahres habe ich das Tool [submarine](https://github.com/lebe-dev/submarine) geschrieben, das den größten Teil dieser Probleme übernommen hat. Von der allerersten Version an war das Tool auf die Übersetzung von Untertiteln mit LLMs ausgelegt, mit einer Neigung zum agentischen Ansatz (Claude Code, Codex, opencode und andere). Zusätzlich habe ich aber auch einen Fallback für klassische Chatbots eingebaut — für den Fall, dass die Limits des Agenten aufgebraucht sind, es aber weiterhin freien Zugang zu Google AI Studio und hundert anderen Chatbots gibt.

Das Tool hilft dem Modell, die Vollständigkeit des Prozesses und die Timings zu wahren, und erlaubt ihm außerdem, die Übersetzung mit dem Original zu vergleichen. Darüber hinaus legt es immer Backups an.

Das Tool unterstützt außerdem eine JSON-Ausgabe, damit Agenten sich in seinen Möglichkeiten leicht zurechtfinden. Vielen Dank an `Justin Poehnelt` für den ausgezeichneten Artikel [You Need to Rewrite Your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/).

Zusätzlich erlaubt das Tool, die Übersetzung über ein TUI (Text-based User Interface) zu beurteilen:

![submarine, Text-based User Interface](/images/article-llm-submarine.png)

Neben der einfachen Navigation nach oben und unten unterstützt dieser Modus verschiedene Arten der Fortbewegung. Zum Beispiel den zufälligen Sprung (Hotkey `r`). Das ist praktisch, um die Qualität der Übersetzung mit eigenen Augen einzuschätzen («vertrauen, aber prüfen»).

Zur Installation genügt es, dem Agenten den Link zum Projekt auf github zu geben — https://github.com/lebe-dev/submarine.

Als Nächstes erzähle ich als Beispiel, wie ich die russischen Untertitel für den Film «Silent Friend» (2025) vorbereitet habe.

## Silent Friend (2025)

2025 kam das Drama [Silent Friend](https://en.wikipedia.org/wiki/Silent_Friend) der Regisseurin [Ildikó Enyedi](https://en.wikipedia.org/wiki/Ildik%C3%B3_Enyedi) heraus. Im Film wird in drei Sprachen gesprochen — Englisch, Deutsch und Chinesisch. Außerdem spielt die Handlung in verschiedenen Zeitebenen: 1908, 1970 und 2020.

Leider bekam der Film keinen breiten Verleih, entsprechend traurig sah es mit den Untertiteln aus. Auf [opensubtitles](https://www.opensubtitles.org/en/subtitles/13792243/silent-friend-en) habe ich englische Untertitel gefunden, die sich aber als unvollständig herausstellten. Es gab auch eine mit einem LLM angefertigte russische Übersetzung, die den Kommentaren nach ebenfalls unvollständig war.

Also habe ich die englischen Untertitel heruntergeladen und mit der Übersetzung begonnen.

### Vorbereitung der Übersetzung

Vor der Übersetzung von Untertiteln zu einem Film ist es wichtig, dass das LLM den Kontext der Übersetzung kennt.

Zum Beispiel bedeutet das englische Wort «suffer» im mittelalterlichen Kontext «zulassen, erlauben». Im heutigen Sinn — Schmerz ertragen.

Das Wort «villain» bedeutet heute «ein böser Charakter», im mittelalterlichen Kontext hingegen «ein Villein — ein hörig gebundener Bauer».

Deshalb habe ich dem ersten Prompt für den Allzweck-Agenten ([Beispiel auf github](https://github.com/lebe-dev/submarine/blob/main/docs/AGENT-TRANSLATION-FLOW.md)) eine Beschreibung des Films und seiner Handlung aus [Wikipedia](https://en.wikipedia.org/wiki/Silent_Friend) mitgegeben.

Als Bestätigung hat `Opus 4.8` (im Modus `high`) in seiner Abschlussantwort erklärt, dass es die Unterschiede zwischen den Zeitebenen berücksichtigt hat:

```
⏺ Fertig. Der Film Silent Friend (2025) ist vollständig übersetzt.

  Zusammenfassung

  - Quelle: Silent.Friend.2025.1080p.WEB-DL.DDP5.1.H.264.en.srt (703 Untertitel)
  - Ergebnis: Stille.Freundin.2025.1080p.WEB-DL.DDP5.1.H.264.ru.srt
  - Fortschritt: 100% (703/703), alle Prüfungen bestanden — perfekte Übereinstimmung, keine ausgelassenen Zeilen, keine Verschiebung der Timecodes.

  Übersetzt in Blöcken zu 100 Zeilen, jeder Block mit verify geprüft. Einige kontextbedingte Entscheidungen über die drei Zeitebenen des Films hinweg:

  - 1908 (Grete): Die lateinischen Begriffe von Linné (Monandria, Species Plantarum) wurden wie im Original belassen — sie gehören zur Szene des akademischen Verhörs; Anreden wie «Fräulein», «miss», «Mr./Mrs. Winterhalter» folgen der Epoche.
  - 1972 (Hannes/Gundula): umgangssprachliches Register, mit zeittypischem Jugendslang der 1970er (sowjetische Entsprechungen für «Joint», «Bullen», «Sitzstreik»).
  - 2020 (Wong): neutraler, höflicher Stil, mit Begriffen wie «Sensor» und «Zugangskarte».
  - Zitate von Goethe und Rilke (Duineser Elegien) sowie der Gerichtsname Himmel und Erde wurden im deutschen Original belassen, mit russischer Erläuterung daneben, wie in den Untertiteln.
  - Kursiv-Tags <i>, Zeilenumbrüche und Dialogstriche wurden beibehalten.

  Backups zu jedem Schritt liegen in backups/.
```

### Unvollständige Untertitel

![Ein Standbild aus dem Film «Silent Friend»](/images/article-llm-kovitus.png)

Danach habe ich den Film gestartet und bin zu zufälligen Szenen vor- und zurückgesprungen. In einem dieser Momente habe ich entdeckt, dass in einigen Szenen die Übersetzung fehlt. Ich habe in die englische Originaldatei geschaut, und tatsächlich fehlte die Übersetzung dort ebenfalls. Ich habe noch weitere Untertitel von einem anderen Übersetzer heruntergeladen, und dort waren diese Szenen übersetzt.

Also habe ich den Agenten in derselben Sitzung gebeten, das zu beheben — die Dateien zusammenzuführen und die fehlenden Stellen dabei gleich zu übersetzen. Opus hat die fehlenden Fragmente hervorragend übersetzt und sie mit meinem Tool eingefügt.

### Versatz

Beim Anschauen des Films, bequem auf dem Sofa, bin ich etwa eine halbe Stunde vor dem Ende auf einen Versatz gestoßen. Zum Glück lässt sich in VLC für Android TV die Verzögerung sehr leicht bestimmen (-9 Sekunden). Ich habe das während des Schauens schnell korrigiert, aber ich musste auch die finale Untertiteldatei reparieren, die ich mit anderen Leuten teilen wollte.

Das Tool bringt eine Reihe von Befehlen zum Beheben von Verzögerungen oder Vorlauf mit; ähnliche Fälle sind in der [Dokumentation](https://github.com/lebe-dev/submarine/blob/main/docs/usecases/README.md) beschrieben. Der Agent kommt damit ohne Weiteres zurecht.

![Ein Standbild aus dem Film «Silent Friend»](/images/article-llm-final-thoughts.png)

## Fazit

Natürlich habe ich nicht alle Probleme der Untertitelübersetzung lösen können — zum Beispiel weiß ich nicht, wie sich das Geschlecht der sprechenden Person bestimmen lässt. Das nächste Experiment, das ich machen möchte, ist die Transkription der Tonspur, um in irgendeiner Form eine Markierung des Geschlechts der sprechenden Person zu bekommen. Aber auch das wird keine 100%ige Genauigkeit liefern :)

- [Untertitel herunterladen](/subtitles/Stille.Freundin.2025.WEB-DL.1080p.H.264.ru.full.srt)

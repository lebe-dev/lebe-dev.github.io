---
title: Créer des sous-titres à partir de la piste doublée
description: Comment je crée des sous-titres de films à partir de la piste doublée avec l'aide d'un LLM
pubDate: 2026-08-06
draft: false
lang: fr
translationKey: create-subtitles-from-translated-audio
aiUsageDisclaimer: true
---

![Image du film « Oncle Boonmee, celui qui se souvient de ses vies antérieures »](/images/article-llm-dub-uncle-bunmi.png)

J'ai déjà décrit [plusieurs problèmes liés aux sous-titres](/fr/blog/comment-je-traduis-des-sous-titres-avec-un-llm/), puis une idée m'est venue. Pourquoi ne pas créer les sous-titres à partir de la piste doublée ?

Dès qu'un nouveau film sort, un doublage dans toutes les langues courantes arrive généralement assez vite. Du côté des sous-titres, c'est souvent plus triste : ils peuvent manquer même dix ans après la sortie.

Cette méthode a deux gros avantages. Le premier — il n'y a pas besoin de caler les sous-titres sur une version précise du film (sortie en salle, director's cut, etc.). Le second — il n'y a rien à traduire, un humain l'a déjà fait et il a tenu compte du contexte du film. Par exemple, quand on traduit des sous-titres anglais vers une autre langue, il faut fournir le contexte, sinon les mots sont mal traduits : dans un contexte médiéval, « suffer » signifie permettre, laisser, tolérer, alors que le sens moderne est souffrir.

## Ce dont on a besoin

Voici la liste de ce qu'il faut, mais l'essentiel reste l'accès à un LLM et un logiciel agentique (Claude Code, Codex, opencode, etc.) : l'agent fera tout le reste.

- L'utilitaire [ffmpeg](https://github.com/ffmpeg/ffmpeg), pour extraire la piste audio doublée de la vidéo
- [OpenAI Whisper Large v3](https://github.com/openai/whisper) (la version locale du modèle), pour transcrire la piste audio. Pas besoin d'une carte graphique puissante, un processeur ordinaire suffit
- L'utilitaire [submarine](https://github.com/lebe-dev/submarine), pour vérifier l'intégrité des sous-titres obtenus
- Le fichier du film. Par exemple, `Movie.mkv`.

## Extraire la piste doublée

Les pistes audio sont généralement stockées à l'intérieur du fichier vidéo (le conteneur), et il nous faut celle qui contient le doublage.

Le prompt sera le suivant :

```prompt
Extrais toutes les pistes audio du fichier Movie.mkv avec ffmpeg et place-les à côté
```

Ensuite on lance les fichiers audio obtenus et on cherche celui où l'on entend notre langue.

## Créer les sous-titres

Puis — dans l'agent, on réinitialise le contexte, on règle sur Medium ou High Effort et on lance le prompt qui fera le reste du travail :

```prompt
Utilise Whisper Large v3 pour transcrire la piste audio du fichier movie.mp3 et
produis en sortie un fichier au format de sous-titres (srt). Pour Whisper
Large v3, utilise whisper.cpp (une build avec prise en charge du Metal-GPU),
lancé via whisper-cli.

Pour vérifier l'intégrité des sous-titres, utilise l'utilitaire submarine
(https://github.com/lebe-dev/submarine).

## Points de vigilance

- **mlx-whisper ne convient pas** : la beam search n'y est pas implémentée
  (`NotImplementedError`), uniquement le greedy. whisper.cpp offre à la fois la
  beam search et le Metal-GPU.
- **`-mc 0` est obligatoire.** C'est un contexte textuel nul, la principale
  protection contre les boucles. Avec le contexte complet, le modèle a recraché
  le texte du prompt lui-même dès la première longue pause. Avec `-mc 64`, la
  ponctuation est plus jolie (3 % de répliques sans signes contre 22 %), mais on
  perd **23 % des mots** et il y a trois fois plus de répétitions — l'exhaustivité
  compte davantage.
- **`--prompt` est inutile avec `-mc 0`** : il est tronqué à 1 token,
  l'avertissement apparaît dans le log. Le modèle met la ponctuation même sans
  lui.
- **Ne pas activer le VAD (`--vad` + Silero).** Il supprime bien les
  hallucinations de type générique, mais il jette aussi de vraies répliques
  (137 par film) et se met lui-même à boucler. Dans les fenêtres où la passe
  principale hallucinait, il n'y avait en fait aucune parole réelle — rien à
  perdre.
- **`-dtw` exige `-nfa`** : avec la flash attention (activée par défaut), tous
  les `t_dtw` reviennent à `-1`.
- Lancer `whisper-cli` en arrière-plan uniquement via `run_in_background`, jamais
  avec `nohup ... &` — sinon le processus est tué en même temps que le wrapper.

## En complément

Si tu découvres d'autres points de vigilance pendant le travail, note-les.
```

Une fois le travail terminé, l'agent produit un fichier du type `movie.srt` :

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

Les sous-titres sont prêts à l'emploi.

![Image du film « Oncle Boonmee, celui qui se souvient de ses vies antérieures »](/images/article-llm-dub-uncle-bunmi-final.png)

## Si l'on veut encore plus de qualité

Pour une qualité encore meilleure, on peut ajouter la description anglaise du film tirée de Wikipedia.

On peut aussi placer à côté le fichier de sous-titres en langue originale et demander à l'agent de comparer par sondage la qualité de la traduction.

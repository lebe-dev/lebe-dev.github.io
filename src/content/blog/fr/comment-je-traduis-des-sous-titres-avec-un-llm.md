---
title: Comment je traduis des sous-titres avec un LLM
description: Comment je traduis les sous-titres de films avec des LLM grâce à mon outil submarine — étude de cas avec le film Silent Friend (2025).
pubDate: 2026-06-14
draft: true
lang: fr
translationKey: translate-subtitles-with-llm
aiUsageDisclaimer: true
---

![submarine, Text-based User Interface](/images/article-llm-intro.png)

Dans cet article, je veux raconter comment je traduis des sous-titres avec de grands modèles de langage (LLM). Il se trouve que je regarde les films, les séries, les documentaires, les dessins animés, les animes et tout le reste uniquement avec la bande son originale.

Tous les autres sujets annexes, du type « pourquoi ne pas simplement regarder sur les services de streaming ? », sortent du cadre de cet article.

Les LLM sont apparus il y a quelques années, mais cela ne fait qu'un an environ qu'ils sont assez bons pour traduire. Malgré tout, même en 2026, il n'existe pas de « solution miracle » à tous les problèmes de sous-titres. Et croyez-moi, il y en a beaucoup. Voici les principaux :

1. Le film n'a aucun sous-titre
2. Il n'existe des sous-titres que dans une langue que je ne maîtrise pas assez, voire pas du tout
3. Les sous-titres sont incomplets (oui, ça arrive aussi, j'y reviens plus bas)
4. Les sous-titres sont en avance ou en retard. Cela arrive quand la version du film ne correspond pas (version cinéma, version du réalisateur, etc.)
5. Les LLM traduisent très bien vers de nombreuses langues, mais ils cassent sur les sous-titres : ils détruisent les timings, sautent des répliques, etc.
6. Le texte des sous-titres n'a pas de contexte, et si le film est récent, le LLM peut ne pas s'en sortir avec la traduction. Certains mots se traduisent très différemment selon l'époque de l'action

C'est pourquoi la seule idée qui me soit venue, c'est qu'il faut aider le LLM d'une manière ou d'une autre. Et voici en quoi nous pouvons l'aider :

1. Suivre l'avancement de la traduction
2. Vérifier l'intégrité du résultat pendant la traduction et à la fin
3. Pouvoir comparer la traduction avec l'original
4. Pouvoir réparer les sous-titres en cas de décalage entre les répliques ou de problème de fréquence d'images
5. Pouvoir assembler les sous-titres finaux à partir de plusieurs sources (oui, ça arrive aussi)
6. Comprendre le contexte de l'œuvre

## L'outil submarine

En janvier de cette année, j'ai écrit l'outil [submarine](https://github.com/lebe-dev/submarine), qui a pris en charge la plus grande partie de ces problèmes. Dès la toute première version, l'outil a été conçu pour la traduction de sous-titres avec des LLM, avec un penchant pour l'approche agentique (Claude Code, Codex, opencode et d'autres). Cela dit, j'ai aussi ajouté une solution de repli pour les chatbots classiques — pour les situations où les limites de l'agent sont épuisées, mais où il reste un accès libre à Google AI Studio et à cent autres chatbots.

L'outil aide le modèle à préserver l'intégrité du processus et les timings, et lui permet aussi de comparer la traduction avec l'original. En plus de cela, il fait toujours des sauvegardes.

L'outil prend également en charge une sortie JSON, pour que les agents se repèrent facilement dans ses possibilités. Merci à `Justin Poehnelt` pour son excellent article [You Need to Rewrite Your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/).

En outre, l'outil permet d'évaluer la traduction via une TUI (Text-based User Interface) :

![submarine, Text-based User Interface](/images/article-llm-submarine.png)

Outre la navigation de base vers le haut et vers le bas, ce mode prend en charge différentes façons de se déplacer. Par exemple le saut aléatoire (raccourci `r`). C'est pratique pour juger de ses propres yeux la qualité de la traduction (« faire confiance, mais vérifier »).

Pour l'installer, il suffit de donner à l'agent le lien vers le projet sur github — https://github.com/lebe-dev/submarine.

Ensuite, à titre d'exemple, je raconte comment j'ai préparé les sous-titres russes du film « Silent Friend » (2025).

## Silent Friend (2025)

En 2025 est sorti le drame [Silent Friend](https://en.wikipedia.org/wiki/Silent_Friend) de la réalisatrice [Ildikó Enyedi](https://en.wikipedia.org/wiki/Ildik%C3%B3_Enyedi). Le film est parlé en trois langues : anglais, allemand et chinois. De plus, l'action se déroule à différentes époques : 1908, 1970 et 2020.

Malheureusement, le film n'a pas eu de large distribution, et du coup la situation était plutôt triste côté sous-titres. Sur [opensubtitles](https://www.opensubtitles.org/en/subtitles/13792243/silent-friend-en), j'ai trouvé des sous-titres anglais, mais ils se sont révélés incomplets. Il y avait aussi une traduction russe faite avec un LLM, mais à en juger par les commentaires, elle était incomplète elle aussi.

J'ai donc téléchargé les sous-titres anglais et j'ai commencé à les traduire.

### Préparation de la traduction

Avant de traduire les sous-titres d'un film, il est important que le LLM dispose du contexte de la traduction.

Par exemple, dans un contexte médiéval, le mot anglais « suffer » signifie laisser, permettre. Au sens moderne — supporter la douleur.

Le mot « villain » signifie aujourd'hui « un personnage méchant », mais dans le contexte médiéval il désignait « un vilain — un paysan attaché à la terre ».

C'est pourquoi, dans le premier prompt destiné à l'agent généraliste ([exemple sur github](https://github.com/lebe-dev/submarine/blob/main/docs/AGENT-TRANSLATION-FLOW.md)), je lui ai transmis une description du film et de son intrigue tirée de [Wikipédia](https://en.wikipedia.org/wiki/Silent_Friend).

En guise de confirmation, `Opus 4.8` (en mode `high`) a expliqué dans sa réponse finale qu'il avait tenu compte des différences entre les époques :

```
⏺ Terminé. Le film Silent Friend (2025) est entièrement traduit.

  Résumé

  - Source : Silent.Friend.2025.1080p.WEB-DL.DDP5.1.H.264.en.srt (703 sous-titres)
  - Résultat : Stille.Freundin.2025.1080p.WEB-DL.DDP5.1.H.264.ru.srt
  - Progression : 100% (703/703), toutes les vérifications passées — correspondance parfaite, aucune réplique sautée, aucun décalage des timecodes.

  Traduit par blocs de 100 lignes, chaque bloc vérifié avec verify. Quelques décisions dictées par le contexte à travers les trois lignes temporelles du film :

  - 1908 (Grete) : les termes latins de Linné (Monandria, Species Plantarum) ont été conservés tels quels — ils font partie de la scène de l'interrogatoire académique ; les formules d'adresse telles que « Fräulein », « miss », « Mr./Mrs. Winterhalter » suivent l'époque.
  - 1972 (Hannes/Gundula) : registre familier, avec l'argot des jeunes des années 1970 (équivalents de l'époque soviétique pour « joint », « flics », « sit-in »).
  - 2020 (Wong) : style neutre et poli, avec des termes comme « capteur » et « badge d'accès ».
  - Les citations de Goethe et de Rilke (Élégies de Duino) ainsi que le nom du plat Himmel und Erde ont été laissés dans l'allemand d'origine, avec une glose russe à côté, comme dans les sous-titres.
  - Les balises d'italique <i>, les sauts de ligne et les tirets de dialogue ont été préservés.

  Les sauvegardes de chaque étape se trouvent dans backups/.
```

### Sous-titres incomplets

![Une image du film « Silent Friend »](/images/article-llm-kovitus.png)

Ensuite, j'ai lancé le film et j'ai sauté en avant et en arrière vers des scènes au hasard. À un de ces moments, j'ai découvert que dans plusieurs scènes il n'y avait pas de traduction. J'ai regardé le fichier de sous-titres anglais d'origine et, en effet, la traduction y manquait aussi. J'ai téléchargé d'autres sous-titres, d'un autre traducteur, et là ces scènes étaient traduites.

Du coup, dans la même session, j'ai demandé à l'agent de corriger cela — de fusionner les fichiers et de traduire au passage ce qui manquait. Opus a très bien traduit les fragments manquants et les a insérés à l'aide de mon outil.

### Décalage

En regardant le film, confortablement installé sur le canapé, environ une demi-heure avant la fin, je suis tombé sur un décalage. Heureusement, dans VLC pour Android TV, il est très facile de déterminer le retard (-9 secondes). Je l'ai corrigé rapidement pendant le visionnage, mais il fallait aussi réparer le fichier final de sous-titres que je comptais partager avec d'autres personnes.

L'outil est livré avec un ensemble de commandes pour corriger les retards ou les avances ; des cas semblables sont décrits dans la [documentation](https://github.com/lebe-dev/submarine/blob/main/docs/usecases/README.md). L'agent s'en sort sans difficulté.

![Une image du film « Silent Friend »](/images/article-llm-final-thoughts.png)

## Conclusion

Bien sûr, je n'ai pas réussi à résoudre absolument tous les problèmes de traduction des sous-titres — par exemple, je ne sais pas comment résoudre le problème de la détermination du genre de la personne qui parle. La prochaine expérience que je veux mener, c'est de transcrire la piste audio et d'obtenir, sous une forme ou une autre, un marquage du genre de la personne qui parle. Mais cela non plus ne donnera pas une précision de 100 % :)

- [Télécharger les sous-titres](/subtitles/Stille.Freundin.2025.WEB-DL.1080p.H.264.ru.full.srt)

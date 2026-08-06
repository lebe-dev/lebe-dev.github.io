---
title: Crear subtítulos a partir de la pista de doblaje
description: Cómo creo subtítulos de películas a partir de la pista de doblaje con ayuda de un LLM
pubDate: 2026-08-06
draft: false
lang: es
translationKey: create-subtitles-from-translated-audio
aiUsageDisclaimer: true
---

![Fotograma de la película «El tío Boonmee que recuerda sus vidas pasadas»](/images/article-llm-dub-uncle-bunmi.png)

Ya escribí antes sobre [una serie de problemas con los subtítulos](/es/blog/como-traduzco-subtitulos-con-llm/), y luego se me ocurrió una idea. ¿Por qué no crear los subtítulos a partir de la pista de doblaje?

En cuanto se estrena una película, el doblaje en todos los idiomas populares suele llegar bastante rápido. Con los subtítulos la cosa suele ser más triste: pueden no existir ni siquiera una década después del estreno.

Este método tiene dos grandes ventajas. La primera — no hace falta ajustar los subtítulos a una versión concreta de la película (versión de cine, del director, etc.). La segunda — no hay que traducir nada, ya lo hizo una persona real que tuvo en cuenta el contexto de la película. Por ejemplo, al traducir subtítulos en inglés a cualquier otro idioma hay que dar contexto, si no las palabras salen mal: en un contexto medieval, «suffer» significa permitir, dejar, consentir, mientras que el sentido moderno es sufrir.

## Qué hace falta

Abajo está la lista de lo que se necesita, pero lo principal es tener acceso a un LLM y software agéntico (Claude Code, Codex, opencode, etc.): el agente hará todo lo demás.

- La utilidad [ffmpeg](https://github.com/ffmpeg/ffmpeg), para extraer del vídeo la pista de audio con el doblaje
- [OpenAI Whisper Large v3](https://github.com/openai/whisper) (la versión local del modelo), para transcribir la pista de audio. Para ejecutarlo no hace falta una tarjeta gráfica potente, basta con un procesador normal
- La utilidad [submarine](https://github.com/lebe-dev/submarine), para comprobar la integridad de los subtítulos resultantes
- El archivo de la película. Por ejemplo, `Movie.mkv`.

## Extraer la pista de doblaje

Normalmente las pistas de audio están dentro del archivo de vídeo (el contenedor) y nosotros necesitamos sacar la del doblaje.

El prompt será este:

```prompt
Extrae con ffmpeg todas las pistas de audio del archivo Movie.mkv y déjalas al lado
```

Después reproducimos los archivos de audio obtenidos y buscamos aquel en el que suena nuestro idioma.

## Crear los subtítulos

A continuación — en el agente reiniciamos el contexto, ponemos Medium o High Effort y lanzamos el prompt que hará el resto del trabajo:

```prompt
Usa Whisper Large v3 para transcribir la pista de audio del archivo movie.mp3 y
genera como salida un archivo en formato de subtítulos (srt). Para Whisper
Large v3 usa whisper.cpp (una compilación con soporte de Metal-GPU),
ejecutándolo mediante whisper-cli.

Para comprobar la integridad de los subtítulos usa la utilidad submarine
(https://github.com/lebe-dev/submarine).

## Detalles a tener en cuenta

- **mlx-whisper no sirve**: la beam search no está implementada allí
  (`NotImplementedError`), solo greedy. whisper.cpp ofrece tanto beam search
  como Metal-GPU.
- **`-mc 0` es obligatorio.** Es contexto de texto cero, la principal
  protección contra los bucles. Con el contexto completo, el modelo soltó el
  texto del propio prompt en la primera pausa larga. Con `-mc 64` la puntuación
  queda más bonita (3% de líneas sin signos frente al 22%), pero se pierde el
  **23% de las palabras** y hay el triple de repeticiones — la integridad
  importa más.
- **`--prompt` con `-mc 0` es inútil**: se recorta a 1 token, el aviso se ve en
  el log. El modelo pone la puntuación igualmente.
- **No activar VAD (`--vad` + Silero).** Elimina las alucinaciones de tipo
  créditos, pero también descarta frases reales (137 por película) y entra en
  bucle por su cuenta. En las ventanas donde la pasada principal alucinó
  resultó que no había habla real — no se pierde nada.
- **`-dtw` requiere `-nfa`**: con flash attention (activado por defecto) todos
  los `t_dtw` vuelven como `-1`.
- Ejecutar `whisper-cli` en segundo plano solo mediante `run_in_background`,
  nunca con `nohup ... &` — si no, el proceso muere junto con el envoltorio.

## Adicionalmente

Si encuentras otros detalles durante el trabajo, apúntatelos.
```

Al terminar, el agente creará un archivo del tipo `movie.srt`:

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

Los subtítulos están listos para usar.

![Fotograma de la película «El tío Boonmee que recuerda sus vidas pasadas»](/images/article-llm-dub-uncle-bunmi-final.png)

## Si se quiere aún más calidad

Para más calidad todavía se puede añadir la descripción de la película en inglés desde Wikipedia.

También se puede dejar al lado el archivo de subtítulos en el idioma original y pedirle al agente que compare la calidad de la traducción de forma aleatoria.

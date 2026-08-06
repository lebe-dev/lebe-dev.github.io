---
title: Cómo traduzco subtítulos con LLM
description: Cómo traduzco subtítulos de películas con LLM usando mi herramienta submarine — un caso práctico con la película Silent Friend (2025).
pubDate: 2026-06-14
draft: false
lang: es
translationKey: translate-subtitles-with-llm
aiUsageDisclaimer: true
---

![submarine, Text-based User Interface](/images/article-llm-intro.png)

En este artículo quiero contar cómo traduzco subtítulos con modelos de lenguaje grandes (LLM). Da la casualidad de que veo películas, series, documentales, dibujos animados, anime y todo lo demás únicamente con el audio original.

El resto de temas paralelos, como «¿por qué no lo ves y ya está en los servicios de streaming?» y demás, quedan fuera de este artículo.

Hace unos años aparecieron los LLM, pero solo desde hace un año más o menos son lo bastante buenos para traducir. Aun así, incluso en 2026 no hay una «bala de plata» para todos los problemas con los subtítulos. Y créanme, hay bastantes. Estos son los principales:

1. La película no tiene subtítulos de ningún tipo
2. Solo hay subtítulos en un idioma que no domino lo suficiente o que directamente no conozco
3. Los subtítulos están incompletos (sí, eso también pasa, más abajo lo cuento)
4. Los subtítulos se adelantan o se retrasan. Eso ocurre cuando no coincide la versión de la película (versión de cine, versión del director, etcétera)
5. Los LLM traducen de maravilla a muchos idiomas, pero se rompen con los subtítulos: destrozan los tiempos, se saltan líneas y demás
6. El texto de los subtítulos no tiene contexto, y si la película es nueva, el LLM puede no dar la talla con la traducción. Algunas palabras se traducen de forma muy distinta según la época en la que transcurre la acción

Por eso la única idea que se me ocurrió fue que hay que ayudar de algún modo al LLM. Y esto es en lo que podemos ayudar:

1. Seguir el progreso de la traducción
2. Comprobar la integridad del resultado durante la traducción y al terminarla
3. Poder comparar la traducción con el original
4. Poder arreglar los subtítulos si hay un desfase entre líneas o un problema con la tasa de fotogramas
5. Poder montar los subtítulos finales a partir de varias fuentes (sí, eso también pasa)
6. Entender el contexto de la obra

## La herramienta submarine

En enero de este año escribí la herramienta [submarine](https://github.com/lebe-dev/submarine), que se hizo cargo de la mayor parte de estos problemas. Desde la primera versión, la herramienta se pensó para traducir subtítulos con LLM, con una inclinación hacia el enfoque agéntico (Claude Code, Codex, opencode y otros). Dicho esto, también añadí una alternativa para los chatbots clásicos, para cuando se agotan los límites del agente pero sigue habiendo acceso libre a Google AI Studio y a otros cien chatbots.

La herramienta ayuda al modelo a mantener la integridad del proceso y de los tiempos, y además le permite comparar la traducción con el original. Por si fuera poco, siempre hace copias de seguridad.

La herramienta también admite salida en JSON para que a los agentes les resulte fácil orientarse entre sus posibilidades. Gracias a `Justin Poehnelt` por el excelente artículo [You Need to Rewrite Your CLI for AI Agents](https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/).

Además, la herramienta permite valorar la traducción mediante una TUI (Text-based User Interface):

![submarine, Text-based User Interface](/images/article-llm-submarine.png)

Aparte de la navegación básica arriba y abajo, este modo admite distintas formas de desplazarse. Por ejemplo, el salto aleatorio (atajo `r`). Es cómodo para valorar con los propios ojos la calidad de la traducción («confía, pero verifica»).

Para instalarla basta con darle al agente el enlace al proyecto en github — https://github.com/lebe-dev/submarine.

A continuación, como ejemplo, cuento cómo preparé los subtítulos en ruso para la película «Silent Friend» (2025).

## Silent Friend (2025)

En 2025 se estrenó el drama [Silent Friend](https://en.wikipedia.org/wiki/Silent_Friend) de la directora [Ildikó Enyedi](https://en.wikipedia.org/wiki/Ildik%C3%B3_Enyedi). En la película se habla en tres idiomas: inglés, alemán y chino. Además, la acción transcurre en distintas épocas: 1908, 1970 y 2020.

Por desgracia, la película no tuvo una distribución amplia, así que la cosa estaba bastante triste con los subtítulos. En [opensubtitles](https://www.opensubtitles.org/en/subtitles/13792243/silent-friend-en) encontré subtítulos en inglés, pero resultaron estar incompletos. También había una traducción al ruso hecha con un LLM, pero a juzgar por los comentarios, también estaba incompleta.

Así que descargué los subtítulos en inglés y me puse a traducirlos.

### Preparación de la traducción

Antes de traducir los subtítulos de una película es importante que el LLM tenga el contexto de la traducción.

Por ejemplo, en un contexto medieval la palabra inglesa «suffer» significa permitir, consentir. En el sentido actual, soportar dolor.

La palabra «villain» hoy significa «un personaje malvado», pero en el contexto medieval significaba «villein, un campesino sujeto a servidumbre».

Por eso, al primer prompt para el agente de propósito general ([ejemplo en github](https://github.com/lebe-dev/submarine/blob/main/docs/AGENT-TRANSLATION-FLOW.md)) le pasé una descripción de la película y de su argumento sacada de [Wikipedia](https://en.wikipedia.org/wiki/Silent_Friend).

Como confirmación, `Opus 4.8` (en modo `high`) explicó en su respuesta final que había tenido en cuenta las diferencias entre las épocas:

```
⏺ Listo. La película Silent Friend (2025) está traducida por completo.

  Resumen

  - Origen: Silent.Friend.2025.1080p.WEB-DL.DDP5.1.H.264.en.srt (703 subtítulos)
  - Resultado: Stille.Freundin.2025.1080p.WEB-DL.DDP5.1.H.264.ru.srt
  - Progreso: 100% (703/703), todas las comprobaciones superadas — coincidencia perfecta, sin líneas omitidas ni desplazamiento de códigos de tiempo.

  Traducido en bloques de 100 líneas, verificando cada bloque con verify. Algunas decisiones marcadas por el contexto a lo largo de las tres líneas temporales de la película:

  - 1908 (Grete): se mantuvieron los términos latinos de Linneo (Monandria, Species Plantarum) como en el original — forman parte de la escena del interrogatorio académico; las fórmulas de tratamiento como «Fräulein», «miss», «Mr./Mrs. Winterhalter» siguen la época.
  - 1972 (Hannes/Gundula): registro coloquial, con jerga juvenil propia de los años setenta (equivalentes de la época soviética para «porro», «maderos», «sentada»).
  - 2020 (Wong): estilo neutro y cortés, con términos como «sensor» y «tarjeta de acceso».
  - Las citas de Goethe y Rilke (Elegías de Duino) y el nombre del plato Himmel und Erde se dejaron en el alemán original, con una glosa en ruso al lado, como en los subtítulos.
  - Se conservaron las etiquetas de cursiva <i>, los saltos de línea y las rayas de diálogo.

  Las copias de seguridad de cada paso están en backups/.
```

### Subtítulos incompletos

![Un fotograma de la película «Silent Friend»](/images/article-llm-kovitus.png)

Después de eso puse la película y salté hacia atrás y hacia delante a escenas aleatorias. En uno de esos momentos descubrí que en varias escenas no había traducción. Miré el archivo de subtítulos originales en inglés y, en efecto, allí tampoco había traducción. Descargué otros subtítulos de otro traductor y ahí esas escenas sí estaban traducidas.

Así que, en la misma sesión, le pedí al agente que lo arreglara: que uniera los archivos y, de paso, tradujera lo que faltaba. Opus tradujo estupendamente los fragmentos que faltaban y los insertó con mi herramienta.

### Desfase

Viendo la película, cómodamente en el sofá, media hora antes del final me topé con un desfase. Por suerte, en VLC para Android TV es muy fácil averiguar el retraso (-9 segundos). Lo corregí rápidamente mientras veía la película, pero además tenía que arreglar el archivo final de subtítulos que pensaba compartir con otras personas.

La herramienta incluye una serie de comandos para arreglar retrasos o adelantos; casos parecidos están descritos en la [documentación](https://github.com/lebe-dev/submarine/blob/main/docs/usecases/README.md). El agente se apaña con esto sin problema.

![Un fotograma de la película «Silent Friend»](/images/article-llm-final-thoughts.png)

## Conclusiones

Por supuesto, no he conseguido resolver absolutamente todos los problemas de la traducción de subtítulos; por ejemplo, no sé cómo resolver el problema de determinar el género de quien habla. El próximo experimento que quiero hacer es transcribir la pista de audio y obtener, en algún formato, una marca del género de quien habla. Pero eso tampoco dará una precisión del 100% :)

- [Descargar los subtítulos](/subtitles/Stille.Freundin.2025.WEB-DL.1080p.H.264.ru.full.srt)

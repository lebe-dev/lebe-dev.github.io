<script lang="ts">
  import { onMount } from 'svelte';
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { formatTimecode, segmentId } from '$lib/podcastTimecode';
  import { hitsBySegment, splitSegment, type TermHit } from '$lib/podcastTerms';

  interface Segment {
    start: string;
    end: string;
    speaker: string;
    text: string;
  }

  interface GlossaryEntry {
    term: string;
    definition: string;
  }

  let {
    titles,
    transcripts,
    glossaries,
    termHits,
    langNames,
    initial,
    switchLabel,
    timecodeLabel,
    glossaryLabel,
    guest,
    guestHref,
    guestLabel,
  }: {
    titles: Record<string, string>;
    transcripts: Record<string, Segment[]>;
    glossaries: Record<string, GlossaryEntry[]>;
    termHits: Record<string, TermHit[]>;
    langNames: Record<string, string>;
    initial: string;
    switchLabel: string;
    timecodeLabel: string;
    glossaryLabel: string;
    guest?: string;
    guestHref?: string;
    guestLabel?: string;
  } = $props();

  // One tooltip instance shared by every highlighted word: an episode can carry
  // 150 occurrences, and each would otherwise bring its own floating layer.
  const tether = TooltipPrimitive.createTether<GlossaryEntry>();

  const STORAGE_KEY = 'podcast-transcript-lang';

  const langs = Object.keys(transcripts);

  let current = $state(initial);
  const segments = $derived(transcripts[current] ?? []);
  // Only some languages of some episodes carry one; the section is skipped otherwise.
  const glossary = $derived(glossaries[current] ?? []);
  // Where those terms sit in the text, precomputed by `just glossary`.
  const hits = $derived(hitsBySegment(termHits[current] ?? []));

  // Two segments can legitimately share a start timecode (e.g. a one-word
  // interjection), which would otherwise collide as both the #each key and
  // the anchor id. Disambiguate repeats with a trailing "-2", "-3", ...
  const ids = $derived.by(() => {
    const counts = new Map<string, number>();
    return segments.map((segment) => {
      const base = segmentId(segment.start);
      const n = (counts.get(base) ?? 0) + 1;
      counts.set(base, n);
      return n > 1 ? `${base}-${n}` : base;
    });
  });

  // The site locale picks the first language; a choice made earlier wins over it.
  onMount(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in transcripts) current = stored;
    } catch {}
  });

  const select = (lang: string) => {
    current = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };
</script>

<h1 lang={current}>{titles[current] ?? ''}</h1>

{#if (guest && guestHref) || glossary.length > 0 || langs.length > 1}
  <div class="meta-row">
    {#if guest && guestHref}
      <p class="guest-link">
        {guestLabel}: <a href={guestHref}>{guest}</a>
      </p>
    {/if}

    {#if glossary.length > 0}
      <p class="glossary-link">
        <a href="#glossary-heading">{glossaryLabel}</a>
      </p>
    {/if}

    {#if langs.length > 1}
      <div class="lang-switch" role="group" aria-label={switchLabel}>
        {#each langs as lang (lang)}
          <button
            type="button"
            lang={lang}
            class:active={lang === current}
            aria-pressed={lang === current}
            onclick={() => select(lang)}
          >
            {langNames[lang] ?? lang}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<Tooltip.Provider delayDuration={150} disableCloseOnTriggerClick>
  <Tooltip.Root {tether}>
    {#snippet children({ payload })}
      {#if payload}
        <Tooltip.Content
          lang={current}
          sideOffset={6}
          collisionPadding={12}
          class="block max-w-[min(24rem,calc(100vw-1.5rem))] rounded-md border border-primary/80 bg-popover px-3 py-2 text-left font-sans text-[0.8rem] leading-snug text-popover-foreground shadow-lg"
          arrowClasses="bg-popover fill-popover border-b border-r border-primary/80"
        >
          <strong class="block font-semibold">{payload.term}</strong>
          {payload.definition}
        </Tooltip.Content>
      {/if}
    {/snippet}
  </Tooltip.Root>

  <div class="transcript" lang={current}>
    {#each segments as segment, i (ids[i])}
      {@const id = ids[i]}
      {@const parts = splitSegment(segment.text, hits.get(i) ?? [])}
      <article class="segment" {id}>
        <header class="segment-head">
          <span class="speaker">{segment.speaker}</span>
          <a class="timecode" href={`#${id}`} title={timecodeLabel}>
            <span class="visually-hidden">{timecodeLabel} — </span>
            {formatTimecode(segment.start)}
          </a>
        </header>
        <!-- Kept on one line on purpose: a newline between the parts would be
             rendered as a space and pull the sentence apart. -->
        <p class="segment-text">{#each parts as part, p (p)}{#if part.term !== undefined && glossary[part.term]}<Tooltip.Trigger
              {tether}
              id={`${id}-t${p}`}
              payload={glossary[part.term]}
              onclick={() => tether.open(`${id}-t${p}`)}
            >{#snippet child({ props })}{@const { type, ...attrs } = props}<span
                  {...attrs}
                  role="button"
                  class="term">{part.text}</span>{/snippet}</Tooltip.Trigger>{:else}{part.text}{/if}{/each}</p>
      </article>
    {/each}
  </div>
</Tooltip.Provider>

{#if glossary.length > 0}
  <section class="glossary" lang={current} aria-labelledby="glossary-heading">
    <h2 id="glossary-heading">{glossaryLabel}</h2>
    <dl>
      {#each glossary as entry (entry.term)}
        <div class="glossary-entry">
          <dt>{entry.term}</dt>
          <dd>{entry.definition}</dd>
        </div>
      {/each}
    </dl>
  </section>
{/if}

<style>
  .meta-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.5rem 1rem;
    margin: 0.75rem 0 2rem;
  }

  .guest-link {
    grid-column: 1;
    justify-self: start;
    margin: 0;
    font-family: var(--sans);
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .guest-link a {
    color: inherit;
    text-decoration: none;
  }

  .guest-link a:hover {
    color: var(--link);
    text-decoration: underline;
  }

  .glossary-link {
    grid-column: 2;
    justify-self: center;
    margin: 0;
    font-family: var(--sans);
    font-size: 0.85rem;
  }

  .glossary-link a {
    color: var(--text-muted);
    text-decoration: none;
  }

  .glossary-link a:hover {
    color: var(--link);
    text-decoration: underline;
  }

  .lang-switch {
    grid-column: 3;
    justify-self: end;
    display: inline-flex;
    gap: 0.2rem;
    padding: 0.15rem;
    border: 1px solid var(--rule);
    border-radius: 6px;
  }

  .lang-switch button {
    padding: 0.15rem 0.65rem;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-muted);
    font-family: var(--sans);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .lang-switch button:hover {
    color: var(--fg);
  }

  .lang-switch button.active {
    background: var(--rule);
    color: var(--fg);
  }

  .lang-switch button:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 2px;
  }

  .segment {
    margin: 0 0 2rem;
    scroll-margin-top: 1.5rem;
  }

  .segment:target .segment-head {
    color: var(--link);
  }

  .segment-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.4rem;
    font-family: var(--sans);
    font-size: 0.8rem;
  }

  .speaker {
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .timecode {
    flex-shrink: 0;
    color: var(--text-muted);
    text-decoration: none;
    font-variant-numeric: tabular-nums;
  }

  .timecode:hover,
  .timecode:focus-visible {
    color: var(--link);
  }

  .timecode:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 3px;
    border-radius: 4px;
  }

  .segment-text {
    margin: 0;
  }

  /* Frequent terms recur dozens of times in one episode, so the mark has to be
     quiet enough to read straight through and still be findable. */
  .term {
    border-bottom: 1px dotted var(--text-muted);
    cursor: help;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }

  .term:hover,
  .term[data-state='instant-open'],
  .term[data-state='delayed-open'] {
    border-bottom-color: var(--link);
    background-color: color-mix(in srgb, var(--link) 8%, transparent);
  }

  .term:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .glossary {
    margin-top: 3rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--rule);
  }

  .glossary h2 {
    margin: 0 0 1.25rem;
    font-family: var(--sans);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .glossary dl {
    margin: 0;
  }

  .glossary-entry {
    margin-bottom: 0.9rem;
  }

  .glossary-entry:last-child {
    margin-bottom: 0;
  }

  .glossary dt {
    display: inline;
    font-weight: 600;
  }

  /* Term and definition read as one sentence, so keep them on the same line. */
  .glossary dd {
    display: inline;
    margin: 0;
  }

  .glossary dt::after {
    content: ' — ';
    font-weight: 400;
    color: var(--text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .lang-switch button,
    .term {
      transition: none;
    }
  }

  @media (prefers-contrast: more) {
    .timecode,
    .lang-switch button {
      color: var(--fg);
    }

    .term {
      border-bottom-style: solid;
      border-bottom-color: var(--fg);
    }
  }

  @media (max-width: 480px) {
    .meta-row {
      grid-template-columns: 1fr;
      justify-items: start;
    }

    .glossary-link,
    .lang-switch {
      grid-column: 1;
      justify-self: start;
    }
  }
</style>

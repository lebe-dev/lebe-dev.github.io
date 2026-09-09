<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { hitsBySegment, splitSegment, type TermHit } from '$lib/podcastTerms';
  import { splitEmphasis, type Block } from '$lib/bookBlocks';

  interface GlossaryEntry {
    term: string;
    definition: string;
  }

  interface Props {
    blocks: Block[];
    /** Where the terms sit, precomputed by `just glossary`. */
    termHits: TermHit[];
    glossary: GlossaryEntry[];
    glossaryLabel: string;
  }

  const { blocks, termHits, glossary, glossaryLabel }: Props = $props();

  // One tooltip serves every term on the page — see Transcript.svelte, which
  // does the same for a transcript. A floating layer per occurrence would be
  // hundreds of them in a long chapter.
  const tether = TooltipPrimitive.createTether<GlossaryEntry>();
  const hits = $derived(hitsBySegment(termHits));
</script>

<Tooltip.Provider delayDuration={150} disableCloseOnTriggerClick>
  <Tooltip.Root {tether}>
    {#snippet children({ payload })}
      {#if payload}
        <Tooltip.Content
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

  <!-- The three block kinds repeat the same inner markup. It is written out
       three times rather than through a snippet because the parts have to stay
       on one line: a newline between them renders as a space and pulls the
       sentence apart. -->
  <div class="chapter-body">
    {#each blocks as block, i (i)}
      {@const parts = splitSegment(block.text, hits.get(i) ?? [])}
      {#if block.kind === 'h2'}
        <h2 class="chapter-h2">{#each parts as part, p (p)}{#if part.term !== undefined && glossary[part.term]}<Tooltip.Trigger {tether} id={`b${i}-t${p}`} payload={glossary[part.term]} onclick={() => tether.open(`b${i}-t${p}`)}>{#snippet child({ props })}{@const { type, ...attrs } = props}<span {...attrs} role="button" class="term">{part.text}</span>{/snippet}</Tooltip.Trigger>{:else}{#each splitEmphasis(part.text) as run, r (r)}{#if run.em}<em>{run.text}</em>{:else}{run.text}{/if}{/each}{/if}{/each}</h2>
      {:else if block.kind === 'quote'}
        <blockquote><p>{#each parts as part, p (p)}{#if part.term !== undefined && glossary[part.term]}<Tooltip.Trigger {tether} id={`b${i}-t${p}`} payload={glossary[part.term]} onclick={() => tether.open(`b${i}-t${p}`)}>{#snippet child({ props })}{@const { type, ...attrs } = props}<span {...attrs} role="button" class="term">{part.text}</span>{/snippet}</Tooltip.Trigger>{:else}{#each splitEmphasis(part.text) as run, r (r)}{#if run.em}<em>{run.text}</em>{:else}{run.text}{/if}{/each}{/if}{/each}</p></blockquote>
      {:else}
        <p>{#each parts as part, p (p)}{#if part.term !== undefined && glossary[part.term]}<Tooltip.Trigger {tether} id={`b${i}-t${p}`} payload={glossary[part.term]} onclick={() => tether.open(`b${i}-t${p}`)}>{#snippet child({ props })}{@const { type, ...attrs } = props}<span {...attrs} role="button" class="term">{part.text}</span>{/snippet}</Tooltip.Trigger>{:else}{#each splitEmphasis(part.text) as run, r (r)}{#if run.em}<em>{run.text}</em>{:else}{run.text}{/if}{/each}{/if}{/each}</p>
      {/if}
    {/each}
  </div>
</Tooltip.Provider>

{#if glossary.length > 0}
  <section class="glossary" aria-labelledby="glossary-heading">
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
  .chapter-body :global(p) {
    margin: 0 0 1.15rem;
  }

  .chapter-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .chapter-h2 {
    margin: 2rem 0 0.9rem;
    font-size: 1.05rem;
    font-weight: 600;
  }

  .chapter-body :global(blockquote) {
    margin: 1.5rem 0;
    padding-left: 1rem;
    border-left: 2px solid var(--rule);
    color: var(--text-muted);
  }

  /* Quiet enough to read straight through, findable when looked for — the same
     mark a transcript uses. */
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
    .term {
      transition: none;
    }
  }

  @media (prefers-contrast: more) {
    .term {
      border-bottom-color: var(--fg);
    }

    .glossary h2,
    .glossary dt::after {
      color: var(--fg);
    }
  }
</style>

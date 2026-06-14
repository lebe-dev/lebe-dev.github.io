<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import InfoIcon from '@lucide/svelte/icons/info';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  let {
    label,
    text,
    showAcceptButton = false,
    acceptButtonText = '',
    showLeaveButton = false,
    leaveButtonText = '',
  }: {
    label: string;
    text: string;
    showAcceptButton?: boolean;
    acceptButtonText?: string;
    showLeaveButton?: boolean;
    leaveButtonText?: string;
  } = $props();

  const STORAGE_KEY = 'ai-usage-disclaimer-accepted';

  let open = $state(false);
  let dismissed = $state(false);

  onMount(() => {
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {}
  });

  function toggle() {
    open = !open;
  }

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    dismissed = true;
  }

  function leave() {
    window.close();
    window.location.href = 'about:blank';
  }
</script>

{#if !dismissed}
  <div class="ai-usage-disclaimer">
    <button type="button" class="ai-usage-disclaimer-summary" onclick={toggle} aria-expanded={open}>
      <InfoIcon class="icon" aria-hidden="true" />
      <span>{label}</span>
      <ChevronDownIcon class={open ? 'icon chevron open' : 'icon chevron'} aria-hidden="true" />
    </button>
    {#if open}
      <div class="ai-usage-disclaimer-content" transition:slide={{ duration: 200 }}>
        <p class="ai-usage-disclaimer-text">{text}</p>
        {#if showAcceptButton || showLeaveButton}
          <div class="ai-usage-disclaimer-actions">
            {#if showAcceptButton}
              <button type="button" class="ai-usage-disclaimer-accept" onclick={accept}>
                {acceptButtonText}
              </button>
            {/if}
            {#if showLeaveButton}
              <button type="button" class="ai-usage-disclaimer-leave" onclick={leave}>
                {leaveButtonText}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .ai-usage-disclaimer {
    margin: 1.25rem 0;
    border-left: 3px solid var(--accent-1);
    background: color-mix(in srgb, var(--accent-1) 12%, transparent);
    border-radius: 0 4px 4px 0;
    font-family: var(--sans);
    font-size: 0.9rem;
  }

  .ai-usage-disclaimer-summary {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-muted);
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    user-select: none;
  }

  .ai-usage-disclaimer :global(.icon) {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .ai-usage-disclaimer :global(.chevron) {
    margin-left: auto;
    transition: transform 0.2s ease;
  }

  .ai-usage-disclaimer :global(.chevron.open) {
    transform: rotate(180deg);
  }

  .ai-usage-disclaimer-content {
    padding: 0 1rem 0.85rem;
    color: var(--text-muted);
  }

  .ai-usage-disclaimer-text {
    margin: 0;
    white-space: pre-line;
  }

  .ai-usage-disclaimer-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  .ai-usage-disclaimer-accept,
  .ai-usage-disclaimer-leave {
    display: inline-flex;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--fg);
    border-radius: 4px;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--sans);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .ai-usage-disclaimer-accept:hover {
    background: #16a34a;
    border-color: #16a34a;
    color: #fff;
  }

  .ai-usage-disclaimer-leave:hover {
    background: var(--accent-2);
    border-color: var(--accent-2);
    color: #fff;
  }

  :global(:root.dark) .ai-usage-disclaimer {
    border-left-color: #c4b5fd;
    background: #291f43;
  }

  :global(:root.dark) .ai-usage-disclaimer-summary,
  :global(:root.dark) .ai-usage-disclaimer-content {
    color: #c3bcd9;
  }

  :global(:root.dark) .ai-usage-disclaimer-accept,
  :global(:root.dark) .ai-usage-disclaimer-leave {
    border-color: #202248;
    background: #3a2d5e;
    color: #c4b5fd;
  }

  :global(:root.dark) .ai-usage-disclaimer-accept:hover {
    background: #22c55e;
    border-color: #22c55e;
    color: #1a1a1a;
  }

  :global(:root.dark) .ai-usage-disclaimer-leave:hover {
    background: #f87171;
    border-color: #f87171;
    color: #1a1a1a;
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import CloudDownloadIcon from '@lucide/svelte/icons/cloud-download';
  import CloudCheckIcon from '@lucide/svelte/icons/cloud-check';
  import XIcon from '@lucide/svelte/icons/x';
  import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { formatBytes } from '../sw/shared.js';

  type Labels = {
    badge: string;
    badgeTitle: string;
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    remove: string;
    failed: string;
    updateAvailable: string;
    updateAction: string;
    updateDismiss: string;
  };

  let { lang, labels }: { lang: string; labels: Labels } = $props();

  // `null` until the worker answers — the button stays hidden so browsers
  // without service workers never show a control that cannot work.
  let known = $state(false);
  let complete = $state(false);
  let syncing = $state(false);
  let failed = $state(0);
  let savedBytes = $state(0);
  let totalBytes = $state(0);
  let saved = $state(0);
  let total = $state(0);
  let online = $state(true);
  let updateReady = $state(false);
  let updateDismissed = $state(false);

  let worker: ServiceWorker | null = null;
  let waitingWorker: ServiceWorker | null = null;
  let reloadOnControllerChange = false;

  const progress = $derived(
    totalBytes > 0 ? savedBytes / totalBytes : total > 0 ? saved / total : 0,
  );

  const sizeLabel = $derived(totalBytes > 0 ? formatBytes(totalBytes, lang) : '');

  const buttonLabel = $derived.by(() => {
    if (syncing) return `${labels.cancel} — ${Math.round(progress * 100)}%`;
    if (complete) return sizeLabel ? `${labels.saved} (${sizeLabel})` : labels.saved;
    return sizeLabel ? `${labels.save} (${sizeLabel})` : labels.save;
  });

  const send = (message: Record<string, unknown>) => worker?.postMessage({ ...message, lang });

  const onClick = () => {
    if (syncing) {
      send({ type: 'OFFLINE_CANCEL' });
      return;
    }
    if (complete) {
      send({ type: 'OFFLINE_PURGE' });
      return;
    }
    failed = 0;
    syncing = true;
    send({ type: 'OFFLINE_SAVE' });
  };

  const applyUpdate = () => {
    reloadOnControllerChange = true;
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.lang !== lang) return;

    if (data.type === 'OFFLINE_STATUS') {
      known = true;
      complete = data.complete;
      syncing = data.syncing;
      saved = data.saved;
      total = data.total;
      savedBytes = data.savedBytes;
      totalBytes = data.totalBytes;
      return;
    }

    if (data.type === 'OFFLINE_SYNC') {
      known = true;
      saved = data.saved;
      total = data.total;
      savedBytes = data.savedBytes;
      totalBytes = data.totalBytes;
      failed = data.failed;
      syncing = data.phase === 'start' || data.phase === 'progress';
    }
  };

  const watchUpdates = (registration: ServiceWorkerRegistration) => {
    if (registration.waiting) {
      waitingWorker = registration.waiting;
      updateReady = true;
    }
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        // A worker reaching `installed` while another one controls the page is
        // a new build waiting to take over — on a first visit there is no
        // controller and nothing to announce.
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = installing;
          updateReady = true;
        }
      });
    });
  };

  onMount(() => {
    online = navigator.onLine;
    const setOnline = () => (online = navigator.onLine);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOnline);

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('online', setOnline);
        window.removeEventListener('offline', setOnline);
      };
    }

    navigator.serviceWorker.addEventListener('message', onMessage);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Never on the first `clients.claim()` — only when the reader asked for
      // the new version, so the page is not yanked out from under them.
      if (!reloadOnControllerChange) return;
      reloadOnControllerChange = false;
      location.reload();
    });

    void navigator.serviceWorker.ready.then((registration) => {
      worker = registration.active;
      watchUpdates(registration);
      send({ type: 'OFFLINE_STATUS' });
      void registration.update().catch(() => {});
    });

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOnline);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  });
</script>

{#if !online}
  <span class="offline-badge" title={labels.badgeTitle}>
    <WifiOffIcon aria-hidden="true" />
    <span class="offline-badge-text">{labels.badge}</span>
  </span>
{/if}

{#if known}
  <span class="offline-button">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={buttonLabel}
      title={buttonLabel}
      onclick={onClick}
    >
      {#if syncing}
        <XIcon />
      {:else if complete}
        <CloudCheckIcon class="saved-icon" />
      {:else}
        <CloudDownloadIcon />
      {/if}
    </Button>
    {#if syncing}
      <svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle class="ring-track" cx="18" cy="18" r="16" />
        <circle
          class="ring-value"
          cx="18"
          cy="18"
          r="16"
          style="stroke-dasharray: 100.5; stroke-dashoffset: {100.5 * (1 - progress)}"
        />
      </svg>
    {/if}
  </span>

  <span class="visually-hidden" aria-live="polite">
    {#if syncing}
      {labels.saving} — {Math.round(progress * 100)}%
    {:else if failed > 0}
      {labels.failed}
    {:else if complete}
      {labels.saved}
    {/if}
  </span>
{/if}

{#if updateReady && !updateDismissed}
  <div class="update-banner" role="status">
    <span>{labels.updateAvailable}</span>
    <span class="update-actions">
      <Button type="button" variant="default" size="sm" onclick={applyUpdate}>
        <RefreshCwIcon />
        {labels.updateAction}
      </Button>
      <Button type="button" variant="ghost" size="sm" onclick={() => (updateDismissed = true)}>
        {labels.updateDismiss}
      </Button>
    </span>
  </div>
{/if}

<style>
  .offline-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0.45rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    color: var(--text-muted);
    font-family: var(--sans);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .offline-badge :global(svg) {
    width: 12px;
    height: 12px;
  }

  @media (max-width: 30rem) {
    .offline-badge-text {
      display: none;
    }
  }

  .offline-button {
    position: relative;
    display: inline-flex;
  }

  .offline-button :global(.saved-icon) {
    color: var(--link);
  }

  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    transform: rotate(-90deg);
  }

  .ring-track,
  .ring-value {
    fill: none;
    stroke-width: 2;
  }

  .ring-track {
    stroke: var(--rule);
  }

  .ring-value {
    stroke: var(--link);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.2s ease;
  }

  .update-banner {
    position: fixed;
    left: 1rem;
    bottom: 1.75rem;
    z-index: 950;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    max-width: min(28rem, calc(100vw - 2rem));
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--rule);
    border-radius: 0.6rem;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--sans);
    font-size: 0.85rem;
    box-shadow: 0 4px 18px rgb(0 0 0 / 0.14);
  }

  .update-actions {
    display: inline-flex;
    gap: 0.35rem;
    margin-left: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .ring-value {
      transition: none;
    }
  }
</style>

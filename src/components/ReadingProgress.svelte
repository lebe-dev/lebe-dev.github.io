<script lang="ts">
  import { onMount } from 'svelte';
  import {
    READ_THRESHOLD,
    formatPercent,
    getProgress,
    isRead,
    loadStore,
    saveStore,
    scrollOffsetFor,
    scrollRatio,
    setProgress,
    setRead,
    shouldResume,
    type Target,
  } from '$lib/readingProgress';

  let {
    progressId,
    readId,
    contentSelector = 'article',
    labels,
  }: {
    progressId: string;
    readId: string;
    /** The element whose height the progress is measured against. */
    contentSelector?: string;
    labels: {
      progress: string;
      markRead: string;
      markUnread: string;
      read: string;
      resume: string;
      resumeDismiss: string;
    };
  } = $props();

  /** The pill disappears on its own if it is not used. */
  const RESUME_TIMEOUT = 15_000;
  /** Don't offer to resume from where the reader already is. */
  const RESUME_MIN_GAP = 0.02;
  const SAVE_DEBOUNCE = 400;

  let ratio = $state(0);
  let read = $state(false);
  let ready = $state(false);
  /** Non-null while the resume pill is up: the stored position to jump back to. */
  let resumeTo = $state<number | null>(null);

  let content: HTMLElement | null = null;
  let target: Target = { progressId, readId };
  /** Nothing is written until the reader actually scrolls, so merely opening
      a page never overwrites the position saved on the previous visit. */
  let dirty = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;

  const geometry = () => {
    const rect = content?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      contentTop: rect ? rect.top + window.scrollY : 0,
      contentHeight: content?.offsetHeight ?? 0,
    };
  };

  const flush = (which: Target = target) => {
    if (!dirty) return;
    dirty = false;
    clearTimeout(saveTimer);
    saveStore(setProgress(loadStore(), which, ratio, Date.now()));
  };

  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flush(), SAVE_DEBOUNCE);
  };

  const measure = () => {
    frame = 0;
    ratio = scrollRatio(geometry());
    dirty = true;
    if (ratio >= READ_THRESHOLD && !read) {
      read = true;
      flush();
      return;
    }
    scheduleSave();
  };

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(measure);
  };

  const dismissResume = () => {
    resumeTo = null;
    clearTimeout(resumeTimer);
  };

  const resume = () => {
    const to = resumeTo;
    dismissResume();
    if (to === null || !content) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: scrollOffsetFor(to, geometry()), behavior: reduced ? 'auto' : 'smooth' });
  };

  const toggleRead = () => {
    read = !read;
    dirty = false;
    clearTimeout(saveTimer);
    dismissResume();
    saveStore(setRead(loadStore(), target, read, Date.now()));
    if (read) ratio = 1;
  };

  // A podcast transcript changes its progressId when the reader switches
  // language: persist what was read in the old one before adopting the new.
  $effect(() => {
    const next: Target = { progressId, readId };
    if (next.progressId === target.progressId && next.readId === target.readId) return;
    flush(target);
    target = next;
    if (!ready) return;
    const store = loadStore();
    read = isRead(store, target);
    ratio = scrollRatio(geometry());
  });

  onMount(() => {
    content = document.querySelector<HTMLElement>(contentSelector);
    const store = loadStore();
    const stored = getProgress(store, target);
    read = isRead(store, target);
    ratio = scrollRatio(geometry());
    ready = true;

    // A link to an anchor is an explicit destination — don't argue with it.
    const anchored = location.hash.length > 1;
    if (!anchored && shouldResume(stored, read) && stored - ratio > RESUME_MIN_GAP) {
      resumeTo = stored;
      resumeTimer = setTimeout(dismissResume, RESUME_TIMEOUT);
    }

    const onHide = () => flush();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);

    return () => {
      flush();
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(saveTimer);
      clearTimeout(resumeTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  });
</script>

<button
  type="button"
  class="read-toggle"
  class:is-read={read}
  aria-pressed={read}
  title={read ? labels.markUnread : labels.markRead}
  aria-label={read ? labels.markUnread : labels.markRead}
  onclick={toggleRead}
>
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5"></path>
  </svg>
  <span class="read-toggle__text">{labels.read}</span>
</button>

{#if ready}
  <div class="progress-rail" aria-hidden="true" title={labels.progress}>
    <div class="progress-rail__fill" style={`transform: scaleX(${ratio})`}></div>
  </div>
{/if}

{#if resumeTo !== null}
  <div class="resume" role="status">
    <button type="button" class="resume__action" onclick={resume}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14"></path>
        <path d="m19 12-7 7-7-7"></path>
      </svg>
      <span>{labels.resume}</span>
      <span class="resume__percent">{formatPercent(resumeTo)}</span>
    </button>
    <button
      type="button"
      class="resume__close"
      title={labels.resumeDismiss}
      aria-label={labels.resumeDismiss}
      onclick={dismissResume}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </button>
  </div>
{/if}

<style>
  .read-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.45rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font-family: var(--sans);
    font-size: 0.7rem;
    line-height: 1;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    cursor: pointer;
    opacity: 0.55;
    transition: opacity 0.15s ease, color 0.15s ease;
  }

  .read-toggle:hover {
    opacity: 1;
  }

  .read-toggle:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 2px;
  }

  .read-toggle.is-read {
    opacity: 1;
    color: #2e7d32;
  }

  :global(.dark) .read-toggle.is-read {
    color: #66bb6a;
  }

  .read-toggle svg {
    flex-shrink: 0;
  }

  /* Reading position, pinned to the very top of the viewport. */
  .progress-rail {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    z-index: 950;
    pointer-events: none;
  }

  .progress-rail__fill {
    height: 100%;
    background: var(--link);
    transform-origin: 0 50%;
    will-change: transform;
  }

  .resume {
    position: fixed;
    left: 50%;
    bottom: 1.75rem;
    z-index: 950;
    display: inline-flex;
    align-items: stretch;
    transform: translateX(-50%);
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--bg);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    animation: resume-in 0.2s ease;
    /* Clear of the back-to-top button on narrow screens. */
    max-width: calc(100vw - 2rem);
  }

  .resume__action,
  .resume__close {
    border: none;
    background: none;
    color: var(--fg);
    font-family: var(--sans);
    font-size: 0.8rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .resume__action {
    padding: 0.5rem 0.4rem 0.5rem 0.9rem;
    border-radius: 999px 0 0 999px;
    min-width: 0;
  }

  .resume__action span:not(.resume__percent) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .resume__action:hover {
    color: var(--link);
  }

  .resume__percent {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .resume__close {
    padding: 0.5rem 0.75rem;
    border-radius: 0 999px 999px 0;
    color: var(--text-muted);
  }

  .resume__close:hover {
    color: var(--fg);
  }

  .resume__action:focus-visible,
  .resume__close:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: -2px;
  }

  @keyframes resume-in {
    from {
      opacity: 0;
      transform: translate(-50%, 0.5rem);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .read-toggle,
    .resume {
      transition: none;
      animation: none;
    }
  }

  @media (prefers-contrast: more) {
    .read-toggle {
      opacity: 1;
    }
  }

  @media (max-width: 600px) {
    .resume {
      bottom: 1rem;
      left: 1rem;
      right: 4.75rem;
      transform: none;
      max-width: none;
      animation: none;
    }

    .resume__action {
      flex: 1;
    }
  }
</style>

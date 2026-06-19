<script lang="ts">
  import { load as loadYaml } from 'js-yaml';

  let value = $state('');

  const result = $derived.by(() => {
    if (value.trim() === '') return null;
    try {
      loadYaml(value);
      return { valid: true as const };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { valid: false as const, message };
    }
  });
</script>

<div class="yaml-validator">
  <label for="yaml-input" class="yaml-label">Paste your YAML</label>
  <textarea
    id="yaml-input"
    class="yaml-input mono"
    spellcheck="false"
    autocomplete="off"
    autocapitalize="off"
    placeholder={'key: value\nlist:\n  - one\n  - two'}
    bind:value
  ></textarea>

  <p
    class="yaml-status"
    class:yaml-status--valid={result?.valid === true}
    class:yaml-status--invalid={result?.valid === false}
    aria-live="polite"
  >
    {#if result === null}
      &nbsp;
    {:else if result.valid}
      ✓ Valid YAML
    {:else}
      ✗ Invalid YAML — {result.message}
    {/if}
  </p>
</div>

<style>
  .yaml-validator {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .yaml-label {
    font-family: var(--sans);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .yaml-input {
    width: 100%;
    min-height: 16rem;
    resize: vertical;
    font-size: 0.85rem;
    line-height: 1.5;
    background: var(--rule);
    color: var(--fg);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 0.9rem 1rem;
    tab-size: 2;
  }

  .yaml-input:focus {
    outline: 2px solid var(--link);
    outline-offset: 1px;
  }

  .yaml-status {
    font-family: var(--mono);
    font-size: 0.85rem;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .yaml-status--valid {
    color: #16a34a;
  }

  .yaml-status--invalid {
    color: var(--accent-2);
  }
</style>

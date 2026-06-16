<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import SunIcon from '@lucide/svelte/icons/sun';
  import MoonIcon from '@lucide/svelte/icons/moon';

  let { labelLight, labelDark }: { labelLight: string; labelDark: string } = $props();

  let isDark = $state(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  function toggle() {
    isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {}
  }
</script>

<Button
  type="button"
  variant="ghost"
  size="icon"
  aria-label={isDark ? labelLight : labelDark}
  onclick={toggle}
>
  {#if isDark}
    <SunIcon />
  {:else}
    <MoonIcon />
  {/if}
</Button>

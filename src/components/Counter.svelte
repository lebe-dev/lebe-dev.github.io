<script lang="ts">
  let { initial = 0 }: { initial?: number } = $props();
  let count = $state(initial);
</script>

<button type="button" onclick={() => count++}>
  Clicks: {count}
</button>

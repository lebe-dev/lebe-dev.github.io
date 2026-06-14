<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import { languages, type Lang } from '../i18n/ui';

  let { lang, label }: { lang: Lang; label: string } = $props();

  function onValueChange(value: string) {
    try {
      localStorage.setItem('lang', value);
    } catch {}
    window.location.href = `/${value}/`;
  }
</script>

<Select.Root type="single" value={lang} {onValueChange}>
  <Select.Trigger aria-label={label} size="sm">
    {languages[lang]}
  </Select.Trigger>
  <Select.Content>
    {#each Object.entries(languages) as [code, name]}
      <Select.Item value={code} label={name}>{name}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>

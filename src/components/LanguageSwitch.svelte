<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import { languages, type Lang } from '../i18n/ui';

  let { lang, label }: { lang: Lang; label: string } = $props();

  const orderedLanguages = $derived.by(() => {
    const entries = Object.entries(languages) as [Lang, string][];
    const secondary: Lang = lang === 'en' ? 'ru' : 'en';
    const priority = (code: Lang) => (code === lang ? 0 : code === secondary ? 1 : 2);
    return entries.sort(([a, nameA], [b, nameB]) => {
      const diff = priority(a) - priority(b);
      return diff !== 0 ? diff : nameA.localeCompare(nameB);
    });
  });

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
    {#each orderedLanguages as [code, name]}
      <Select.Item value={code} label={name}>{name}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>

<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import { languages, type Lang } from '../i18n/ui';

  type Translation = { code: Lang; url: string };

  let {
    lang,
    label,
    translations,
  }: { lang: Lang; label: string; translations: Translation[] } = $props();

  const urls: Record<string, string> = Object.fromEntries(
    translations.map((t) => [t.code, t.url]),
  );

  function onValueChange(value: string) {
    const url = urls[value];
    if (!url) return;
    try {
      localStorage.setItem('lang', value);
    } catch {}
    window.location.href = url;
  }
</script>

<Select.Root type="single" value={lang} {onValueChange}>
  <Select.Trigger aria-label={label} size="sm">
    {languages[lang]}
  </Select.Trigger>
  <Select.Content>
    {#each translations as t}
      <Select.Item value={t.code} label={languages[t.code]}>{languages[t.code]}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>

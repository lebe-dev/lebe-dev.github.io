<script lang="ts">
  /**
   * The "⋮" menu in the header: copy this browser's state out as one line of
   * text, paste it in on another device. All the logic lives in
   * `src/lib/settingsTransfer.ts`; this component is only the dialog around it.
   */
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Dialog from '$lib/components/ui/dialog';
  import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import {
    decodeSnapshot,
    encodeSnapshot,
    mergeSnapshots,
    readLocalSnapshot,
    writeSnapshot,
  } from '../lib/settingsTransfer';

  type Labels = {
    menu: string;
    exportTitle: string;
    importTitle: string;
    exportBody: string;
    copy: string;
    copied: string;
    importBody: string;
    importPlaceholder: string;
    importAction: string;
    importInvalid: string;
    importDone: string;
    importFailed: string;
    reload: string;
    close: string;
  };

  let { labels }: { labels: Labels } = $props();

  let exportOpen = $state(false);
  let importOpen = $state(false);

  let exportText = $state('');
  let copied = $state(false);
  let exportArea: HTMLTextAreaElement | null = $state(null);

  let importText = $state('');
  let imported = $state<number | null>(null);
  let importError = $state('');

  async function openExport() {
    copied = false;
    exportText = '';
    exportOpen = true;
    exportText = await encodeSnapshot(readLocalSnapshot());
  }

  function openImport() {
    importText = '';
    imported = null;
    importError = '';
    importOpen = true;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportText);
      copied = true;
      return;
    } catch {
      // No clipboard permission (or no clipboard at all) — select the text so
      // the reader can copy it themselves.
      exportArea?.focus();
      exportArea?.select();
    }
  }

  async function runImport() {
    imported = null;
    importError = '';

    const incoming = await decodeSnapshot(importText);
    if (!incoming) {
      importError = labels.importInvalid;
      return;
    }

    const merged = mergeSnapshots(readLocalSnapshot(), incoming);
    // Keys are written one by one, so a full quota can cost the reading store
    // and still leave the settings in. Only a write that landed nothing at all
    // is a failed import.
    const write = writeSnapshot(merged.data);
    if (write.written.length === 0 && write.failed.length > 0) {
      importError = labels.importFailed;
      return;
    }

    imported = merged.entriesMerged;
  }

  // The theme, the language and the reading marks are all read on load, so a
  // reload is the honest way to show what was just imported.
  const reload = () => location.reload();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} type="button" variant="ghost" size="icon" aria-label={labels.menu}>
        <EllipsisVerticalIcon />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={openExport}>
      <DownloadIcon />
      {labels.exportTitle}
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={openImport}>
      <UploadIcon />
      {labels.importTitle}
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root bind:open={exportOpen}>
  <Dialog.Content closeLabel={labels.close}>
    <Dialog.Header>
      <Dialog.Title>{labels.exportTitle}</Dialog.Title>
      <Dialog.Description>{labels.exportBody}</Dialog.Description>
    </Dialog.Header>
    <Textarea
      bind:ref={exportArea}
      class="max-h-40 font-mono text-xs break-all"
      readonly
      rows={5}
      value={exportText}
      onfocus={(event) => event.currentTarget.select()}
    />
    <Dialog.Footer>
      <Button type="button" variant="default" disabled={!exportText} onclick={copy}>
        {copied ? labels.copied : labels.copy}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={importOpen}>
  <Dialog.Content closeLabel={labels.close}>
    <Dialog.Header>
      <Dialog.Title>{labels.importTitle}</Dialog.Title>
      <Dialog.Description>{labels.importBody}</Dialog.Description>
    </Dialog.Header>
    {#if imported === null}
      <Textarea
        bind:value={importText}
        class="max-h-40 font-mono text-xs break-all"
        rows={5}
        placeholder={labels.importPlaceholder}
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
      />
      {#if importError}
        <p class="text-destructive text-sm" role="alert">{importError}</p>
      {/if}
      <Dialog.Footer>
        <Button type="button" variant="default" disabled={!importText.trim()} onclick={runImport}>
          {labels.importAction}
        </Button>
      </Dialog.Footer>
    {:else}
      <p role="status">{labels.importDone.replace('{n}', String(imported))}</p>
      <Dialog.Footer>
        <Button type="button" variant="default" onclick={reload}>{labels.reload}</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

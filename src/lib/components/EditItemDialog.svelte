<script lang="ts">
  // Dialog for editing an item's text using shadcn-svelte

  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';
  import type { Item } from '$lib/types';

  interface Props {
    item: Item | null;
    listName?: string;
    isOpen: boolean;
    onSave?: (itemId: number, newText: string) => Promise<void>;
    onClose?: () => void;
  }

  let {
    item,
    listName = '',
    isOpen,
    onSave,
    onClose
  }: Props = $props();

  // Local state for editing
  let editText = $state('');
  let isSaving = $state(false);

  // Update editText when item changes
  $effect(() => {
    if (item) {
      editText = item.text;
    }
  });

  // Handle save
  async function handleSave() {
    if (item && editText.trim() && !isSaving) {
      try {
        isSaving = true;
        await onSave?.(item.id, editText.trim());
        onClose?.();
      } catch (err) {
        console.error('Failed to save item:', err);
      } finally {
        isSaving = false;
      }
    }
  }

  // Handle cancel
  function handleCancel() {
    if (!isSaving) {
      onClose?.();
    }
  }

  // Handle dialog open change - called when dialog closes via ESC or overlay click
  function handleOpenChange(open: boolean) {
    if (!open && !isSaving) {
      // Dialog is closing, call onClose immediately
      onClose?.();
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !isSaving) {
      event.preventDefault();
      handleSave();
    }
  }
</script>

{#if item}
  <Dialog open={isOpen} onOpenChange={handleOpenChange}>
    <DialogContent class="max-w-lg" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle class="text-xl font-semibold">Edit Item</DialogTitle>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          {#if listName}
            <p class="mb-4 text-muted-foreground leading-relaxed">
              You are editing item in <strong class="font-semibold text-foreground">{listName}</strong> list
            </p>
          {/if}
          <Label for="item-text">Item text</Label>
          <Input
            id="item-text"
            type="text"
            bind:value={editText}
            onkeydown={handleKeyDown}
            placeholder="Item text"
            autofocus
          />
        </div>
      </div>

      <DialogFooter class="gap-3">
        <Button variant="outline" onclick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onclick={handleSave}
          disabled={!editText.trim() || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}

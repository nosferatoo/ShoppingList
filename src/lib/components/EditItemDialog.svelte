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
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import type { Item, List } from '$lib/types';

  interface Props {
    item: Item | null;
    listName?: string;
    isOpen: boolean;
    onSave?: (itemId: number, newText: string) => Promise<void>;
    onClose?: () => void;
    // Move functionality props
    listId?: number;
    currentListType?: 'shopping' | 'todo';
    currentListIsFood?: boolean;
    availableLists?: List[];
    onMove?: (itemId: number, newListId: number) => Promise<void>;
  }

  let {
    item,
    listName = '',
    isOpen,
    onSave,
    onClose,
    // Move functionality props
    listId,
    currentListType,
    currentListIsFood,
    availableLists = [],
    onMove
  }: Props = $props();

  // Local state for editing
  let editText = $state('');
  let isSaving = $state(false);

  // Move functionality state
  let showMoveOptions = $state(false);
  let selectedListId = $state<string>('');
  let isMoving = $state(false);

  // Filtered lists for move functionality
  let filteredLists = $derived(() => {
    if (!availableLists || !listId) return [];
    return availableLists.filter(list => {
      if (list.id === listId) return false;  // Exclude current list
      if (list.type !== currentListType) return false;  // Same type only
      if (currentListIsFood && !list.is_food) return false;  // Food to food only
      return true;
    });
  });

  // Update editText when item changes and reset move state
  $effect(() => {
    if (item) {
      editText = item.text;
      showMoveOptions = false;
      selectedListId = '';
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
    if (!isSaving && !isMoving) {
      onClose?.();
    }
  }

  // Handle dialog open change - called when dialog closes via ESC or overlay click
  function handleOpenChange(open: boolean) {
    if (!open && !isSaving && !isMoving) {
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

  // Handle move item
  async function handleMove() {
    if (!selectedListId || !item || !onMove) return;

    isMoving = true;
    try {
      await onMove(item.id, parseInt(selectedListId));
      // Dialog will be closed by parent
    } catch (error) {
      console.error('Failed to move item:', error);
    } finally {
      isMoving = false;
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

        <!-- Move item functionality -->
        {#if filteredLists().length > 0 && onMove}
          {#if !showMoveOptions}
            <Button
              variant="outline"
              class="w-full"
              onclick={() => showMoveOptions = true}
            >
              Move to different list
            </Button>
          {:else}
            <div class="space-y-3 p-3 border rounded-lg bg-muted/50">
              <Label>Select destination list:</Label>
              <RadioGroup bind:value={selectedListId}>
                {#each filteredLists() as list}
                  <div class="flex items-center gap-2">
                    <RadioGroupItem value={String(list.id)} id={`list-${list.id}`} />
                    <Label for={`list-${list.id}`} class="font-normal cursor-pointer">
                      {list.title}
                    </Label>
                  </div>
                {/each}
              </RadioGroup>
              <Button
                variant="secondary"
                class="w-full"
                disabled={!selectedListId || isMoving}
                onclick={handleMove}
              >
                {isMoving ? 'Moving...' : 'Move Item'}
              </Button>
            </div>
          {/if}
        {/if}
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

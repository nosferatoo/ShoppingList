<script lang="ts">
  // Full-screen list management modal using shadcn Dialog
  // Full-screen on mobile, modal on desktop

  import { GripVertical, ShoppingCart, CheckCircle, Trash2, Plus, Pencil } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Badge } from '$lib/components/ui/badge';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';
  import type { ListWithItems, List, ListType } from '$lib/types';
  import { db } from '$lib/db/local';

  // Props
  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    supabase: import('@supabase/supabase-js').SupabaseClient;
    userId: string;
    initialLists: ListWithItems[];
    onListsUpdated?: (lists: ListWithItems[]) => void;
  }

  let { isOpen = false, onClose, supabase, userId, initialLists, onListsUpdated }: Props = $props();

  // State
  let lists = $state<ListWithItems[]>(initialLists);
  let draggedIndex = $state<number | null>(null);
  let orderChanged = $state(false);
  let isAddModalOpen = $state(false);
  let isRenameModalOpen = $state(false);
  let isDeleteModalOpen = $state(false);
  let selectedList = $state<List | null>(null);
  let listToDelete = $state<List | null>(null);
  let newListTitle = $state('');
  let newListType = $state<ListType>('shopping');
  let newListIsShared = $state(false);
  let renameTitle = $state('');
  let renameType = $state<ListType>('shopping');
  let renameIsShared = $state(false);
  let isSaving = $state(false);
  let errorMessage = $state('');

  // Update local lists when initialLists change
  $effect(() => {
    lists = initialLists;
  });

  // Helper function to check if current user is the owner of a list
  function isOwner(list: List): boolean {
    return list.owner_id === userId;
  }

  // Handle dialog open change
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose?.();
    }
  }

  // ============================================================================
  // DRAG AND DROP
  // ============================================================================

  function handleDragStart(event: DragEvent, index: number) {
    draggedIndex = index;
    orderChanged = false;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
    (event.target as HTMLElement).classList.add('opacity-50');
  }

  async function handleDragEnd(event: DragEvent) {
    (event.target as HTMLElement).classList.remove('opacity-50');

    if (orderChanged) {
      await saveListOrder();
    }

    draggedIndex = null;
    orderChanged = false;
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newLists = [...lists];
    const draggedItem = newLists[draggedIndex];
    newLists.splice(draggedIndex, 1);
    newLists.splice(index, 0, draggedItem);

    lists = newLists;
    draggedIndex = index;
    orderChanged = true;
  }

  async function saveListOrder() {
    try {
      const positions = lists.map((list, index) => ({
        list_id: list.list.id,
        position: index
      }));

      const { error } = await supabase.rpc('save_list_positions', {
        p_positions: positions
      });

      if (error) {
        console.error('Error saving list order:', error);
        throw error;
      }

      for (const pos of positions) {
        const existing = await db.userListSettings
          .where('[user_id+list_id]')
          .equals([userId, pos.list_id])
          .first();

        if (existing) {
          await db.userListSettings.put({
            ...existing,
            position: pos.position,
            updated_at: new Date().toISOString()
          });
        } else {
          await db.userListSettings.put({
            id: 0,
            user_id: userId,
            list_id: pos.list_id,
            position: pos.position,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      onListsUpdated?.(lists);
    } catch (err) {
      console.error('Failed to save list order:', err);
    }
  }

  // ============================================================================
  // ADD LIST
  // ============================================================================

  function openAddModal() {
    newListTitle = '';
    newListType = 'shopping';
    newListIsShared = false;
    errorMessage = '';
    isAddModalOpen = true;
  }

  function closeAddModal() {
    isAddModalOpen = false;
    newListTitle = '';
  }

  async function handleAddList(event: Event) {
    event.preventDefault();

    const title = newListTitle.trim();
    if (!title) return;

    const duplicateExists = lists.some(
      list => list.list.title.toLowerCase() === title.toLowerCase()
    );

    if (duplicateExists) {
      errorMessage = 'A list with this name already exists';
      return;
    }

    errorMessage = '';
    isSaving = true;

    try {
      const { data: newList, error } = await supabase
        .from('lists')
        .insert({
          title,
          type: newListType,
          owner_id: userId,
          is_shared: newListIsShared
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating list:', error);
        throw error;
      }

      lists = [
        ...lists,
        {
          list: newList,
          position: lists.length,
          items: []
        }
      ];

      await saveListOrder();
      onListsUpdated?.(lists);
      closeAddModal();
    } catch (err) {
      console.error('Failed to add list:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // RENAME LIST
  // ============================================================================

  function openRenameModal(list: List) {
    selectedList = list;
    renameTitle = list.title;
    renameType = list.type;
    renameIsShared = list.is_shared;
    isRenameModalOpen = true;
  }

  function closeRenameModal() {
    isRenameModalOpen = false;
    selectedList = null;
    renameTitle = '';
    renameType = 'shopping';
    renameIsShared = false;
  }

  async function handleRenameList(event: Event) {
    event.preventDefault();

    if (!selectedList) return;

    const title = renameTitle.trim();
    if (!title) return;

    isSaving = true;

    try {
      const { error } = await supabase
        .from('lists')
        .update({
          title,
          type: renameType,
          is_shared: renameIsShared,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedList.id);

      if (error) {
        console.error('Error updating list:', error);
        throw error;
      }

      lists = lists.map(item => {
        if (item.list.id === selectedList.id) {
          return {
            ...item,
            list: {
              ...item.list,
              title,
              type: renameType,
              is_shared: renameIsShared
            }
          };
        }
        return item;
      });

      onListsUpdated?.(lists);
      closeRenameModal();
    } catch (err) {
      console.error('Failed to rename list:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // DELETE LIST
  // ============================================================================

  function openDeleteModal(list: List) {
    listToDelete = list;
    isDeleteModalOpen = true;
  }

  function closeDeleteModal() {
    isDeleteModalOpen = false;
    listToDelete = null;
  }

  async function confirmDeleteList() {
    if (!listToDelete) return;

    isSaving = true;

    try {
      const { error } = await supabase
        .from('lists')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', listToDelete.id);

      if (error) {
        console.error('Error deleting list:', error);
        throw error;
      }

      lists = lists.filter(item => item.list.id !== listToDelete.id);
      await saveListOrder();
      onListsUpdated?.(lists);
      closeDeleteModal();
    } catch (err) {
      console.error('Failed to delete list:', err);
    } finally {
      isSaving = false;
    }
  }
</script>

<!-- Main Edit Lists Dialog -->
<Dialog open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent
    class="flex h-auto max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col p-0 sm:max-w-[600px]"
    showCloseButton={false}
  >
    <!-- Header -->
    <DialogHeader class="flex-shrink-0 px-4 py-4 lg:px-6 lg:py-6">
      <DialogTitle class="text-xl font-semibold">Edit Lists</DialogTitle>
    </DialogHeader>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 lg:px-5 lg:py-5">
      <div class="flex flex-col gap-4">
        <!-- Lists -->
        {#if lists.length > 0}
          <ul class="flex flex-col gap-2 lg:gap-3" role="list">
            {#each lists as listData, index (listData.list.id)}
              <li
                class="group flex min-h-[52px] cursor-move items-center gap-2 rounded-md border border-border bg-muted p-2 px-3 transition-colors hover:border-input hover:bg-accent lg:min-h-[56px] lg:gap-3 lg:rounded-lg lg:p-3 lg:px-4"
                draggable="true"
                ondragstart={(e) => handleDragStart(e, index)}
                ondragend={handleDragEnd}
                ondragover={(e) => handleDragOver(e, index)}
                role="listitem"
              >
                <!-- Drag handle -->
                <div class="flex cursor-grab flex-shrink-0 items-center justify-center text-muted-foreground active:cursor-grabbing">
                  <GripVertical size={20} />
                </div>

                <!-- List content -->
                <div class="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
                  <!-- Icon -->
                  {#if listData.list.type === 'shopping'}
                    <ShoppingCart size={20} class="flex-shrink-0 text-muted-foreground" />
                  {:else}
                    <CheckCircle size={20} class="flex-shrink-0 text-muted-foreground" />
                  {/if}

                  <!-- Title and badge container -->
                  <div class="flex min-w-0 flex-1 flex-col items-start gap-1 pl-0.5">
                    <!-- Title -->
                    <span class="overflow-hidden text-ellipsis whitespace-nowrap font-medium">{listData.list.title}</span>

                    <!-- Badge (below title on mobile) -->
                    {#if listData.list.is_shared && !isOwner(listData.list)}
                      <Badge variant="secondary" class="w-fit text-xs lg:hidden">Shared with you</Badge>
                    {:else if listData.list.is_shared}
                      <Badge variant="secondary" class="w-fit text-xs lg:hidden">Shared</Badge>
                    {/if}
                  </div>

                  <!-- Badges (inline on desktop) -->
                  {#if listData.list.is_shared && !isOwner(listData.list)}
                    <Badge variant="secondary" class="hidden flex-shrink-0 lg:inline-flex">Shared with you</Badge>
                  {:else if listData.list.is_shared}
                    <Badge variant="secondary" class="hidden flex-shrink-0 lg:inline-flex">Shared</Badge>
                  {/if}
                </div>

                <!-- Edit button (only for owners) -->
                {#if isOwner(listData.list)}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="action-button-edit flex-shrink-0 bg-transparent text-blue-500 hover:bg-transparent hover:text-blue-600 lg:bg-muted lg:text-muted-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:hover:bg-accent lg:hover:text-blue-500"
                    onclick={() => openRenameModal(listData.list)}
                    aria-label="Edit {listData.list.title}"
                  >
                    <Pencil size={18} />
                  </Button>

                  <!-- Delete button (only for owners) -->
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="action-button-delete flex-shrink-0 bg-transparent text-destructive hover:bg-transparent hover:text-destructive/80 lg:bg-muted lg:text-muted-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:hover:bg-accent lg:hover:text-destructive"
                    onclick={() => openDeleteModal(listData.list)}
                    aria-label="Delete {listData.list.title}"
                  >
                    <Trash2 size={18} />
                  </Button>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <div class="flex items-center justify-center p-8">
            <p class="text-muted-foreground">No lists yet</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <DialogFooter class="flex-shrink-0 flex-row items-center justify-between px-3 py-3 lg:px-5 lg:py-5">
      <Button
        variant="outline"
        size="sm"
        class="gap-2"
        onclick={openAddModal}
      >
        <Plus size={18} />
        <span>Add new list</span>
      </Button>
      <Button variant="outline" onclick={onClose}>
        Cancel
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Add List Modal -->
<Dialog open={isAddModalOpen} onOpenChange={(open) => !open && closeAddModal()}>
  <DialogContent class="max-w-md" showCloseButton={false}>
    <DialogHeader class="pb-4">
      <DialogTitle class="text-xl font-semibold">Add New List</DialogTitle>
    </DialogHeader>

    <form onsubmit={handleAddList} class="flex flex-col gap-5">
      <!-- Title input -->
      <div class="flex flex-col gap-2">
        <Label for="list-title">List Name</Label>
        <Input
          id="list-title"
          type="text"
          class={errorMessage ? 'border-destructive' : ''}
          placeholder="e.g., Groceries"
          bind:value={newListTitle}
          oninput={() => (errorMessage = '')}
          disabled={isSaving}
          autofocus
        />
        {#if errorMessage}
          <span class="text-sm font-medium text-destructive">{errorMessage}</span>
        {/if}
      </div>

      <!-- Type selection -->
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">List Type</span>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted p-3 transition-colors hover:border-input hover:bg-accent">
            <Checkbox
              checked={newListType === 'shopping'}
              onCheckedChange={(checked) => {
                if (checked) newListType = 'shopping';
              }}
              disabled={isSaving}
            />
            <ShoppingCart size={18} class="flex-shrink-0 text-muted-foreground" />
            <span class="flex-1 text-sm font-medium">Shopping</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted p-3 transition-colors hover:border-input hover:bg-accent">
            <Checkbox
              checked={newListType === 'todo'}
              onCheckedChange={(checked) => {
                if (checked) newListType = 'todo';
              }}
              disabled={isSaving}
            />
            <CheckCircle size={18} class="flex-shrink-0 text-muted-foreground" />
            <span class="flex-1 text-sm font-medium">To-Do</span>
          </label>
        </div>
      </div>

      <!-- Shared toggle -->
      <div class="flex flex-col gap-2">
        <label class="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted p-4 transition-colors hover:border-input hover:bg-accent">
          <Checkbox
            class="mt-0.5"
            bind:checked={newListIsShared}
            disabled={isSaving}
          />
          <span class="flex flex-1 flex-col gap-1">
            <span class="font-medium">Shared List</span>
            <span class="text-sm text-muted-foreground">Allow other users to access this list</span>
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={closeAddModal}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!newListTitle.trim() || isSaving}
        >
          {isSaving ? 'Creating...' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<!-- Rename List Modal -->
{#if selectedList}
  <Dialog open={isRenameModalOpen} onOpenChange={(open) => !open && closeRenameModal()}>
    <DialogContent class="max-w-md" showCloseButton={false}>
      <DialogHeader class="pb-4">
        <DialogTitle class="text-xl font-semibold">Edit List</DialogTitle>
      </DialogHeader>

      <form onsubmit={handleRenameList} class="flex flex-col gap-5">
        <!-- Title input -->
        <div class="flex flex-col gap-2">
          <Label for="rename-title">List Name</Label>
          <Input
            id="rename-title"
            type="text"
            bind:value={renameTitle}
            disabled={isSaving}
            autofocus
          />
        </div>

        <!-- Type selection -->
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">List Type</span>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted p-3 transition-colors hover:border-input hover:bg-accent">
              <Checkbox
                checked={renameType === 'shopping'}
                onCheckedChange={(checked) => {
                  if (checked) renameType = 'shopping';
                }}
                disabled={isSaving}
              />
              <ShoppingCart size={18} class="flex-shrink-0 text-muted-foreground" />
              <span class="flex-1 text-sm font-medium">Shopping</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted p-3 transition-colors hover:border-input hover:bg-accent">
              <Checkbox
                checked={renameType === 'todo'}
                onCheckedChange={(checked) => {
                  if (checked) renameType = 'todo';
                }}
                disabled={isSaving}
              />
              <CheckCircle size={18} class="flex-shrink-0 text-muted-foreground" />
              <span class="flex-1 text-sm font-medium">To-Do</span>
            </label>
          </div>
        </div>

        <!-- Shared toggle -->
        <div class="flex flex-col gap-2">
          <label class="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted p-4 transition-colors hover:border-input hover:bg-accent">
            <Checkbox
              class="mt-0.5"
              bind:checked={renameIsShared}
              disabled={isSaving}
            />
            <span class="flex flex-1 flex-col gap-1">
              <span class="font-medium">Shared List</span>
              <span class="text-sm text-muted-foreground">Allow other users to access this list</span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onclick={closeRenameModal}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!renameTitle.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
{/if}

<!-- Delete Confirmation Modal -->
{#if listToDelete}
  <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && closeDeleteModal()}>
    <DialogContent class="max-w-md" showCloseButton={false}>
      <DialogHeader class="pb-4">
        <DialogTitle class="text-xl font-semibold">Delete List?</DialogTitle>
      </DialogHeader>

      <p class="text-muted-foreground leading-relaxed">
        Are you sure you want to delete <strong class="font-semibold text-foreground">"{listToDelete.title}"</strong>?
        This will also delete all items in this list. This action cannot be undone.
      </p>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={closeDeleteModal}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onclick={confirmDeleteList}
          disabled={isSaving}
        >
          {isSaving ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}

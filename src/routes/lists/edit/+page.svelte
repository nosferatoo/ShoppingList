<script lang="ts">
  import { goto } from '$app/navigation';
  import { ArrowLeft, GripVertical, ShoppingCart, CheckCircle, Trash2, Plus, Pencil } from 'lucide-svelte';
  import type { ListWithItems, List, ListType } from '$lib/types';

  // Props
  interface Props {
    data: {
      supabase: import('@supabase/supabase-js').SupabaseClient;
      userId: string;
      lists: ListWithItems[];
    };
  }

  let { data }: Props = $props();

  // State
  let lists = $state<ListWithItems[]>(data.lists);
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

  // Handle back navigation
  function handleBack() {
    goto('/');
  }

  // ============================================================================
  // DRAG AND DROP
  // ============================================================================

  function handleDragStart(event: DragEvent, index: number) {
    draggedIndex = index;
    orderChanged = false;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', ''); // Required for Firefox
    }
    // Add dragging class to element
    (event.target as HTMLElement).classList.add('dragging');
  }

  async function handleDragEnd(event: DragEvent) {
    (event.target as HTMLElement).classList.remove('dragging');

    // Save order if it changed
    if (orderChanged) {
      await saveListOrder();
    }

    draggedIndex = null;
    orderChanged = false;
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder the list
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
      // Prepare positions data
      const positions = lists.map((list, index) => ({
        list_id: list.list.id,
        position: index
      }));

      // Call Supabase function to save positions
      const { error } = await data.supabase.rpc('save_list_positions', {
        p_positions: positions
      });

      if (error) {
        console.error('Error saving list order:', error);
        throw error;
      }
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

    // Check for duplicate list name (case-insensitive)
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
      // Create new list
      const { data: newList, error } = await data.supabase
        .from('lists')
        .insert({
          title,
          type: newListType,
          owner_id: data.userId,
          is_shared: newListIsShared
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating list:', error);
        throw error;
      }

      // Add to local state
      lists = [
        ...lists,
        {
          list: newList,
          position: lists.length,
          items: []
        }
      ];

      // Save the new position
      await saveListOrder();

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
      // Update list title, type, and shared status
      const { error } = await data.supabase
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

      // Update local state
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
      // Soft delete the list
      const { error } = await data.supabase
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

      // Remove from local state
      lists = lists.filter(item => item.list.id !== listToDelete.id);

      // Update positions
      await saveListOrder();

      closeDeleteModal();
    } catch (err) {
      console.error('Failed to delete list:', err);
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head>
  <title>Edit Lists</title>
</svelte:head>

<div class="page-container">
  <!-- Header -->
  <header class="header">
    <button
      type="button"
      class="back-button"
      onclick={handleBack}
      aria-label="Go back"
    >
      <ArrowLeft size={24} />
    </button>
    <h1 class="header-title">Edit Lists</h1>
  </header>

  <!-- Main content -->
  <main class="main-content">
    <!-- Lists -->
    {#if lists.length > 0}
      <ul class="lists-container" role="list">
        {#each lists as listData, index (listData.list.id)}
          <li
            class="list-item"
            draggable="true"
            ondragstart={(e) => handleDragStart(e, index)}
            ondragend={handleDragEnd}
            ondragover={(e) => handleDragOver(e, index)}
            role="listitem"
          >
            <!-- Drag handle -->
            <div class="drag-handle" aria-label="Drag to reorder">
              <GripVertical size={20} />
            </div>

            <!-- List content (clickable to rename) -->
            <button
              type="button"
              class="list-content"
              onclick={() => openRenameModal(listData.list)}
            >
              <!-- Icon -->
              {#if listData.list.type === 'shopping'}
                <ShoppingCart size={20} class="list-icon" />
              {:else}
                <CheckCircle size={20} class="list-icon" />
              {/if}

              <!-- Title -->
              <span class="list-title">{listData.list.title}</span>

              <!-- Shared badge -->
              {#if listData.list.is_shared}
                <span class="shared-badge">Shared</span>
              {/if}
            </button>

            <!-- Edit button (desktop only) -->
            <button
              type="button"
              class="edit-button"
              onclick={() => openRenameModal(listData.list)}
              aria-label="Edit {listData.list.title}"
            >
              <Pencil size={18} />
            </button>

            <!-- Delete button -->
            <button
              type="button"
              class="delete-button"
              onclick={() => openDeleteModal(listData.list)}
              aria-label="Delete {listData.list.title}"
            >
              <Trash2 size={18} />
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="empty-state">
        <p class="empty-text">No lists yet</p>
      </div>
    {/if}

    <!-- Add button -->
    <button
      type="button"
      class="add-button"
      onclick={openAddModal}
    >
      <Plus size={24} />
      <span>Add new list</span>
    </button>
  </main>
</div>

<!-- Add List Modal -->
{#if isAddModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeAddModal} role="presentation">
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="add-modal-title"
      tabindex="-1"
    >
      <h2 id="add-modal-title" class="modal-title">Add New List</h2>

      <form onsubmit={handleAddList} class="modal-form">
        <!-- Title input -->
        <div class="form-group">
          <label for="list-title" class="form-label">List Name</label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="list-title"
            type="text"
            class="form-input"
            class:error={errorMessage}
            placeholder="e.g., Groceries"
            bind:value={newListTitle}
            oninput={() => (errorMessage = '')}
            disabled={isSaving}
            autofocus
          />
          {#if errorMessage}
            <span class="error-message">{errorMessage}</span>
          {/if}
        </div>

        <!-- Type selection -->
        <div class="form-group">
          <span class="form-label">List Type</span>
          <div class="type-options" role="group" aria-label="List Type">
            <button
              type="button"
              class="type-option"
              class:active={newListType === 'shopping'}
              onclick={() => (newListType = 'shopping')}
              disabled={isSaving}
            >
              <ShoppingCart size={20} />
              <span>Shopping</span>
            </button>
            <button
              type="button"
              class="type-option"
              class:active={newListType === 'todo'}
              onclick={() => (newListType = 'todo')}
              disabled={isSaving}
            >
              <CheckCircle size={20} />
              <span>To-Do</span>
            </button>
          </div>
        </div>

        <!-- Shared toggle -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              class="checkbox-input"
              bind:checked={newListIsShared}
              disabled={isSaving}
            />
            <span class="checkbox-text">
              <span class="checkbox-title">Shared List</span>
              <span class="checkbox-subtitle">Allow other users to access this list</span>
            </span>
          </label>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button
            type="button"
            class="modal-button secondary"
            onclick={closeAddModal}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="modal-button primary"
            disabled={!newListTitle.trim() || isSaving}
          >
            {isSaving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if isDeleteModalOpen && listToDelete}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeDeleteModal} role="presentation">
    <div
      class="modal delete-modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="delete-modal-title"
      tabindex="-1"
    >
      <h2 id="delete-modal-title" class="modal-title">Delete List?</h2>

      <p class="delete-message">
        Are you sure you want to delete <strong>"{listToDelete.title}"</strong>?
        This will also delete all items in this list. This action cannot be undone.
      </p>

      <div class="modal-actions">
        <button
          type="button"
          class="modal-button secondary"
          onclick={closeDeleteModal}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          class="modal-button danger"
          onclick={confirmDeleteList}
          disabled={isSaving}
        >
          {isSaving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Rename List Modal -->
{#if isRenameModalOpen && selectedList}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeRenameModal} role="presentation">
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="rename-modal-title"
      tabindex="-1"
    >
      <h2 id="rename-modal-title" class="modal-title">Edit List</h2>

      <form onsubmit={handleRenameList} class="modal-form">
        <!-- Title input -->
        <div class="form-group">
          <label for="rename-title" class="form-label">List Name</label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="rename-title"
            type="text"
            class="form-input"
            bind:value={renameTitle}
            disabled={isSaving}
            autofocus
          />
        </div>

        <!-- Type selection -->
        <div class="form-group">
          <span class="form-label">List Type</span>
          <div class="type-options" role="group" aria-label="List Type">
            <button
              type="button"
              class="type-option"
              class:active={renameType === 'shopping'}
              onclick={() => (renameType = 'shopping')}
              disabled={isSaving}
            >
              <ShoppingCart size={20} />
              <span>Shopping</span>
            </button>
            <button
              type="button"
              class="type-option"
              class:active={renameType === 'todo'}
              onclick={() => (renameType = 'todo')}
              disabled={isSaving}
            >
              <CheckCircle size={20} />
              <span>To-Do</span>
            </button>
          </div>
        </div>

        <!-- Shared toggle -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              class="checkbox-input"
              bind:checked={renameIsShared}
              disabled={isSaving}
            />
            <span class="checkbox-text">
              <span class="checkbox-title">Shared List</span>
              <span class="checkbox-subtitle">Allow other users to access this list</span>
            </span>
          </label>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button
            type="button"
            class="modal-button secondary"
            onclick={closeRenameModal}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="modal-button primary"
            disabled={!renameTitle.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .page-container {
    /* Layout */
    min-height: 100vh;
    display: flex;
    flex-direction: column;

    /* Background */
    background-color: var(--bg-primary);
  }

  /* ============================================================================
     HEADER
     ============================================================================ */

  .header {
    /* Position */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;

    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-4);

    /* Size */
    height: 56px;

    /* Background */
    background-color: var(--bg-secondary);

    /* Border */
    border-bottom: 1px solid var(--border-subtle);

    /* Spacing */
    padding: 0 var(--space-4);
  }

  @media (min-width: 1024px) {
    .header {
      height: 64px;
    }
  }

  .back-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 44px;
    height: 44px;

    /* Style */
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--text-primary);

    /* Transition */
    transition: background-color var(--transition-fast);
  }

  .back-button:hover {
    background-color: var(--bg-hover);
  }

  .back-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .header-title {
    /* Typography */
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    font-family: var(--font-heading);

    /* Reset */
    margin: 0;
  }

  /* ============================================================================
     MAIN CONTENT
     ============================================================================ */

  .main-content {
    /* Layout */
    flex: 1;
    display: flex;
    flex-direction: column;

    /* Spacing - account for fixed header */
    margin-top: 56px;
    padding: var(--space-4);
    gap: var(--space-4);

    /* Size */
    max-width: 600px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }

  @media (min-width: 1024px) {
    .main-content {
      margin-top: 64px;
      padding: var(--space-6);
    }
  }

  /* ============================================================================
     LISTS CONTAINER
     ============================================================================ */

  .lists-container {
    /* Layout */
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    /* Reset */
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .list-item {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);

    /* Size */
    min-height: 56px;

    /* Style */
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);

    /* Spacing */
    padding: var(--space-3) var(--space-4);

    /* Transition */
    transition: background-color var(--transition-fast), border-color var(--transition-fast);

    /* Cursor */
    cursor: move;
  }

  .list-item:hover {
    background-color: var(--bg-hover);
  }

  /* Class is applied via JavaScript in handleDragStart() */
  /* svelte-ignore css-unused-selector */
  .list-item.dragging {
    opacity: 0.5;
    border-color: var(--accent-primary);
  }

  .drag-handle {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Color */
    color: var(--text-muted);

    /* Cursor */
    cursor: grab;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .list-content {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;

    /* Style */
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;

    /* Spacing */
    padding: 0;
  }

  @media (min-width: 1024px) {
    .list-content {
      pointer-events: none;
      cursor: default;
    }
  }

  /* Class is applied to Lucide icon components */
  /* svelte-ignore css-unused-selector */
  .list-icon {
    /* Layout */
    flex-shrink: 0;

    /* Color */
    color: var(--text-secondary);
  }

  .list-title {
    /* Typography */
    font-size: var(--text-base);
    color: var(--text-primary);
    font-weight: var(--font-medium);

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .shared-badge {
    /* Layout */
    flex-shrink: 0;

    /* Typography */
    font-size: var(--text-xs);
    color: var(--text-secondary);

    /* Style */
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
  }

  .edit-button {
    /* Layout - hidden on mobile, visible on desktop */
    display: none;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 40px;
    height: 40px;

    /* Style */
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: #6b9bd1;

    /* Transition */
    transition: color var(--transition-fast),
                background-color var(--transition-fast),
                opacity var(--transition-fast);
  }

  @media (min-width: 1024px) {
    .edit-button {
      display: flex;
      opacity: 0;
      pointer-events: none;
    }

    .list-item:hover .edit-button {
      opacity: 1;
      pointer-events: auto;
    }
  }

  .edit-button:hover {
    color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.1);
  }

  .edit-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .delete-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 40px;
    height: 40px;

    /* Style */
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: #e89090;

    /* Transition */
    transition: color var(--transition-fast),
                background-color var(--transition-fast),
                opacity var(--transition-fast);
  }

  @media (min-width: 1024px) {
    .delete-button {
      opacity: 0;
      pointer-events: none;
    }

    .list-item:hover .delete-button {
      opacity: 1;
      pointer-events: auto;
    }
  }

  .delete-button:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }

  .delete-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* ============================================================================
     ADD BUTTON
     ============================================================================ */

  .add-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);

    /* Size */
    width: 100%;
    min-height: 56px;

    /* Style */
    background: none;
    border: 2px dashed var(--border-default);
    border-radius: var(--radius-lg);
    cursor: pointer;

    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--text-secondary);

    /* Spacing */
    padding: var(--space-4);

    /* Transition */
    transition: border-color var(--transition-fast), color var(--transition-fast);
  }

  .add-button:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }

  .add-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* ============================================================================
     EMPTY STATE
     ============================================================================ */

  .empty-state {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Spacing */
    padding: var(--space-8);
  }

  .empty-text {
    /* Typography */
    color: var(--text-muted);
    font-size: var(--text-base);

    /* Reset */
    margin: 0;
  }

  /* ============================================================================
     MODAL
     ============================================================================ */

  .modal-overlay {
    /* Position */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Background */
    background-color: rgba(0, 0, 0, 0.7);

    /* Blur effect */
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    /* Spacing */
    padding: var(--space-4);

    /* Animation */
    animation: fade-in var(--transition-fast);
  }

  .modal {
    /* Size */
    width: 100%;
    max-width: 400px;

    /* Style */
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);

    /* Spacing */
    padding: var(--space-6);

    /* Animation */
    animation: fade-in var(--transition-normal);
  }

  .modal-title {
    /* Typography */
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    font-family: var(--font-heading);

    /* Spacing */
    margin: 0 0 var(--space-6) 0;
  }

  .modal-form {
    /* Layout */
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .form-group {
    /* Layout */
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-label {
    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-primary);

    /* Reset */
    margin: 0;
  }

  .form-input {
    /* Size */
    height: 44px;

    /* Style */
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-primary);

    /* Typography */
    font-size: var(--text-base);
    font-family: var(--font-body);

    /* Spacing */
    padding: 0 var(--space-3);

    /* Transition */
    transition: border-color var(--transition-fast);
  }

  .form-input::placeholder {
    color: var(--text-muted);
  }

  .form-input:focus {
    border-color: var(--border-focus);
    outline: none;
  }

  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-input.error {
    border-color: var(--error);
  }

  .error-message {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--error);
    font-weight: var(--font-medium);

    /* Animation */
    animation: fade-in var(--transition-fast);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Type options */
  .type-options {
    /* Layout */
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .type-option {
    /* Layout */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);

    /* Size */
    min-height: 80px;

    /* Style */
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-secondary);

    /* Transition */
    transition: border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast);
  }

  .type-option:hover:not(:disabled) {
    border-color: var(--accent-primary);
    background-color: var(--bg-hover);
  }

  .type-option.active {
    border-color: var(--accent-primary);
    background-color: rgba(249, 115, 22, 0.1);
    color: var(--accent-primary);
  }

  .type-option:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .type-option:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* Modal actions */
  .modal-actions {
    /* Layout */
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;

    /* Spacing */
    margin-top: var(--space-2);
  }

  .modal-button {
    /* Size */
    min-width: 100px;
    height: 44px;

    /* Style */
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    font-family: var(--font-body);

    /* Transition */
    transition: background-color var(--transition-fast), opacity var(--transition-fast);

    /* Spacing */
    padding: 0 var(--space-4);
  }

  .modal-button.primary {
    background-color: var(--accent-primary);
    color: var(--text-inverse);
  }

  .modal-button.primary:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  .modal-button.primary:active:not(:disabled) {
    background-color: var(--accent-muted);
  }

  .modal-button.secondary {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .modal-button.secondary:hover:not(:disabled) {
    background-color: var(--bg-hover);
  }

  .modal-button.danger {
    background-color: var(--error);
    color: var(--text-inverse);
  }

  .modal-button.danger:hover:not(:disabled) {
    background-color: #dc2626;
  }

  .modal-button.danger:active:not(:disabled) {
    background-color: #b91c1c;
  }

  .modal-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* Delete modal specific styles */
  .delete-modal {
    max-width: 480px;
  }

  .delete-message {
    /* Typography */
    font-size: var(--text-base);
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);

    /* Spacing */
    margin: 0 0 var(--space-6) 0;
  }

  .delete-message strong {
    color: var(--text-primary);
    font-weight: var(--font-semibold);
  }

  /* ============================================================================
     CHECKBOX
     ============================================================================ */

  .checkbox-label {
    /* Layout */
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    cursor: pointer;

    /* Style */
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);

    /* Spacing */
    padding: var(--space-4);

    /* Transition */
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
  }

  .checkbox-label:hover {
    background-color: var(--bg-hover);
    border-color: var(--border-default);
  }

  .checkbox-input {
    /* Size */
    width: 20px;
    height: 20px;
    min-width: 20px;
    margin-top: 2px;

    /* Style */
    cursor: pointer;
    accent-color: var(--accent-primary);
  }

  .checkbox-input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .checkbox-text {
    /* Layout */
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
  }

  .checkbox-title {
    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--text-primary);
  }

  .checkbox-subtitle {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
    line-height: var(--leading-normal);
  }
</style>

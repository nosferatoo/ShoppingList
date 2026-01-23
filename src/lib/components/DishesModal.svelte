<script lang="ts">
  // Dishes management modal with 3-column layout
  // Desktop-only feature for meal planning

  import { Plus, Trash2, X, UtensilsCrossed, CookingPot, ListPlus, ArrowRight, ArrowLeft, Pencil, Youtube, ExternalLink, Search } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';
  import type {
    Dish,
    DishIngredient,
    DishWithIngredients,
    Item,
    ListWithItems,
    OrphanedIngredient
  } from '$lib/types';
  import { isFoodList, isActiveItem } from '$lib/types';

  // Props
  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    supabase: import('@supabase/supabase-js').SupabaseClient;
    userId: string;
    lists: ListWithItems[];
  }

  let { isOpen = false, onClose, supabase, userId, lists }: Props = $props();

  // State
  let dishes = $state<DishWithIngredients[]>([]);
  let selectedDish = $state<Dish | null>(null);
  let selectedDishIngredients = $state<Array<{ ingredient: DishIngredient; item: Item | null }>>([]);
  let isDeleteDishModalOpen = $state(false);
  let dishToDelete = $state<Dish | null>(null);
  let isEditDishModalOpen = $state(false);
  let dishToEdit = $state<Dish | null>(null);
  let editDishName = $state('');
  let editDishLink = $state('');
  let isAddItemModalOpen = $state(false);
  let newItemName = $state('');
  let selectedListId = $state<number | null>(null);
  let newDishName = $state('');
  let ingredientsSearch = $state('');
  let availableItemsSearch = $state('');
  let isSaving = $state(false);
  let isLoading = $state(false);
  let inputElement: HTMLInputElement | null = $state(null);
  let searchItemsInputElement: HTMLInputElement | null = $state(null);
  let orphanedIngredients = $state<OrphanedIngredient[]>([]);
  let loadingOrphaned = $state(false);
  let showOrphanedDialog = $state(false);
  let assigningIngredient = $state<OrphanedIngredient | null>(null);
  let selectedAssignListId = $state<number | null>(null);
  let isAssigning = $state(false);
  let searchingOrphan = $state<OrphanedIngredient | null>(null);
  let alternativeResults = $state<Item[]>([]);
  let alternativeSearchText = $state('');
  let isLinkingAlternative = $state(false);

  // Derived state - filtered dishes based on input
  let filteredDishes = $derived.by(() => {
    const searchText = newDishName.trim().toLowerCase();

    // If no search text, return all dishes
    if (!searchText) {
      return dishes;
    }

    // Filter dishes that start with the search text (case-insensitive)
    return dishes.filter(d =>
      d.dish.name.toLowerCase().startsWith(searchText)
    );
  });

  // Derived state - all items from food lists
  let availableItems = $derived.by(() => {
    const items: Item[] = [];
    for (const listData of lists) {
      if (isFoodList(listData.list)) {
        for (const item of listData.items) {
          if (isActiveItem(item)) {
            items.push(item);
          }
        }
      }
    }
    // Sort alphabetically
    return items.sort((a, b) => a.text.localeCompare(b.text));
  });

  // Derived state - filtered ingredients based on search
  let filteredIngredients = $derived.by(() => {
    const searchText = ingredientsSearch.trim().toLowerCase();
    if (!searchText) return selectedDishIngredients;
    return selectedDishIngredients.filter(({ ingredient, item }) => {
      const text = item?.text || ingredient.item_text;
      return text.toLowerCase().includes(searchText);
    });
  });

  // Derived state - filtered available items based on search
  let filteredAvailableItems = $derived.by(() => {
    const searchText = availableItemsSearch.trim().toLowerCase();
    if (!searchText) return availableItems;
    return availableItems.filter(item =>
      item.text.toLowerCase().includes(searchText)
    );
  });

  // Derived state - highlighted ingredients based on available items search
  let highlightedIngredientIds = $derived.by(() => {
    const searchText = availableItemsSearch.trim().toLowerCase();
    if (!searchText) return new Set<number>();

    const matchingIds = new Set<number>();
    for (const { ingredient, item } of selectedDishIngredients) {
      const text = item?.text || ingredient.item_text;
      if (text.toLowerCase() === searchText) {
        matchingIds.add(ingredient.id);
      }
    }
    return matchingIds;
  });

  // Derived state - items already in current dish
  let ingredientItemIds = $derived.by(() => {
    return new Set(
      selectedDishIngredients
        .map(ing => ing.ingredient.item_id)
        .filter((id): id is number => id !== null)
    );
  });

  // Derived state - counts for headers
  let dishesCount = $derived(filteredDishes.length);
  let ingredientsCount = $derived(filteredIngredients.length);
  let availableItemsCount = $derived(filteredAvailableItems.length);

  // Derived state - food lists
  let foodLists = $derived.by(() => {
    return lists
      .filter(listData => isFoodList(listData.list))
      .map(listData => listData.list);
  });

  // Load dishes and orphaned ingredients on open
  $effect(() => {
    if (isOpen) {
      loadDishes();
      loadOrphanedIngredients();
    }
  });

  // Scroll to first highlighted ingredient when search changes
  $effect(() => {
    if (highlightedIngredientIds.size > 0 && availableItemsSearch.trim()) {
      const firstMatchId = Array.from(highlightedIngredientIds)[0];
      const element = document.querySelector(`[data-ingredient-id="${firstMatchId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  // Handle dialog open change
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose?.();
    }
  }

  // Helper to detect YouTube links
  function isYouTubeLink(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // ============================================================================
  // LOAD DISHES
  // ============================================================================

  async function loadDishes() {
    isLoading = true;
    try {
      const { data, error } = await supabase.rpc('get_dishes_with_ingredients');

      if (error) {
        console.error('Error loading dishes:', error);
        throw error;
      }

      dishes = data || [];

      // Select first dish by default
      if (dishes.length > 0 && !selectedDish) {
        selectDish(dishes[0].dish);
      }
    } catch (err) {
      console.error('Failed to load dishes:', err);
    } finally {
      isLoading = false;
    }
  }

  async function loadOrphanedIngredients() {
    loadingOrphaned = true;
    try {
      const { data, error } = await supabase.rpc('get_orphaned_ingredients');
      if (error) throw error;
      orphanedIngredients = data || [];
    } catch (error) {
      console.error('Failed to load orphaned ingredients:', error);
      orphanedIngredients = [];
    } finally {
      loadingOrphaned = false;
    }
  }

  // ============================================================================
  // DISH SELECTION
  // ============================================================================

  function selectDish(dish: Dish) {
    selectedDish = dish;
    const dishData = dishes.find(d => d.dish.id === dish.id);
    selectedDishIngredients = dishData?.ingredients || [];
  }

  // ============================================================================
  // ADD DISH
  // ============================================================================

  async function handleAddDish(event: Event) {
    event.preventDefault();

    const name = newDishName.trim();
    if (!name) return;

    // Check for duplicate name before attempting insert
    const duplicateExists = dishes.some(
      d => d.dish.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateExists) {
      // Silent handling - just clear the input and refocus
      newDishName = '';
      setTimeout(() => {
        inputElement?.focus();
      }, 0);
      return;
    }

    isSaving = true;

    try {
      const { data: newDish, error } = await supabase
        .from('dishes')
        .insert({
          name,
          link: null,
          owner_id: userId
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      const newDishWithIngredients: DishWithIngredients = {
        dish: newDish,
        ingredients: []
      };
      dishes = [...dishes, newDishWithIngredients].sort((a, b) =>
        a.dish.name.localeCompare(b.dish.name)
      );

      // Select the new dish
      selectDish(newDish);

      // Clear input
      newDishName = '';

      // Auto-focus for continued input
      setTimeout(() => {
        inputElement?.focus();
      }, 0);
    } catch (error: any) {
      // Log unexpected errors
      console.error('Failed to add dish:', error);
      // Clear input and refocus
      newDishName = '';
      setTimeout(() => {
        inputElement?.focus();
      }, 0);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // DELETE DISH
  // ============================================================================

  function openDeleteDishModal(dish: Dish) {
    dishToDelete = dish;
    isDeleteDishModalOpen = true;
  }

  function closeDeleteDishModal() {
    isDeleteDishModalOpen = false;
    dishToDelete = null;
  }

  async function confirmDeleteDish() {
    if (!dishToDelete) return;

    isSaving = true;

    try {
      const { error } = await supabase
        .from('dishes')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dishToDelete.id);

      if (error) {
        console.error('Error deleting dish:', error);
        throw error;
      }

      // Remove from local state
      dishes = dishes.filter(d => d.dish.id !== dishToDelete!.id);

      // Clear selection if deleted dish was selected
      if (selectedDish?.id === dishToDelete.id) {
        selectedDish = null;
        selectedDishIngredients = [];

        // Select first dish if available
        if (dishes.length > 0) {
          selectDish(dishes[0].dish);
        }
      }

      closeDeleteDishModal();
    } catch (err) {
      console.error('Failed to delete dish:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // EDIT DISH
  // ============================================================================

  function openEditDishModal(dish: Dish) {
    dishToEdit = dish;
    editDishName = dish.name;
    editDishLink = dish.link || '';
    isEditDishModalOpen = true;
  }

  function closeEditDishModal() {
    isEditDishModalOpen = false;
    dishToEdit = null;
    editDishName = '';
    editDishLink = '';
  }

  async function confirmEditDish() {
    if (!dishToEdit || !editDishName.trim()) return;

    const trimmedName = editDishName.trim();
    const trimmedLink = editDishLink.trim() || null;

    // Check for duplicate name before attempting update (excluding current dish)
    const duplicateExists = dishes.some(
      d => d.dish.id !== dishToEdit!.id && d.dish.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      // Silent handling - just close the modal
      closeEditDishModal();
      return;
    }

    isSaving = true;

    try {
      const { error } = await supabase
        .from('dishes')
        .update({
          name: trimmedName,
          link: trimmedLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', dishToEdit.id);

      if (error) {
        console.error('Error updating dish:', error);
        throw error;
      }

      // Update local state
      dishes = dishes.map(d => {
        if (d.dish.id === dishToEdit!.id) {
          return {
            ...d,
            dish: { ...d.dish, name: trimmedName, link: trimmedLink }
          };
        }
        return d;
      }).sort((a, b) => a.dish.name.localeCompare(b.dish.name));

      // Update selected dish if it was the one being edited
      if (selectedDish?.id === dishToEdit.id) {
        selectedDish = { ...selectedDish, name: trimmedName, link: trimmedLink };
      }

      closeEditDishModal();
    } catch (err) {
      console.error('Failed to update dish:', err);
      closeEditDishModal();
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // ADD INGREDIENT
  // ============================================================================

  async function handleAddIngredient(item: Item) {
    if (!selectedDish) return;

    // Check if already added
    if (ingredientItemIds.has(item.id)) return;

    isSaving = true;

    try {
      const { data: newIngredient, error } = await supabase
        .from('dish_ingredients')
        .insert({
          dish_id: selectedDish.id,
          item_id: item.id,
          item_text: item.text
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding ingredient:', error);
        throw error;
      }

      // Update local state
      selectedDishIngredients = [
        ...selectedDishIngredients,
        { ingredient: newIngredient, item }
      ].sort((a, b) => a.item!.text.localeCompare(b.item!.text));

      // Update dishes array
      dishes = dishes.map(d => {
        if (d.dish.id === selectedDish!.id) {
          return {
            ...d,
            ingredients: selectedDishIngredients
          };
        }
        return d;
      });
    } catch (err) {
      console.error('Failed to add ingredient:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // REMOVE INGREDIENT
  // ============================================================================

  async function handleRemoveIngredient(ingredientId: number) {
    if (!selectedDish) return;

    isSaving = true;

    try {
      const { error } = await supabase
        .from('dish_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) {
        console.error('Error removing ingredient:', error);
        throw error;
      }

      // Update local state
      selectedDishIngredients = selectedDishIngredients.filter(
        ing => ing.ingredient.id !== ingredientId
      );

      // Update dishes array
      dishes = dishes.map(d => {
        if (d.dish.id === selectedDish!.id) {
          return {
            ...d,
            ingredients: selectedDishIngredients
          };
        }
        return d;
      });
    } catch (err) {
      console.error('Failed to remove ingredient:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // ADD ITEM TO SHOPPING LIST
  // ============================================================================

  function openAddItemModal() {
    const searchText = availableItemsSearch.trim();
    if (!searchText || foodLists.length === 0) return;

    newItemName = searchText;
    selectedListId = foodLists[0]?.id || null;
    isAddItemModalOpen = true;
  }

  function closeAddItemModal() {
    isAddItemModalOpen = false;
    newItemName = '';
    selectedListId = null;
  }

  async function confirmAddItem() {
    if (!newItemName.trim() || !selectedListId || !selectedDish) return;

    isSaving = true;

    try {
      // Add item to shopping list in checked state
      const { data: newItem, error: itemError } = await supabase
        .from('items')
        .insert({
          list_id: selectedListId,
          text: newItemName.trim(),
          is_checked: true
        })
        .select()
        .single();

      if (itemError) {
        console.error('Error adding item:', itemError);
        throw itemError;
      }

      // Add item to the ingredients list of the selected dish
      const { data: newIngredient, error: ingredientError } = await supabase
        .from('dish_ingredients')
        .insert({
          dish_id: selectedDish.id,
          item_id: newItem.id,
          item_text: newItem.text
        })
        .select()
        .single();

      if (ingredientError) {
        console.error('Error adding ingredient:', ingredientError);
        throw ingredientError;
      }

      // Update local state - add to ingredients list
      selectedDishIngredients = [
        ...selectedDishIngredients,
        { ingredient: newIngredient, item: newItem }
      ].sort((a, b) => a.item!.text.localeCompare(b.item!.text));

      // Update dishes array
      dishes = dishes.map(d => {
        if (d.dish.id === selectedDish!.id) {
          return {
            ...d,
            ingredients: selectedDishIngredients
          };
        }
        return d;
      });

      // Clear search input and close modal
      availableItemsSearch = '';
      closeAddItemModal();

      // Refocus search input
      setTimeout(() => {
        searchItemsInputElement?.focus();
      }, 0);
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // ASSIGN ORPHANED INGREDIENT
  // ============================================================================

  async function handleAssign() {
    if (!assigningIngredient || !selectedAssignListId) return;

    isAssigning = true;
    try {
      // 1. Create new item in selected list (checked by default)
      const { data: newItem, error: itemError } = await supabase
        .from('items')
        .insert({
          list_id: selectedAssignListId,
          text: assigningIngredient.ingredient.item_text,
          is_checked: true,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // 2. Update dish_ingredient to point to new item
      const { error: updateError } = await supabase
        .from('dish_ingredients')
        .update({ item_id: newItem.id })
        .eq('id', assigningIngredient.ingredient.id);

      if (updateError) throw updateError;

      // 3. Remove from orphaned list
      orphanedIngredients = orphanedIngredients.filter(
        o => o.ingredient.id !== assigningIngredient!.ingredient.id
      );

      // 4. Close dialogs
      assigningIngredient = null;
      selectedAssignListId = null;

    } catch (error) {
      console.error('Failed to assign ingredient:', error);
    } finally {
      isAssigning = false;
    }
  }

  // Delete orphaned ingredient from dish
  async function handleDeleteOrphanedIngredient(orphan: OrphanedIngredient) {
    try {
      const { error } = await supabase
        .from('dish_ingredients')
        .delete()
        .eq('id', orphan.ingredient.id);

      if (error) throw error;

      // Remove from orphanedIngredients list
      orphanedIngredients = orphanedIngredients.filter(
        o => o.ingredient.id !== orphan.ingredient.id
      );

      // Update dishes array - remove ingredient from the dish
      dishes = dishes.map(d => {
        if (d.dish.id === orphan.dish.id) {
          return {
            ...d,
            ingredients: d.ingredients.filter(
              ing => ing.ingredient.id !== orphan.ingredient.id
            )
          };
        }
        return d;
      });

      // Update selectedDishIngredients if this dish is currently selected
      if (selectedDish?.id === orphan.dish.id) {
        selectedDishIngredients = selectedDishIngredients.filter(
          ing => ing.ingredient.id !== orphan.ingredient.id
        );
      }
    } catch (error) {
      console.error('Failed to delete orphaned ingredient:', error);
    }
  }

  // Show dish containing orphaned ingredient
  function handleShowDish(orphan: OrphanedIngredient) {
    // Close orphaned dialog
    showOrphanedDialog = false;

    // Find and select the dish
    const dishData = dishes.find(d => d.dish.id === orphan.dish.id);
    if (dishData) {
      selectDish(dishData.dish);

      // Wait for DOM update, then scroll dish and ingredient into view
      setTimeout(() => {
        // Scroll dish into view
        const dishElement = document.querySelector(`[data-dish-id="${orphan.dish.id}"]`);
        if (dishElement) {
          dishElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Scroll orphaned ingredient into view
        const ingredientElement = document.querySelector(`[data-ingredient-id="${orphan.ingredient.id}"]`);
        if (ingredientElement) {
          ingredientElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // Add temporary highlight
          ingredientElement.classList.add('highlighted');
          setTimeout(() => {
            ingredientElement.classList.remove('highlighted');
          }, 2000);
        }
      }, 100);
    }
  }

  // ============================================================================
  // SEARCH ALTERNATIVES FOR ORPHANED INGREDIENT
  // ============================================================================

  function handleSearchAlternatives(orphan: OrphanedIngredient) {
    searchingOrphan = orphan;
    alternativeSearchText = orphan.ingredient.item_text;
    performAlternativeSearch(orphan, orphan.ingredient.item_text);
  }

  function performAlternativeSearch(orphan: OrphanedIngredient, searchTerm: string) {
    const searchText = searchTerm.trim().toLowerCase();

    if (!searchText) {
      alternativeResults = [];
      return;
    }

    // Get existing item IDs for this dish to avoid duplicates (unique constraint)
    const dishData = dishes.find(d => d.dish.id === orphan.dish.id);
    const existingItemIds = new Set(
      dishData?.ingredients
        .map(ing => ing.ingredient.item_id)
        .filter((id): id is number => id !== null) || []
    );

    // Search available items for partial case-insensitive matches
    const matches = availableItems.filter(item => {
      // Skip items already in this dish
      if (existingItemIds.has(item.id)) return false;
      // Partial match on item text
      return item.text.toLowerCase().includes(searchText) ||
             searchText.includes(item.text.toLowerCase());
    });

    alternativeResults = matches;
  }

  function handleRetrySearch() {
    if (searchingOrphan) {
      performAlternativeSearch(searchingOrphan, alternativeSearchText);
    }
  }

  async function handleLinkAlternative(item: Item) {
    if (!searchingOrphan) return;

    isLinkingAlternative = true;
    try {
      // Update dish_ingredient to point to existing item
      const { error } = await supabase
        .from('dish_ingredients')
        .update({
          item_id: item.id,
          item_text: item.text
        })
        .eq('id', searchingOrphan.ingredient.id);

      if (error) throw error;

      // Remove from orphaned list
      orphanedIngredients = orphanedIngredients.filter(
        o => o.ingredient.id !== searchingOrphan!.ingredient.id
      );

      // Update dishes array - update the ingredient in the dish
      dishes = dishes.map(d => {
        if (d.dish.id === searchingOrphan!.dish.id) {
          return {
            ...d,
            ingredients: d.ingredients.map(ing => {
              if (ing.ingredient.id === searchingOrphan!.ingredient.id) {
                return {
                  ingredient: { ...ing.ingredient, item_id: item.id, item_text: item.text },
                  item: item
                };
              }
              return ing;
            })
          };
        }
        return d;
      });

      // Update selectedDishIngredients if this dish is currently selected
      if (selectedDish?.id === searchingOrphan.dish.id) {
        selectedDishIngredients = selectedDishIngredients.map(ing => {
          if (ing.ingredient.id === searchingOrphan!.ingredient.id) {
            return {
              ingredient: { ...ing.ingredient, item_id: item.id, item_text: item.text },
              item: item
            };
          }
          return ing;
        });
      }

      // Close dialog
      searchingOrphan = null;
      alternativeResults = [];
    } catch (error) {
      console.error('Failed to link alternative:', error);
    } finally {
      isLinkingAlternative = false;
    }
  }
</script>

<!-- Main Dishes Dialog -->
<Dialog open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent
    class="flex h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col p-0 sm:max-w-[1600px]"
    showCloseButton={false}
  >
    <!-- Header -->
    <DialogHeader class="flex-shrink-0 px-4 py-4 lg:px-6 lg:py-6">
      <DialogTitle class="text-xl font-semibold">Dishes</DialogTitle>
    </DialogHeader>

    <!-- Content -->
    <div class="flex-1 overflow-hidden px-3 pb-0 pt-0 lg:px-5">
      {#if isLoading}
        <div class="flex items-center justify-center p-8">
          <p class="text-muted-foreground">Loading dishes...</p>
        </div>
      {:else}
        <div class="grid h-full grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-3">
          <!-- Column 1: Your Dishes -->
          <Card class="dish-card">
            <CardHeader class="card-header">
              <div class="header-left">
                <UtensilsCrossed size={20} class="list-icon" />
                <div class="header-title-section">
                  <CardTitle class="list-title">Your Dishes</CardTitle>
                  {#if dishesCount > 0}
                    <span class="item-count">{dishesCount} {dishesCount === 1 ? 'dish' : 'dishes'}</span>
                  {/if}
                </div>
              </div>
            </CardHeader>

            <CardContent class="card-content">
              <!-- Add dish form -->
              <form onsubmit={handleAddDish} class="add-item-form">
                <div class="add-dish-inputs">
                  <Input
                    type="text"
                    class="add-dish-name-input"
                    placeholder="Add dish..."
                    bind:value={newDishName}
                    bind:ref={inputElement}
                    disabled={isSaving}
                    aria-label="Add new dish"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    class="add-dish-button"
                    disabled={isSaving || !newDishName.trim()}
                    aria-label="Add dish"
                  >
                    <Plus size={20} />
                  </Button>
                </div>
              </form>

              <!-- Dishes list -->
              <div class="items-container">
              {#if filteredDishes.length > 0}
                {#each filteredDishes as dishData (dishData.dish.id)}
                  <div
                    class="item-wrapper {selectedDish?.id === dishData.dish.id ? 'selected' : ''}"
                    data-dish-id={dishData.dish.id}
                    onclick={() => selectDish(dishData.dish)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectDish(dishData.dish); }}
                    role="button"
                    tabindex="0"
                  >
                    <div class="item-content">
                      <!-- Dish name container - ensures text truncates and buttons always visible -->
                      <div class="dish-name-container">
                        {#if dishData.dish.link}
                          <button
                            class="dish-link"
                            onclick={(e) => {
                              e.stopPropagation();
                              window.open(dishData.dish.link!, '_blank');
                            }}
                            aria-label="Open recipe for {dishData.dish.name}"
                          >
                            <span class="dish-link-text">{dishData.dish.name}</span>
                            {#if isYouTubeLink(dishData.dish.link)}
                              <Youtube size={14} class="inline-icon" />
                            {:else}
                              <ExternalLink size={14} class="inline-icon" />
                            {/if}
                          </button>
                        {:else}
                          <span class="dish-name">
                            {dishData.dish.name}
                          </span>
                        {/if}
                      </div>

                      <!-- Edit and Delete buttons -->
                      <div class="actions-desktop">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          class="action-button-edit"
                          onclick={(e) => {
                            e.stopPropagation();
                            openEditDishModal(dishData.dish);
                          }}
                          aria-label="Edit {dishData.dish.name}"
                        >
                          <Pencil size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          class="action-button-delete"
                          onclick={(e) => {
                            e.stopPropagation();
                            openDeleteDishModal(dishData.dish);
                          }}
                          aria-label="Delete {dishData.dish.name}"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                {/each}
              {:else if dishes.length === 0}
                <div class="empty-state">
                  <p class="empty-text">No dishes yet</p>
                </div>
              {:else}
                <div class="empty-state">
                  <p class="empty-text">No matching dishes</p>
                </div>
              {/if}
              </div>
            </CardContent>
          </Card>

          <!-- Column 2: Ingredients -->
          <Card class="dish-card">
            <CardHeader class="card-header">
              <div class="header-left">
                <CookingPot size={20} class="list-icon" />
                <div class="header-title-section">
                  <CardTitle class="list-title">Ingredients</CardTitle>
                  {#if selectedDish && ingredientsCount > 0}
                    <span class="item-count">{ingredientsCount} {ingredientsCount === 1 ? 'item' : 'items'}</span>
                  {/if}
                </div>
              </div>
              {#if orphanedIngredients.length > 0}
                <Button
                  variant="outline"
                  size="sm"
                  class="text-orange-600 dark:text-orange-400 border-orange-500/50 hover:bg-orange-500/15 hover:border-orange-500"
                  onclick={() => showOrphanedDialog = true}
                >
                  {orphanedIngredients.length} orphaned
                </Button>
              {/if}
            </CardHeader>

            <CardContent class="card-content">
              <!-- Search/filter input -->
              {#if selectedDish && selectedDishIngredients.length > 0}
                <div class="search-form">
                  <Input
                    type="text"
                    class="search-input"
                    placeholder="Search ingredients..."
                    bind:value={ingredientsSearch}
                    disabled={isSaving}
                    aria-label="Search ingredients"
                  />
                </div>
              {/if}

              <div class="items-container">
              {#if selectedDish}
                {#if filteredIngredients.length > 0}
                  {#each filteredIngredients as { ingredient, item } (ingredient.id)}
                    <div
                      class="item-wrapper {highlightedIngredientIds.has(ingredient.id) ? 'highlighted' : ''}"
                      data-ingredient-id={ingredient.id}
                      ondblclick={() => handleRemoveIngredient(ingredient.id)}
                      role="listitem"
                    >
                      <div class="item-content">
                        <!-- Item text -->
                        <span class="item-text">
                          {#if item}
                            {item.text}
                          {:else}
                            <span class="text-muted-foreground">{ingredient.item_text}</span>
                          {/if}
                        </span>

                        <!-- Orphan badge -->
                        {#if !item}
                          <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex-shrink-0">
                            orphan
                          </span>
                        {/if}

                        <!-- Remove button -->
                        <div class="actions-desktop">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            class="action-button-remove"
                            onclick={() => handleRemoveIngredient(ingredient.id)}
                            aria-label="Remove {item?.text || ingredient.item_text}"
                          >
                            <ArrowRight size={18} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  {/each}
                {:else}
                  <div class="empty-state">
                    <p class="empty-text">No ingredients yet</p>
                  </div>
                {/if}
              {:else}
                <div class="empty-state">
                  <p class="empty-text">Select a dish to view ingredients</p>
                </div>
              {/if}
              </div>
            </CardContent>
          </Card>

          <!-- Column 3: Available Items -->
          <Card class="dish-card">
            <CardHeader class="card-header">
              <div class="header-left">
                <ListPlus size={20} class="list-icon" />
                <div class="header-title-section">
                  <CardTitle class="list-title">Available Items</CardTitle>
                  {#if selectedDish && availableItemsCount > 0}
                    <span class="item-count">{availableItemsCount} {availableItemsCount === 1 ? 'item' : 'items'}</span>
                  {/if}
                </div>
              </div>
            </CardHeader>

            <CardContent class="card-content">
              <!-- Search/filter input with add button -->
              {#if selectedDish}
                <div class="search-form">
                  <div class="input-with-button">
                    <Input
                      type="text"
                      class="add-item-input"
                      placeholder="Search items..."
                      bind:value={availableItemsSearch}
                      bind:ref={searchItemsInputElement}
                      disabled={isSaving}
                      aria-label="Search available items"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      class="add-button-integrated"
                      disabled={isSaving || !availableItemsSearch.trim() || foodLists.length === 0}
                      onclick={openAddItemModal}
                      aria-label="Add new item"
                    >
                      <Plus size={20} />
                    </Button>
                  </div>
                </div>
              {/if}

              <div class="items-container">
              {#if selectedDish}
                {#if filteredAvailableItems.length > 0}
                  {#each filteredAvailableItems as item (item.id)}
                    {@const alreadyAdded = ingredientItemIds.has(item.id)}
                    {#if !alreadyAdded}
                      <div
                        class="item-wrapper"
                        ondblclick={() => handleAddIngredient(item)}
                        role="listitem"
                      >
                        <div class="item-content">
                          <!-- Add button (left side) -->
                          <div class="actions-desktop">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              class="action-button-add"
                              onclick={() => handleAddIngredient(item)}
                              aria-label="Add {item.text}"
                            >
                              <ArrowLeft size={18} />
                            </Button>
                          </div>

                          <!-- Item text -->
                          <span class="item-text">
                            {item.text}
                          </span>
                        </div>
                      </div>
                    {/if}
                  {/each}
                {:else}
                  <div class="empty-state">
                    <p class="empty-text">No food list items available</p>
                  </div>
                {/if}
              {:else}
                <div class="empty-state">
                  <p class="empty-text">Select a dish to add items</p>
                </div>
              {/if}
              </div>
            </CardContent>
          </Card>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <DialogFooter class="flex-shrink-0 flex-row items-center justify-end px-3 py-3 lg:px-5 lg:py-5">
      <Button variant="outline" size="sm" onclick={onClose}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Delete Dish Confirmation Modal -->
{#if dishToDelete}
  <Dialog open={isDeleteDishModalOpen} onOpenChange={(open) => !open && closeDeleteDishModal()}>
    <DialogContent class="max-w-md" showCloseButton={false}>
      <DialogHeader class="pb-4">
        <DialogTitle class="text-xl font-semibold">Delete Dish?</DialogTitle>
      </DialogHeader>

      <p class="text-muted-foreground leading-relaxed">
        Are you sure you want to delete <strong class="font-semibold text-foreground">"{dishToDelete.name}"</strong>?
        This dish will remain in existing meal plans, but you won't be able to add it to new ones.
      </p>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={closeDeleteDishModal}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onclick={confirmDeleteDish}
          disabled={isSaving}
        >
          {isSaving ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}

<!-- Edit Dish Modal -->
{#if dishToEdit}
  <Dialog open={isEditDishModalOpen} onOpenChange={(open) => !open && closeEditDishModal()}>
    <DialogContent class="max-w-lg" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle class="text-xl font-semibold">Edit Dish</DialogTitle>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="dish-name">Dish name</Label>
          <Input
            id="dish-name"
            type="text"
            bind:value={editDishName}
            onkeydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSaving) {
                e.preventDefault();
                confirmEditDish();
              }
            }}
            placeholder="Dish name"
            autofocus
          />
        </div>
        <div class="grid gap-2">
          <Label for="dish-link">Recipe link (optional)</Label>
          <Input
            id="dish-link"
            type="url"
            bind:value={editDishLink}
            onkeydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSaving) {
                e.preventDefault();
                confirmEditDish();
              }
            }}
            placeholder="https://..."
          />
        </div>
      </div>

      <DialogFooter class="gap-3">
        <Button variant="outline" onclick={closeEditDishModal} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onclick={confirmEditDish}
          disabled={!editDishName.trim() || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}

<!-- Add Item Confirmation Modal -->
<Dialog open={isAddItemModalOpen} onOpenChange={(open) => !open && closeAddItemModal()}>
  <DialogContent class="max-w-md" showCloseButton={false}>
    <DialogHeader class="pb-4">
      <DialogTitle class="text-xl font-semibold">Add item</DialogTitle>
    </DialogHeader>

    <div class="add-item-modal-content">
      <!-- Item name input -->
      <div class="modal-form-group">
        <Label class="modal-form-label">Add item</Label>
        <Input
          type="text"
          class="modal-form-input"
          bind:value={newItemName}
          placeholder="Enter item name"
          disabled={isSaving}
        />
      </div>

      <!-- Shopping list selection -->
      <div class="modal-form-group">
        <Label class="modal-form-label">To the shopping list</Label>
        <div class="radio-list-container">
          {#each foodLists as list (list.id)}
            <label class="radio-item-wrapper">
              <div class="radio-item-content">
                <input
                  type="radio"
                  name="shopping-list"
                  value={list.id}
                  checked={selectedListId === list.id}
                  onchange={() => selectedListId = list.id}
                  class="radio-input"
                />
                <span class="radio-item-text">{list.title}</span>
              </div>
            </label>
          {/each}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onclick={closeAddItemModal}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onclick={confirmAddItem}
        disabled={isSaving}
      >
        {isSaving ? 'Adding...' : 'Add'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Orphaned Ingredients Dialog -->
<Dialog open={showOrphanedDialog} onOpenChange={(open) => !open && (showOrphanedDialog = false)}>
  <DialogContent class="sm:max-w-[750px]" showCloseButton={false}>
    <DialogHeader>
      <DialogTitle class="text-xl font-semibold">Orphaned Ingredients</DialogTitle>
    </DialogHeader>

    <p class="text-sm text-muted-foreground mb-4">
      These ingredients are no longer linked to shopping list items.
      Assign them to a list to restore the connection.
    </p>

    <div class="scrollable-dialog max-h-72 overflow-y-auto space-y-2">
      {#each orphanedIngredients as orphan (orphan.ingredient.id)}
        <div class="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-accent">
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{orphan.ingredient.item_text}</div>
            <div class="text-xs text-muted-foreground truncate">from: {orphan.dish.name}</div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onclick={() => handleShowDish(orphan)}>
              Show dish
            </Button>
            <Button variant="outline" size="sm" onclick={() => handleSearchAlternatives(orphan)}>
              <Search size={14} class="mr-1" />
              Search
            </Button>
            <Button variant="outline" size="sm" onclick={() => assigningIngredient = orphan}>
              Assign
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              class="action-button-delete"
              onclick={() => handleDeleteOrphanedIngredient(orphan)}
              aria-label="Delete {orphan.ingredient.item_text}"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-4">No orphaned ingredients</p>
      {/each}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={() => showOrphanedDialog = false}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Assignment Dialog -->
<Dialog open={!!assigningIngredient} onOpenChange={(open) => !open && (assigningIngredient = null)}>
  <DialogContent class="max-w-md" showCloseButton={false}>
    <DialogHeader>
      <DialogTitle class="text-xl font-semibold">
        Assign "{assigningIngredient?.ingredient.item_text}"
      </DialogTitle>
    </DialogHeader>

    <p class="text-sm text-muted-foreground mb-4">
      Select which food list to create this item in:
    </p>

    <div class="radio-list-container">
      {#each foodLists as list (list.id)}
        <label class="radio-item-wrapper">
          <div class="radio-item-content">
            <input
              type="radio"
              name="assign-list"
              value={list.id}
              checked={selectedAssignListId === list.id}
              onchange={() => selectedAssignListId = list.id}
              class="radio-input"
            />
            <span class="radio-item-text">{list.title}</span>
          </div>
        </label>
      {/each}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={() => assigningIngredient = null}>
        Cancel
      </Button>
      <Button
        disabled={!selectedAssignListId || isAssigning}
        onclick={handleAssign}
      >
        {isAssigning ? 'Creating...' : 'Create & Assign'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Search Alternatives Dialog -->
<Dialog open={!!searchingOrphan} onOpenChange={(open) => !open && (searchingOrphan = null, alternativeResults = [], alternativeSearchText = '')}>
  <DialogContent class="sm:max-w-[500px]" showCloseButton={false}>
    <DialogHeader>
      <DialogTitle class="text-xl font-semibold">
        Search alternatives
      </DialogTitle>
    </DialogHeader>

    {#if alternativeResults.length > 0}
      <p class="text-sm text-muted-foreground mb-4">
        Found {alternativeResults.length} matching {alternativeResults.length === 1 ? 'item' : 'items'}. Select one to link:
      </p>

      <div class="scrollable-dialog max-h-64 overflow-y-auto border rounded-md">
        {#each alternativeResults as item (item.id)}
          <button
            class="w-full flex items-center justify-between gap-3 p-3 border-b last:border-b-0 hover:bg-accent text-left transition-colors"
            onclick={() => handleLinkAlternative(item)}
            disabled={isLinkingAlternative}
          >
            <span class="font-medium truncate">{item.text}</span>
            <ArrowLeft size={16} class="flex-shrink-0 text-muted-foreground" />
          </button>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-muted-foreground mb-4">
        No matching items found. Try a different search term or use "Assign" to create a new item.
      </p>

      <form
        class="flex gap-2"
        onsubmit={(e) => { e.preventDefault(); handleRetrySearch(); }}
      >
        <Input
          type="text"
          class="flex-1"
          placeholder="Search term..."
          bind:value={alternativeSearchText}
        />
        <Button type="submit" disabled={!alternativeSearchText.trim()}>
          <Search size={16} class="mr-1" />
          Search
        </Button>
      </form>
    {/if}

    <DialogFooter>
      <Button variant="outline" onclick={() => { searchingOrphan = null; alternativeResults = []; alternativeSearchText = ''; }}>
        {alternativeResults.length > 0 ? 'Cancel' : 'Close'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<style>
  /* Card styling - matching ListCard */
  :global(.dish-card) {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 200px;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  /* Header styling */
  :global(.card-header) {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .header-left {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
  }

  :global(.list-icon) {
    color: var(--text-secondary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .header-title-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  :global(.list-title) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-count {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  /* Content styling */
  :global(.card-content) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 var(--space-4) 0 !important;
  }

  /* Add item form */
  .add-item-form {
    margin-bottom: var(--space-4);
  }

  /* Add dish inputs layout */
  .add-dish-inputs {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  :global(.add-dish-name-input) {
    flex: 1;
    min-width: 0;
    height: 44px;
  }

  :global(.add-dish-button) {
    flex-shrink: 0;
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    background-color: var(--accent-primary) !important;
    color: var(--text-inverse) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: var(--shadow-sm) !important;
    transition: background-color var(--transition-fast),
                box-shadow var(--transition-fast),
                transform var(--transition-fast) !important;
  }

  :global(.add-dish-button:hover:not(:disabled)) {
    background-color: var(--accent-hover) !important;
    box-shadow: var(--shadow-md) !important;
    transform: scale(1.05) !important;
  }

  :global(.add-dish-button:active:not(:disabled)) {
    background-color: var(--accent-muted) !important;
    box-shadow: var(--shadow-sm) !important;
    transform: scale(0.98) !important;
  }

  :global(.add-dish-button:disabled) {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    background-color: var(--bg-tertiary) !important;
    color: var(--text-muted) !important;
  }

  /* Search form for available items */
  .search-form {
    margin-bottom: var(--space-4);
  }

  :global(.search-input) {
    height: 44px;
  }

  /* Integrated input with button */
  .input-with-button {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.add-item-input) {
    flex: 1;
    padding-right: 48px !important;
    height: 44px;
  }

  :global(.add-button-integrated) {
    position: absolute;
    right: 4px;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    background-color: var(--accent-primary) !important;
    color: var(--text-inverse) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: var(--shadow-sm) !important;
    transition: background-color var(--transition-fast),
                box-shadow var(--transition-fast),
                transform var(--transition-fast) !important;
  }

  :global(.add-button-integrated:hover:not(:disabled)) {
    background-color: var(--accent-hover) !important;
    box-shadow: var(--shadow-md) !important;
    transform: scale(1.05) !important;
  }

  :global(.add-button-integrated:active:not(:disabled)) {
    background-color: var(--accent-muted) !important;
    box-shadow: var(--shadow-sm) !important;
    transform: scale(0.98) !important;
  }

  :global(.add-button-integrated:disabled) {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    background-color: var(--bg-tertiary) !important;
    color: var(--text-muted) !important;
  }

  /* Items container - matching ListCard */
  .items-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--bg-primary);
    margin: 0 calc(var(--space-4) * -1);
    -webkit-overflow-scrolling: touch;
  }

  /* Item wrapper - matching ListItem.svelte */
  .item-wrapper {
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--border-subtle);
    margin: 0 var(--space-3);
    transition: background-color var(--transition-fast);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .item-wrapper:hover {
    background-color: var(--bg-hover);
  }

  .item-wrapper.selected {
    background-color: var(--accent-muted);
    border: 1px solid var(--accent-primary);
    border-radius: var(--radius-md);
  }

  .item-wrapper.highlighted {
    background-color: color-mix(in oklch, var(--accent-primary), transparent 90%);
    border-left: 3px solid var(--accent-primary);
  }

  .item-content {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 48px;
    position: relative;
    z-index: 1;
    padding: var(--space-3) var(--space-4);
    background-color: var(--bg-primary);
  }

  @media (min-width: 1024px) {
    .item-content {
      background-color: transparent;
    }
  }

  /* Item text - matching ListItem.svelte */
  .item-text {
    flex: 1;
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: var(--leading-normal);
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color var(--transition-fast);
  }

  /* Container for dish name - ensures truncation and buttons always visible */
  .dish-name-container {
    flex: 1;
    min-width: 0; /* Allows flex item to shrink below content size */
    overflow: hidden;
  }

  /* Dish name (no link) */
  .dish-name {
    display: block;
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: var(--leading-normal);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Dish name as link - only text and icon are clickable */
  .dish-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    max-width: 100%;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: var(--text-primary);
    font-size: var(--text-base);
    font-family: inherit;
    line-height: var(--leading-normal);
    text-decoration: underline;
    text-decoration-color: var(--border-default);
    text-underline-offset: 2px;
    text-align: left;
    transition: all var(--transition-fast);
  }

  .dish-link-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dish-link:hover {
    color: hsl(var(--primary));
    text-decoration-color: hsl(var(--primary));
  }

  :global(.inline-icon) {
    flex-shrink: 0;
    opacity: 0.5;
  }

  .dish-link:hover :global(.inline-icon) {
    opacity: 1;
  }

  /* Desktop actions - matching ListItem.svelte */
  .actions-desktop {
    display: none;
    align-items: center;
    gap: var(--space-2);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast);
  }

  @media (min-width: 1024px) {
    .actions-desktop {
      display: flex;
    }

    .item-wrapper:hover .actions-desktop {
      opacity: 1;
      pointer-events: auto;
    }
  }

  /* Empty state styling - matching ListCard */
  .empty-state {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Spacing */
    padding: var(--space-8) 0;
  }

  .empty-text {
    /* Typography */
    color: var(--text-muted);
    font-size: var(--text-base);
    text-align: center;

    /* Reset */
    margin: 0;
  }

  /* Added badge styling - match button height */
  :global(.added-badge) {
    height: 32px;
    display: flex;
    align-items: center;
    padding: 0 var(--space-3) !important;
  }

  /* Action button styling - matching ListItem.svelte */
  :global(.action-button-edit) {
    background-color: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;
    transition: all var(--transition-fast) !important;
  }

  @media (min-width: 1024px) {
    :global(.action-button-edit) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-edit:hover) {
      background-color: var(--accent-primary) !important;
      color: var(--text-inverse) !important;
      border-color: var(--accent-primary) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-edit:active) {
    transform: scale(0.98) !important;
  }

  :global(.action-button-delete) {
    background-color: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;
    transition: all var(--transition-fast) !important;
  }

  @media (min-width: 1024px) {
    :global(.action-button-delete) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-delete:hover) {
      background-color: var(--accent-primary) !important;
      color: var(--text-inverse) !important;
      border-color: var(--accent-primary) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-delete:active) {
    transform: scale(0.98) !important;
  }

  /* Remove button styling for ingredients - orange arrow */
  :global(.action-button-remove) {
    background-color: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;
    transition: all var(--transition-fast) !important;
  }

  @media (min-width: 1024px) {
    :global(.action-button-remove) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-remove:hover) {
      background-color: var(--accent-primary) !important;
      color: var(--text-inverse) !important;
      border-color: var(--accent-primary) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-remove:active) {
    transform: scale(0.98) !important;
  }

  /* Add button styling for available items - using theme colors */
  :global(.action-button-add) {
    background-color: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;
    transition: all var(--transition-fast) !important;
  }

  @media (min-width: 1024px) {
    :global(.action-button-add) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-add:hover) {
      background-color: var(--accent-primary) !important;
      color: var(--text-inverse) !important;
      border-color: var(--accent-primary) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-add:active) {
    transform: scale(0.98) !important;
  }

  /* Custom scrollbar styling - matching main view */
  .items-container::-webkit-scrollbar {
    width: 8px;
  }

  .items-container::-webkit-scrollbar-track {
    background: transparent;
    margin: var(--space-2) 0;
  }

  .items-container::-webkit-scrollbar-thumb {
    background-color: var(--border-default);
    border-radius: var(--radius-full);
    transition: background-color var(--transition-fast);
  }

  .items-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--accent-primary);
  }

  /* Firefox scrollbar styling */
  .items-container,
  .scrollable-dialog {
    scrollbar-width: auto;
    scrollbar-color: var(--border-default) transparent;
  }

  /* ============================================================================
   * ADD ITEM MODAL STYLING
   * ========================================================================== */

  .add-item-modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .modal-form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  :global(.modal-form-label) {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
  }

  :global(.modal-form-input) {
    height: 44px;
  }

  /* Radio list container - matches items-container styling */
  .radio-list-container {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
    background-color: var(--bg-primary);
  }

  /* Radio item wrapper - matches ListItem.svelte .item-wrapper */
  .radio-item-wrapper {
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--border-subtle);
    transition: background-color var(--transition-fast);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  .radio-item-wrapper:last-child {
    border-bottom: none;
  }

  .radio-item-wrapper:hover {
    background-color: var(--bg-hover);
  }

  /* Radio item content - matches ListItem.svelte .item-content */
  .radio-item-content {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 48px;
    padding: var(--space-3) var(--space-4);
    background-color: var(--bg-primary);
  }

  /* Radio input - styled to match checkbox */
  .radio-input {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;

    /* Border and background */
    border: 1px solid var(--border);
    background-color: transparent;
    border-radius: 50%;

    /* Shadow matching checkbox */
    box-shadow: var(--shadow-xs);

    /* Transition */
    transition: all 0.15s ease-in-out;

    /* Position for inner dot */
    position: relative;
  }

  /* Focus ring */
  .radio-input:focus-visible {
    outline: none;
    border-color: var(--ring);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring), transparent 50%);
  }

  /* Checked state */
  .radio-input:checked {
    background-color: var(--primary);
    border-color: var(--primary);
  }

  /* Disabled state */
  .radio-input:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* Radio item text - matches ListItem.svelte .item-text */
  .radio-item-text {
    flex: 1;
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: var(--leading-normal);
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color var(--transition-fast);
  }
</style>

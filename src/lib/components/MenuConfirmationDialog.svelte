<script lang="ts">
  // Menu confirmation dialog with ingredient preview
  // Shows ingredients with quantities and allows excluding items

  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';
  import type { Menu, MenuWithDetails, Item, ConfirmMenuResponse } from '$lib/types';

  // Props
  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    supabase: import('@supabase/supabase-js').SupabaseClient;
    menus: MenuWithDetails[];
    onConfirmed?: () => void;
  }

  let { isOpen = false, onClose, supabase, menus, onConfirmed }: Props = $props();

  // State
  let excludedItemIds = $state<Set<number>>(new Set());
  let isSaving = $state(false);

  // Derived state - ingredient items with quantities
  interface IngredientWithQuantity {
    item: Item;
    quantity: number;
  }

  let ingredientsWithQuantity = $derived.by((): IngredientWithQuantity[] => {
    const itemCountMap = new Map<number, { item: Item; count: number }>();

    // Get unconfirmed menus
    const unconfirmedMenus = menus.filter(m => !m.menu.is_confirmed && m.menu.dish_id !== null);

    // Count how many dishes use each item
    for (const menuData of unconfirmedMenus) {
      for (const { ingredient, item } of menuData.ingredients) {
        if (item && ingredient.item_id) {
          const existing = itemCountMap.get(ingredient.item_id);
          if (existing) {
            existing.count++;
          } else {
            itemCountMap.set(ingredient.item_id, { item, count: 1 });
          }
        }
      }
    }

    // Convert to array and sort alphabetically
    return Array.from(itemCountMap.values())
      .map(({ item, count }) => ({ item, quantity: count }))
      .sort((a, b) => a.item.text.localeCompare(b.item.text));
  });

  // Handle dialog open change
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose?.();
      excludedItemIds = new Set();
    }
  }

  // Toggle item exclusion
  function toggleItemExclusion(itemId: number, checked: boolean) {
    const newSet = new Set(excludedItemIds);
    if (checked) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    excludedItemIds = newSet;
  }

  // ============================================================================
  // CONFIRM MENU
  // ============================================================================

  async function handleDoNothing() {
    onClose?.();
    excludedItemIds = new Set();
  }

  async function handleAdjustShoppingLists() {
    isSaving = true;

    try {
      // Get menu IDs to confirm (unconfirmed menus with dishes)
      const menuIds = menus
        .filter(m => !m.menu.is_confirmed && m.menu.dish_id !== null)
        .map(m => m.menu.id);

      if (menuIds.length === 0) {
        onClose?.();
        return;
      }

      // Call RPC function
      const { data, error } = await supabase.rpc('confirm_menu_and_update_quantities', {
        p_menu_ids: menuIds,
        p_excluded_item_ids: Array.from(excludedItemIds)
      });

      if (error) {
        console.error('Error confirming menu:', error);
        throw error;
      }

      const result = data as ConfirmMenuResponse;

      // Reset state
      excludedItemIds = new Set();

      // Notify parent
      onConfirmed?.();

      // Close dialog
      onClose?.();
    } catch (err) {
      console.error('Failed to confirm menu:', err);
    } finally {
      isSaving = false;
    }
  }
</script>

<!-- Menu Confirmation Dialog -->
<Dialog open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent class="max-w-md" showCloseButton={false}>
    <DialogHeader class="pb-4">
      <DialogTitle class="text-xl font-semibold">Confirm Menu</DialogTitle>
    </DialogHeader>

    <div class="flex flex-col gap-5">
      <!-- Info message -->
      <div class="rounded-md border border-border bg-muted p-4">
        <p class="text-sm text-muted-foreground">
          The following items will be added to your shopping lists. Uncheck any items you don't need.
        </p>
      </div>

      <!-- Ingredients list -->
      {#if ingredientsWithQuantity.length > 0}
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">Ingredients</span>
          <ul class="ingredients-list flex max-h-[300px] flex-col gap-2 overflow-y-auto" role="list">
            {#each ingredientsWithQuantity as { item, quantity } (item.id)}
              {@const isExcluded = excludedItemIds.has(item.id)}
              <li
                class="flex min-h-[48px] items-center gap-3 rounded-md border border-border bg-muted p-2 px-3 transition-colors hover:border-input hover:bg-accent"
                role="listitem"
              >
                <!-- Checkbox -->
                <Checkbox
                  checked={!isExcluded}
                  onCheckedChange={(checked) => toggleItemExclusion(item.id, checked === true)}
                  disabled={isSaving}
                />

                <!-- Item text -->
                <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium {isExcluded ? 'text-muted-foreground line-through' : ''}">
                  {item.text}
                </span>

                <!-- Quantity badge -->
                {#if quantity > 1}
                  <Badge variant="secondary" class="flex-shrink-0 text-xs">×{quantity}</Badge>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="flex items-center justify-center rounded-md border border-border bg-muted p-8">
          <p class="text-sm text-muted-foreground">No ingredients to confirm</p>
        </div>
      {/if}
    </div>

    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onclick={handleDoNothing}
        disabled={isSaving}
      >
        Do Nothing
      </Button>
      <Button
        type="button"
        variant="default"
        onclick={handleAdjustShoppingLists}
        disabled={isSaving || ingredientsWithQuantity.length === 0}
      >
        {isSaving ? 'Confirming...' : 'Adjust Shopping Lists'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<style>
  /* Firefox scrollbar styling */
  .ingredients-list {
    scrollbar-width: auto;
    scrollbar-color: var(--border-default) transparent;
  }
</style>

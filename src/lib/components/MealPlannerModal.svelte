<script lang="ts">
  // Meal planner modal wrapper for desktop
  // Uses MealPlannerContent component inside a Dialog

  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';
  import MealPlannerContent from '$lib/components/MealPlannerContent.svelte';

  // Props
  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    supabase: import('@supabase/supabase-js').SupabaseClient;
    userId: string;
    onConfirmMenu?: () => void;
  }

  let { isOpen = false, onClose, supabase, userId, onConfirmMenu }: Props = $props();

  // Handle dialog open change
  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose?.();
    }
  }
</script>

<!-- Main Meal Planner Dialog -->
<Dialog open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent
    class="flex h-auto max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col p-0 sm:max-w-[700px]"
    showCloseButton={false}
  >
    <!-- Header -->
    <DialogHeader class="flex-shrink-0 px-4 py-4 lg:px-6 lg:py-6">
      <DialogTitle class="text-xl font-semibold">Meal Planner</DialogTitle>
    </DialogHeader>

    <!-- Reusable Content Component -->
    <MealPlannerContent
      {supabase}
      {userId}
      {onConfirmMenu}
      {onClose}
      showCloseButton={true}
    />
  </DialogContent>
</Dialog>

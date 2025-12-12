<script lang="ts">
  // Confirmation dialog for destructive actions using shadcn-svelte

  import { Button } from '$lib/components/ui/button';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';

  interface Props {
    isOpen: boolean;
    title?: string;
    message?: string;
    itemName?: string; // Optional item name to highlight in bold
    listName?: string; // Optional list name to highlight in bold
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm?: () => void;
    onCancel?: () => void;
  }

  let {
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    itemName,
    listName,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
  }: Props = $props();

  // Handle confirm
  function handleConfirm() {
    onConfirm?.();
  }

  // Handle cancel
  function handleCancel() {
    onCancel?.();
  }

  // Handle dialog open change - called when dialog closes via ESC or overlay click
  function handleOpenChange(open: boolean) {
    if (!open) {
      // Dialog is closing, call onCancel immediately
      onCancel?.();
    }
  }

  // Determine button variant based on dialog variant
  const buttonVariant = $derived(
    variant === 'danger' ? 'destructive' : variant === 'warning' ? 'default' : 'default'
  );
</script>

<Dialog open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent class="max-w-md" showCloseButton={false}>
    <DialogHeader>
      <DialogTitle class="text-xl font-semibold">{title}</DialogTitle>
    </DialogHeader>

    <div class="py-6">
      {#if itemName && listName}
        <p class="text-muted-foreground leading-relaxed">
          {message.split(`"${itemName}"`)[0]}<strong class="font-semibold text-foreground">"{itemName}"</strong>{message.split(`"${itemName}"`)[1].split(listName)[0]}<strong class="font-semibold text-foreground">{listName}</strong>{message.split(`"${itemName}"`)[1].split(listName)[1]}
        </p>
      {:else if itemName}
        <p class="text-muted-foreground leading-relaxed">
          {message.split(`"${itemName}"`)[0]}<strong class="font-semibold text-foreground">"{itemName}"</strong>{message.split(`"${itemName}"`)[1]}
        </p>
      {:else}
        <p class="text-muted-foreground leading-relaxed whitespace-pre-line">{message}</p>
      {/if}
    </div>

    <DialogFooter class="gap-3">
      <Button variant="outline" onclick={handleCancel}>
        {cancelText}
      </Button>
      <Button variant={buttonVariant} onclick={handleConfirm}>
        {confirmText}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

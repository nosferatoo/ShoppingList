<script lang="ts">
  // Confirmation dialog for destructive actions using shadcn-svelte

  import { Button } from '$lib/components/ui/button';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
  } from '$lib/components/ui/dialog';

  interface Props {
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm?: () => void;
    onCancel?: () => void;
  }

  let {
    isOpen = $bindable(),
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
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
    isOpen = false;
  }

  // Determine button variant based on dialog variant
  const buttonVariant = $derived(
    variant === 'danger' ? 'destructive' : variant === 'warning' ? 'default' : 'default'
  );
</script>

<Dialog bind:open={isOpen}>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{message}</DialogDescription>
    </DialogHeader>

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

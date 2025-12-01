<script lang="ts">
  // Confirmation dialog for destructive actions

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
    isOpen,
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
  }

  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <!-- Modal backdrop -->
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Modal dialog -->
    <div
      class="modal-dialog"
      role="alertdialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      aria-modal="true"
    >
      <h2 id="confirm-dialog-title" class="modal-title">{title}</h2>

      <p id="confirm-dialog-description" class="message">
        {message}
      </p>

      <div class="modal-actions">
        <button
          type="button"
          class="button button-secondary"
          onclick={handleCancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          class="button button-primary"
          class:danger={variant === 'danger'}
          class:warning={variant === 'warning'}
          onclick={handleConfirm}
          autofocus
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Modal backdrop */
  .modal-backdrop {
    /* Position */
    position: fixed;
    inset: 0;
    z-index: 1001;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Background */
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    /* Padding for mobile */
    padding: var(--space-4);
  }

  /* Modal dialog */
  .modal-dialog {
    /* Layout */
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 480px;

    /* Style */
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);

    /* Spacing */
    padding: var(--space-6);

    /* Animation */
    animation: fade-in var(--transition-normal);
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

  .modal-title {
    /* Typography */
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    font-family: var(--font-heading);

    /* Spacing */
    margin: 0 0 var(--space-6) 0;
  }

  .message {
    /* Typography */
    font-size: var(--text-base);
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);

    /* Spacing */
    margin: 0 0 var(--space-6) 0;
  }

  .modal-actions {
    /* Layout */
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;

    /* Spacing */
    margin-top: var(--space-2);
  }

  /* Buttons */
  .button {
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

    /* Spacing */
    padding: 0 var(--space-4);

    /* Transition */
    transition: background-color var(--transition-fast), opacity var(--transition-fast);
  }

  .button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .button-secondary {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .button-secondary:hover:not(:disabled) {
    background-color: var(--bg-hover);
  }

  .button-primary {
    background-color: var(--accent-primary);
    color: var(--text-inverse);
  }

  .button-primary:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  .button-primary.danger {
    background-color: var(--error);
    color: var(--text-inverse);
  }

  .button-primary.danger:hover:not(:disabled) {
    background-color: #dc2626;
  }

  .button-primary.danger:active:not(:disabled) {
    background-color: #b91c1c;
  }

  .button-primary.warning {
    background-color: #f59e0b;
  }

  .button-primary.warning:hover:not(:disabled) {
    background-color: #d97706;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

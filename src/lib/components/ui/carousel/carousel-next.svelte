<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { getContext } from 'svelte';
  import { derived } from 'svelte/store';
  import { ChevronRight } from 'lucide-svelte';

  type Props = HTMLButtonAttributes & {
    onclick?: (event: MouseEvent) => void;
  };

  let { class: className, onclick, ...restProps }: Props = $props();

  const context = getContext('carousel') as {
    canScrollNext: any;
    scrollNext: () => void;
    orientation: 'horizontal' | 'vertical';
  };

  const disabled = derived(context.canScrollNext, (canScroll) => !canScroll);

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    context.scrollNext();
    onclick?.(event);
  }
</script>

<button
  type="button"
  class="carousel-button carousel-next {className}"
  disabled={$disabled}
  onclick={handleClick}
  aria-label="Next slide"
  {...restProps}
>
  <ChevronRight size={24} />
</button>

<style>
  .carousel-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 48px;
    height: 48px;

    /* Style */
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    cursor: pointer;
    color: var(--text-primary);
    box-shadow: var(--shadow-md);

    /* Transition */
    transition: background-color var(--transition-fast),
                border-color var(--transition-fast),
                opacity var(--transition-fast);
  }

  .carousel-button:hover:not(:disabled) {
    background-color: var(--bg-hover);
    border-color: var(--accent-primary);
  }

  .carousel-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .carousel-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
</style>

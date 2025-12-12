<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { getContext } from 'svelte';

  type Props = HTMLAttributes<HTMLDivElement> & {
    children?: any;
  };

  let { class: className, children, ...restProps }: Props = $props();

  const context = getContext('carousel') as { orientation: 'horizontal' | 'vertical' };
  const orientation = context?.orientation || 'horizontal';
</script>

<div
  class="carousel-item {className}"
  class:horizontal={orientation === 'horizontal'}
  class:vertical={orientation === 'vertical'}
  role="group"
  aria-roledescription="slide"
  {...restProps}
>
  {@render children?.()}
</div>

<style>
  .carousel-item {
    min-width: 0;
    flex-shrink: 0;
    flex-grow: 0;
    flex-basis: auto;
  }

  .carousel-item.horizontal {
    /* Allow natural width for multiple items to show */
  }

  .carousel-item.vertical {
    /* Allow natural height */
  }
</style>

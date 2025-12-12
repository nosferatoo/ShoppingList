<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLDivElement> & {
    children?: any;
  };

  let { class: className, children, ...restProps }: Props = $props();
</script>

<div class="carousel-viewport" {...restProps}>
  <div class="carousel-container {className}">
    {@render children?.()}
  </div>
</div>

<style>
  .carousel-viewport {
    overflow: hidden;
  }

  .carousel-container {
    display: flex;
    backface-visibility: hidden;
    touch-action: pan-y pinch-zoom;
  }
</style>

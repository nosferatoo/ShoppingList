<script lang="ts" module>
  import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
  import type { HTMLAttributes } from 'svelte/elements';

  export type CarouselAPI = EmblaCarouselType;
  export type CarouselOptions = Partial<EmblaOptionsType>;

  type Props = HTMLAttributes<HTMLDivElement> & {
    opts?: CarouselOptions;
    plugins?: any[];
    api?: CarouselAPI;
    orientation?: 'horizontal' | 'vertical';
  };
</script>

<script lang="ts">
  import EmblaCarousel from 'embla-carousel';
  import { setContext, onMount } from 'svelte';
  import { writable } from 'svelte/store';

  let {
    opts = {},
    plugins = [],
    api = $bindable(),
    orientation = 'horizontal',
    class: className,
    children,
    ...restProps
  }: Props = $props();

  const orientationOption = opts?.axis === 'y' ? 'vertical' : 'horizontal';
  const canScrollPrev = writable(true);
  const canScrollNext = writable(true);
  const scrollProgress = writable(0);

  let rootNode: HTMLDivElement;
  let emblaApi: CarouselAPI | undefined = $state(undefined);

  const scrollPrev = () => {
    emblaApi?.scrollPrev();
  };
  const scrollNext = () => {
    emblaApi?.scrollNext();
  };

  function updateScrollState() {
    if (!emblaApi) return;

    const canPrev = emblaApi.canScrollPrev();
    const canNext = emblaApi.canScrollNext();
    canScrollPrev.set(canPrev);
    canScrollNext.set(canNext);
  }

  // Initialize Embla on mount
  onMount(() => {
    if (!rootNode) {
      console.error('Root node not found');
      return;
    }

    // Find the viewport element (first child with class carousel-viewport)
    const viewportElement = rootNode.querySelector('.carousel-viewport') as HTMLElement;
    if (!viewportElement) {
      console.error('Viewport element (.carousel-viewport) not found');
      return;
    }

    emblaApi = EmblaCarousel(viewportElement, carouselOptions, plugins);
    api = emblaApi;

    updateScrollState();

    // Listen for events
    emblaApi.on('select', updateScrollState);
    emblaApi.on('resize', updateScrollState);
    emblaApi.on('reInit', updateScrollState);

    return () => {
      emblaApi?.destroy();
    };
  });

  setContext('carousel', {
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    orientation: orientationOption
  });

  const carouselOptions = { ...opts, axis: opts?.axis ?? (orientation === 'horizontal' ? 'x' : 'y') };
</script>

<div
  bind:this={rootNode}
  class="carousel {className}"
  role="region"
  aria-roledescription="carousel"
  {...restProps}
>
  {@render children?.()}
</div>

<style>
  .carousel {
    position: relative;
    width: 100%;
  }
</style>

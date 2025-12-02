<script lang="ts">
  // Swipe hint overlay for first-time mobile users
  // Shows animated hint to swipe between lists

  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { browser } from '$app/environment';

  interface Props {
    isVisible?: boolean;
    onDismiss?: () => void;
  }

  let { isVisible = false, onDismiss }: Props = $props();

  // Auto-dismiss after 4 seconds
  $effect(() => {
    if (isVisible && browser) {
      const timeout = setTimeout(() => {
        onDismiss?.();
      }, 4000);

      return () => clearTimeout(timeout);
    }
  });

  // Dismiss on tap
  function handleTap() {
    onDismiss?.();
  }

  // Dismiss on keyboard (Enter or Space)
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onDismiss?.();
    }
  }
</script>

{#if isVisible}
  <div
    class="swipe-hint-overlay"
    onclick={handleTap}
    onkeydown={handleKeydown}
    role="button"
    tabindex="0"
    aria-label="Dismiss swipe hint"
  >
    <div class="swipe-hint-content">
      <!-- Animated arrows -->
      <div class="swipe-arrows">
        <span class="arrow arrow-left">
          <ChevronLeft size={32} />
        </span>
        <span class="arrow arrow-right">
          <ChevronRight size={32} />
        </span>
      </div>

      <!-- Hint text -->
      <p class="hint-text">Swipe left or right to navigate between lists</p>

      <!-- Dismiss hint -->
      <Button
        variant="default"
        size="lg"
        class="dismiss-button"
        onclick={handleTap}
      >
        Got it
      </Button>
    </div>
  </div>
{/if}

<style>
  .swipe-hint-overlay {
    /* Position */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 90;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Background */
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);

    /* Spacing */
    padding: var(--space-6);

    /* Animation */
    animation: fadeIn 300ms ease-out;

    /* Cursor */
    cursor: pointer;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .swipe-hint-content {
    /* Layout */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);

    /* Prevent click-through */
    pointer-events: auto;
  }

  /* Arrows */
  .swipe-arrows {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-8);

    /* Size */
    position: relative;
    width: 120px;
    height: 60px;
  }

  .arrow {
    /* Position */
    position: absolute;
    top: 50%;
    transform: translateY(-50%);

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Color */
    color: var(--accent-primary);

    /* Animation */
    opacity: 0;
  }

  .arrow-left {
    left: 0;
    animation: swipeLeft 2s ease-in-out infinite;
  }

  .arrow-right {
    right: 0;
    animation: swipeRight 2s ease-in-out infinite;
  }

  @keyframes swipeLeft {
    0%, 100% {
      opacity: 0;
      transform: translateY(-50%) translateX(20px);
    }
    40%, 60% {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }

  @keyframes swipeRight {
    0%, 100% {
      opacity: 0;
      transform: translateY(-50%) translateX(-20px);
    }
    40%, 60% {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }

  /* Hint text */
  .hint-text {
    /* Typography */
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    text-align: center;
    line-height: var(--leading-relaxed);

    /* Layout */
    max-width: 300px;

    /* Reset */
    margin: 0;
  }

  /* Dismiss button */
  :global(.dismiss-button) {
    /* Prevent dismissing overlay */
    pointer-events: auto;
    min-width: 120px;
  }
</style>

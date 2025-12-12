<script lang="ts">
  import { goto } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/db/supabase';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { LoginFormData } from '$lib/types';

  // State
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let isLoading = $state(false);

  // Derived state for form validation
  let isFormValid = $derived(email.length > 0 && password.length > 0);

  // Supabase client
  const supabase = createSupabaseBrowserClient();

  /**
   * Handle form submission
   */
  async function handleSubmit(event: Event) {
    event.preventDefault();

    // Reset error state
    error = '';

    // Validate form
    if (!email || !password) {
      error = 'Please enter both email and password';
      return;
    }

    // Start loading
    isLoading = true;

    try {
      // Attempt to sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // Handle authentication errors
        if (signInError.message.includes('Invalid login credentials')) {
          error = 'Invalid email or password';
        } else {
          error = signInError.message;
        }
        return;
      }

      if (data.session) {
        // Successful login - redirect to main app
        await goto('/', { replaceState: true });
      }
    } catch (err) {
      // Handle unexpected errors
      error = 'An unexpected error occurred. Please try again.';
      console.error('Login error:', err);
    } finally {
      // Stop loading
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In - Lists</title>
</svelte:head>

<div class="login-container">
  <div class="login-content">
    <div>
      <!-- Logo/Title -->
      <div class="mb-10 text-center sm:mb-10">
        <div class="icon-glow-container">
          <img
            src="/icons/icon.svg"
            alt="App icon"
            class="app-icon"
          />
        </div>
        <h1 class="app-subtitle">
          Shopping and to-do lists
        </h1>
      </div>

      <!-- Login Form -->
      <form onsubmit={handleSubmit} class="flex flex-col gap-4">
        <!-- Email Input -->
        <div class="flex flex-col gap-2">
          <Label for="email" class="sr-only">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            bind:value={email}
            disabled={isLoading}
            autocomplete="email"
            class={error ? 'border-destructive' : ''}
          />
        </div>

        <!-- Password Input -->
        <div class="flex flex-col gap-2">
          <Label for="password" class="sr-only">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            bind:value={password}
            disabled={isLoading}
            autocomplete="current-password"
            class={error ? 'border-destructive' : ''}
          />
        </div>

        <!-- Error Message -->
        {#if error}
          <div
            class="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm text-center"
            role="alert"
          >
            {error}
          </div>
        {/if}

        <!-- Submit Button -->
        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          class="w-full h-12 mt-2"
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
    </div>
  </div>
</div>

<style>
  /* Screen reader only label */
  :global(.sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Login container with aurora background */
  .login-container {
    /* Layout */
    position: relative;
    min-height: 100vh;
    overflow: hidden;

    /* Background */
    background-color: var(--bg-primary);
  }

  /* Aurora background effect - visible on both mobile and desktop */
  .login-container::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;

    /* Aurora gradients - optimized with darker transitions */
    background:
      /* Primary orange orb - top left */
      radial-gradient(
        ellipse 60vw 50vh at 15% 25%,
        rgba(249, 115, 22, 0.20) 0%,
        rgba(249, 115, 22, 0.12) 25%,
        rgba(180, 70, 30, 0.08) 45%,
        rgba(120, 40, 40, 0.04) 65%,
        rgba(60, 20, 30, 0.02) 80%,
        transparent 100%
      ),
      /* Teal orb - bottom right */
      radial-gradient(
        ellipse 60vw 50vh at 85% 75%,
        rgba(20, 184, 166, 0.15) 0%,
        rgba(20, 184, 166, 0.09) 25%,
        rgba(15, 120, 130, 0.06) 45%,
        rgba(10, 70, 90, 0.03) 65%,
        rgba(5, 40, 60, 0.015) 80%,
        transparent 100%
      ),
      /* Purple orb - upper right */
      radial-gradient(
        ellipse 60vw 50vh at 60% 35%,
        rgba(168, 85, 247, 0.18) 0%,
        rgba(168, 85, 247, 0.11) 25%,
        rgba(120, 60, 180, 0.07) 45%,
        rgba(80, 40, 120, 0.04) 65%,
        rgba(50, 25, 80, 0.02) 80%,
        transparent 100%
      ),
      /* Blue orb - lower left */
      radial-gradient(
        ellipse 60vw 50vh at 35% 75%,
        rgba(59, 130, 246, 0.18) 0%,
        rgba(59, 130, 246, 0.11) 25%,
        rgba(40, 90, 180, 0.07) 45%,
        rgba(25, 60, 120, 0.04) 65%,
        rgba(15, 35, 80, 0.02) 80%,
        transparent 100%
      );

    /* Performance optimizations */
    will-change: transform, opacity;
    mix-blend-mode: screen;

    /* Increased blur for extremely smooth effect */
    filter: blur(var(--blur, 120px));

    /* Dynamic scale control */
    transform: scale(var(--scale, 1));

    /* Slow, subtle animation */
    animation: aurora-drift var(--duration, 18s) ease-in-out infinite alternate;
  }

  @keyframes aurora-drift {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(4%, -3%) scale(1.04);
    }
    50% {
      transform: translate(-3%, 3%) scale(0.97);
    }
    75% {
      transform: translate(2%, 1%) scale(1.03);
    }
  }

  /* Optional: CSS noise overlay for organic texture */
  .login-container.noise-css::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' opacity='0.04'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /></filter><rect width='100%' height='100%' filter='url(%23n)' /></svg>");
    background-size: 300px;
    mix-blend-mode: overlay;
  }

  /* Login content - appears above aurora */
  .login-content {
    /* Layout */
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
  }

  /* Glass morphism card wrapper */
  .login-content > div {
    width: 100%;
    max-width: 440px;
    padding: 3rem 2.5rem;

    /* Frosted glass effect */
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);

    /* Simple subtle border that respects border-radius */
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;

    /* Soft shadow for depth */
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);

    /* Position for pseudo-elements */
    position: relative;
  }

  /* Aurora-inspired gradient border using pseudo-element */
  .login-content > div::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 24px;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(249, 115, 22, 0.3),
      rgba(168, 85, 247, 0.3),
      rgba(20, 184, 166, 0.3),
      rgba(59, 130, 246, 0.3)
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: -1;
  }

  /* Icon glow container */
  .icon-glow-container {
    /* Layout */
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 2rem;
  }

  /* Color-shifting aurora glow behind icon - Base layer (Orange) */
  .icon-glow-container::before {
    content: '';
    position: absolute;
    inset: -80px;
    z-index: 0;
    pointer-events: none;

    /* Orange glow layer */
    background:
      radial-gradient(
        circle at center,
        rgba(249, 115, 22, 0.35) 0%,
        rgba(249, 115, 22, 0.25) 20%,
        rgba(249, 115, 22, 0.17) 35%,
        rgba(249, 115, 22, 0.1) 45%,
        rgba(249, 115, 22, 0.05) 55%,
        transparent 70%
      );

    /* Smooth blur effect */
    filter: blur(70px);

    /* Color-shifting animation - cycles through aurora colors */
    animation: icon-color-shift 36s ease-in-out infinite;
  }

  /* Additional color layers using ::after for smooth color transitions */
  .icon-glow-container::after {
    content: '';
    position: absolute;
    inset: -80px;
    z-index: 0;
    pointer-events: none;

    /* Multi-color glow layers - will fade in/out */
    background:
      /* Teal glow */
      radial-gradient(
        circle at 55% 45%,
        rgba(20, 184, 166, 0.35) 0%,
        rgba(20, 184, 166, 0.25) 20%,
        rgba(20, 184, 166, 0.17) 35%,
        rgba(20, 184, 166, 0.1) 45%,
        transparent 65%
      ),
      /* Purple glow */
      radial-gradient(
        circle at 45% 55%,
        rgba(168, 85, 247, 0.35) 0%,
        rgba(168, 85, 247, 0.25) 20%,
        rgba(168, 85, 247, 0.17) 35%,
        rgba(168, 85, 247, 0.1) 45%,
        transparent 65%
      ),
      /* Blue glow */
      radial-gradient(
        circle at center,
        rgba(59, 130, 246, 0.35) 0%,
        rgba(59, 130, 246, 0.25) 20%,
        rgba(59, 130, 246, 0.17) 35%,
        rgba(59, 130, 246, 0.1) 45%,
        transparent 65%
      );

    /* Smooth blur effect */
    filter: blur(70px);

    /* Complementary color-shifting animation - offset timing */
    animation: icon-color-shift-alt 36s ease-in-out infinite;
    animation-delay: -18s; /* Start halfway through cycle */
  }

  /* Keyframes for main color layer - fades between visible and subtle */
  @keyframes icon-color-shift {
    0% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    25% {
      opacity: 0.3;
      transform: scale(1.05) rotate(5deg);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.02) rotate(-3deg);
    }
    75% {
      opacity: 0.4;
      transform: scale(1.08) rotate(2deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }

  /* Keyframes for alternate color layers - opposite phase */
  @keyframes icon-color-shift-alt {
    0% {
      opacity: 0.4;
      transform: scale(1.05) rotate(0deg);
    }
    25% {
      opacity: 1;
      transform: scale(1) rotate(-4deg);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.06) rotate(3deg);
    }
    75% {
      opacity: 0.8;
      transform: scale(1.02) rotate(-2deg);
    }
    100% {
      opacity: 0.4;
      transform: scale(1.05) rotate(0deg);
    }
  }

  /* App icon */
  .app-icon {
    /* Size */
    width: 120px;
    height: 120px;

    /* Position above glow */
    position: relative;
    z-index: 1;

    /* Center */
    display: block;

    /* Effect */
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  }

  /* App subtitle */
  .app-subtitle {
    /* Typography */
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--text-secondary);
    font-family: var(--font-body);
    line-height: 1.4;

    /* Reset */
    margin: 0;
  }
</style>

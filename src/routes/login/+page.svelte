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
    <div class="w-full max-w-[320px] sm:max-w-[360px]">
      <!-- Logo/Title -->
      <div class="mb-10 text-center sm:mb-12">
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

    /* Aurora gradients - OKLCH color space for perceptually smooth transitions */
    background:
      /* Primary orange orb - top left */
      radial-gradient(
        ellipse 60vw 50vh at 15% 25% in oklch,
        oklch(0.68 0.19 35 / 0.12) 0%,
        oklch(0.66 0.17 35 / 0.105) 10%,
        oklch(0.64 0.15 35 / 0.09) 18%,
        oklch(0.61 0.13 35 / 0.075) 25%,
        oklch(0.58 0.11 35 / 0.06) 32%,
        oklch(0.55 0.09 35 / 0.05) 37%,
        oklch(0.52 0.07 35 / 0.04) 42%,
        oklch(0.50 0.05 35 / 0.03) 47%,
        oklch(0.48 0.03 35 / 0.02) 52%,
        oklch(0.46 0.015 35 / 0.01) 60%,
        oklch(0.45 0.001 35 / 0) 75%
      ),
      /* Teal orb - top right */
      radial-gradient(
        ellipse 55vw 55vh at 85% 55% in oklch,
        oklch(0.70 0.13 190 / 0.09) 0%,
        oklch(0.68 0.115 190 / 0.079) 10%,
        oklch(0.66 0.10 190 / 0.068) 18%,
        oklch(0.63 0.085 190 / 0.057) 25%,
        oklch(0.60 0.07 190 / 0.045) 32%,
        oklch(0.57 0.055 190 / 0.0375) 37%,
        oklch(0.54 0.04 190 / 0.03) 42%,
        oklch(0.51 0.03 190 / 0.0225) 47%,
        oklch(0.48 0.02 190 / 0.015) 52%,
        oklch(0.46 0.01 190 / 0.008) 60%,
        oklch(0.45 0.001 190 / 0) 75%
      ),
      /* Blue orb - bottom center */
      radial-gradient(
        ellipse 50vw 45vh at 50% 75% in oklch,
        oklch(0.62 0.22 250 / 0.07) 0%,
        oklch(0.60 0.19 250 / 0.062) 10%,
        oklch(0.58 0.17 250 / 0.053) 18%,
        oklch(0.56 0.145 250 / 0.044) 25%,
        oklch(0.54 0.12 250 / 0.035) 32%,
        oklch(0.52 0.095 250 / 0.029) 37%,
        oklch(0.50 0.07 250 / 0.023) 42%,
        oklch(0.48 0.05 250 / 0.0175) 47%,
        oklch(0.46 0.03 250 / 0.012) 52%,
        oklch(0.45 0.015 250 / 0.006) 60%,
        oklch(0.44 0.001 250 / 0) 75%
      ),
      /* Secondary orange orb - bottom left for depth */
      radial-gradient(
        ellipse 45vw 40vh at 30% 70% in oklch,
        oklch(0.68 0.19 35 / 0.06) 0%,
        oklch(0.66 0.17 35 / 0.0525) 10%,
        oklch(0.64 0.15 35 / 0.045) 18%,
        oklch(0.61 0.13 35 / 0.0375) 25%,
        oklch(0.58 0.11 35 / 0.03) 32%,
        oklch(0.55 0.09 35 / 0.025) 37%,
        oklch(0.52 0.07 35 / 0.02) 42%,
        oklch(0.50 0.05 35 / 0.015) 47%,
        oklch(0.48 0.03 35 / 0.01) 52%,
        oklch(0.46 0.015 35 / 0.005) 60%,
        oklch(0.45 0.001 35 / 0) 75%
      );

    /* Blur for smooth effect */
    filter: blur(120px);

    /* Slow, subtle animation */
    animation: aurora-drift 20s ease-in-out infinite alternate;
  }

  @keyframes aurora-drift {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    33% {
      transform: translate(3%, -2%) scale(1.05);
      opacity: 0.9;
    }
    66% {
      transform: translate(-2%, 3%) scale(0.98);
      opacity: 0.95;
    }
    100% {
      transform: translate(2%, -1%) scale(1.02);
      opacity: 1;
    }
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

  /* Icon glow container */
  .icon-glow-container {
    /* Layout */
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 2rem;
  }

  /* Aurora glow behind icon */
  .icon-glow-container::before {
    content: '';
    position: absolute;
    inset: -80px;
    z-index: 0;
    pointer-events: none;

    /* Orange aurora glow */
    background:
      /* Primary orange glow */
      radial-gradient(
        circle at center,
        rgba(249, 115, 22, 0.3) 0%,
        rgba(249, 115, 22, 0.22) 20%,
        rgba(249, 115, 22, 0.15) 35%,
        rgba(249, 115, 22, 0.1) 45%,
        rgba(249, 115, 22, 0.05) 55%,
        transparent 70%
      ),
      /* Warmer orange accent */
      radial-gradient(
        circle at 60% 40%,
        rgba(251, 146, 60, 0.2) 0%,
        rgba(251, 146, 60, 0.12) 25%,
        rgba(251, 146, 60, 0.06) 40%,
        transparent 60%
      ),
      /* Deeper orange accent */
      radial-gradient(
        circle at 40% 60%,
        rgba(234, 88, 12, 0.18) 0%,
        rgba(234, 88, 12, 0.1) 25%,
        rgba(234, 88, 12, 0.05) 40%,
        transparent 60%
      );

    /* Smooth blur effect */
    filter: blur(60px);

    /* Subtle pulsing animation */
    animation: icon-aurora-pulse 8s ease-in-out infinite alternate;
  }

  @keyframes icon-aurora-pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.08) rotate(5deg);
      opacity: 0.85;
    }
    100% {
      transform: scale(1.05) rotate(-3deg);
      opacity: 0.95;
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

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

    /* Aurora gradients - same as desktop main screen */
    background:
      /* Primary orange orb - top left */
      radial-gradient(
        ellipse 60vw 50vh at 15% 25%,
        rgba(249, 115, 22, 0.20) 0%,
        rgba(249, 115, 22, 0.15) 18%,
        rgba(249, 115, 22, 0.10) 32%,
        rgba(249, 115, 22, 0.067) 42%,
        rgba(249, 115, 22, 0.033) 52%,
        rgba(249, 115, 22, 0.017) 60%,
        transparent 75%
      ),
      /* Teal orb - bottom right */
      radial-gradient(
        ellipse 55vw 55vh at 85% 80%,
        rgba(20, 184, 166, 0.17) 0%,
        rgba(20, 184, 166, 0.128) 18%,
        rgba(20, 184, 166, 0.085) 32%,
        rgba(20, 184, 166, 0.057) 42%,
        rgba(20, 184, 166, 0.028) 52%,
        rgba(20, 184, 166, 0.015) 60%,
        transparent 75%
      ),
      /* Purple orb - upper right */
      radial-gradient(
        ellipse 50vw 45vh at 60% 35%,
        rgba(168, 85, 247, 0.18) 0%,
        rgba(168, 85, 247, 0.137) 18%,
        rgba(168, 85, 247, 0.09) 32%,
        rgba(168, 85, 247, 0.059) 42%,
        rgba(168, 85, 247, 0.032) 52%,
        rgba(168, 85, 247, 0.015) 60%,
        transparent 75%
      ),
      /* Blue orb - lower left */
      radial-gradient(
        ellipse 45vw 40vh at 35% 75%,
        rgba(59, 130, 246, 0.17) 0%,
        rgba(59, 130, 246, 0.128) 18%,
        rgba(59, 130, 246, 0.085) 32%,
        rgba(59, 130, 246, 0.057) 42%,
        rgba(59, 130, 246, 0.029) 52%,
        rgba(59, 130, 246, 0.014) 60%,
        transparent 75%
      );

    /* Increased blur for extremely smooth effect */
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

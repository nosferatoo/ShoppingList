<script lang="ts">
  import { goto } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/db/supabase';
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
  <div class="login-card">
    <!-- Logo/Title -->
    <div class="logo">
      <h1>🛒 Lists</h1>
    </div>

    <!-- Login Form -->
    <form onsubmit={handleSubmit} class="login-form">
      <!-- Email Input -->
      <div class="input-group">
        <label for="email" class="sr-only">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Email"
          bind:value={email}
          disabled={isLoading}
          autocomplete="email"
          class="input"
          class:error={error}
        />
      </div>

      <!-- Password Input -->
      <div class="input-group">
        <label for="password" class="sr-only">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          bind:value={password}
          disabled={isLoading}
          autocomplete="current-password"
          class="input"
          class:error={error}
        />
      </div>

      <!-- Error Message -->
      {#if error}
        <div class="error-message" role="alert">
          {error}
        </div>
      {/if}

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        class="submit-button"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>

<style>
  /* Container - centered layout */
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    background-color: var(--bg-primary);
  }

  /* Card wrapper */
  .login-card {
    width: 100%;
    max-width: 320px;
  }

  /* Logo/Title */
  .logo {
    text-align: center;
    margin-bottom: var(--space-10);
  }

  .logo h1 {
    font-family: var(--font-heading);
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--text-primary);
    margin: 0;
    line-height: var(--leading-tight);
  }

  /* Form */
  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Input group */
  .input-group {
    display: flex;
    flex-direction: column;
  }

  /* Screen reader only label */
  .sr-only {
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

  /* Input field */
  .input {
    height: 44px;
    width: 100%;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 0 var(--space-3);
    font-family: var(--font-body);
    font-size: var(--text-base);
    color: var(--text-primary);
    transition: border-color var(--transition-fast);
  }

  .input::placeholder {
    color: var(--text-muted);
  }

  .input:focus {
    outline: none;
    border-color: var(--border-focus);
  }

  .input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Error state for inputs */
  .input.error {
    border-color: var(--error);
  }

  /* Error message */
  .error-message {
    padding: var(--space-3);
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    border-radius: var(--radius-md);
    color: var(--error);
    font-size: var(--text-sm);
    text-align: center;
  }

  /* Submit button */
  .submit-button {
    width: 100%;
    height: 48px;
    background-color: var(--accent-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    cursor: pointer;
    transition: background-color var(--transition-fast);
    margin-top: var(--space-2);
  }

  .submit-button:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  .submit-button:active:not(:disabled) {
    background-color: var(--accent-muted);
  }

  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* Mobile optimization */
  @media (max-width: 640px) {
    .login-container {
      padding: var(--space-6) var(--space-4);
    }

    .logo {
      margin-bottom: var(--space-12);
    }
  }

  /* Tablet and up */
  @media (min-width: 640px) {
    .login-card {
      max-width: 360px;
    }
  }
</style>

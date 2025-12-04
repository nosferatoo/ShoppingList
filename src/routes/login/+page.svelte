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

<div class="flex min-h-screen items-center justify-center p-4 bg-background">
  <div class="w-full max-w-[320px] sm:max-w-[360px]">
    <!-- Logo/Title -->
    <div class="mb-10 text-center sm:mb-12">
      <h1 class="text-2xl font-bold text-foreground font-heading m-0">
        🛒 Lists
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
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
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
</style>

// Supabase client context for sharing properly-configured client
// Ensures all components use the client from +layout.ts with SvelteKit's fetch

import { getContext, setContext } from 'svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types';

const SUPABASE_KEY = Symbol('supabase');

/**
 * Set the Supabase client in Svelte context
 * Should be called once in root +layout.svelte
 */
export function setSupabaseContext(client: SupabaseClient<Database>) {
  setContext(SUPABASE_KEY, client);
}

/**
 * Get the Supabase client from Svelte context
 * Returns the properly-configured client from +layout.ts
 */
export function getSupabaseContext(): SupabaseClient<Database> {
  return getContext(SUPABASE_KEY);
}

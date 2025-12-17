// Root layout load - sets up Supabase client for browser
// Creates browser client and syncs session state

import { createSupabaseBrowserClient } from '$lib/db/supabase';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  // Create Supabase browser client with SvelteKit's fetch for proper SSR
  const supabase = createSupabaseBrowserClient(fetch);

  // Tell SvelteKit to rerun this when invalidate('supabase:auth') is called
  depends('supabase:auth');

  // Get authenticated user from server (more secure than getSession)
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Get session data (for tokens, etc.)
  const {
    data: { session }
  } = await supabase.auth.getSession();

  // If we have a session but user verification failed, clear the session
  const validSession = user ? session : null;

  return {
    supabase,
    session: validSession ?? data.session
  };
};

// SvelteKit hooks for Supabase authentication
// Handles server-side session management and makes supabase client available in locals

import { createSupabaseServerClient } from '$lib/db/supabase';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Create Supabase client with cookie handling
  event.locals.supabase = createSupabaseServerClient(event.cookies);

  // Get user from Supabase (validates session with auth server)
  const {
    data: { user }
  } = await event.locals.supabase.auth.getUser();

  // Get session separately (for session data like access tokens)
  const {
    data: { session }
  } = await event.locals.supabase.auth.getSession();

  event.locals.session = session;
  event.locals.user = user;

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      // Allow Set-Cookie headers to be sent
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};

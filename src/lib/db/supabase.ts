// Supabase client setup for SvelteKit SSR
// Uses @supabase/ssr for proper server-side rendering and cookie handling

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types';

/**
 * Creates a Supabase client for browser-side usage
 * Automatically handles cookie management in the browser
 *
 * @param customFetch - Optional custom fetch function (e.g., SvelteKit's fetch in load functions)
 */
export function createSupabaseBrowserClient(customFetch?: typeof fetch) {
  return createBrowserClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    customFetch
      ? {
          global: {
            fetch: customFetch
          }
        }
      : undefined
  );
}

/**
 * Creates a Supabase client for server-side usage
 * Requires cookies object from SvelteKit's load functions or server endpoints
 *
 * @example
 * ```ts
 * // In +layout.server.ts
 * export const load = async ({ cookies }) => {
 *   const supabase = createSupabaseServerClient(cookies);
 *   const { data: { session } } = await supabase.auth.getSession();
 *   return { session };
 * };
 * ```
 */
export function createSupabaseServerClient(
  cookies: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options: any) => void;
    delete: (name: string, options: any) => void;
  }
) {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(key) {
        return cookies.get(key);
      },
      set(key, value, options) {
        cookies.set(key, value, {
          ...options,
          path: '/',
          sameSite: 'lax',
          httpOnly: false, // Must be false for client-side access
          secure: true
        });
      },
      remove(key, options) {
        cookies.delete(key, {
          ...options,
          path: '/'
        });
      }
    }
  });
}

/**
 * @deprecated DEPRECATED: Do not use this export. Use createSupabaseBrowserClient() with fetch parameter instead.
 *
 * This legacy export creates a client without SvelteKit's custom fetch, causing warnings about window.fetch usage.
 *
 * Instead of:
 *   import { supabase } from '$lib/db/supabase';
 *
 * Use:
 *   import { getSupabaseContext } from '$lib/db/supabase.context.svelte';
 *   const supabase = getSupabaseContext();
 *
 * Or if you're in a load function:
 *   const supabase = createSupabaseBrowserClient(fetch);
 */
// export const supabase = isBrowser()
//   ? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
//   : undefined as any;

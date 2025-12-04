// Supabase client setup for SvelteKit SSR
// Uses @supabase/ssr for proper server-side rendering and cookie handling

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types';

/**
 * Creates a Supabase client for browser-side usage
 * Automatically handles cookie management in the browser
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
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
 * Legacy export for backwards compatibility
 * Creates appropriate client based on environment (browser vs server)
 *
 * @deprecated Use createSupabaseBrowserClient() or createSupabaseServerClient() instead
 */
export const supabase = isBrowser()
  ? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
  : undefined as any; // Server-side should use createSupabaseServerClient with cookies

// Edit lists page server load - requires authentication and fetches lists
// Redirects to /login if user is not authenticated

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { ListWithItems } from '$lib/types';

export const load: PageServerLoad = async ({ locals: { session, supabase, user } }) => {
  // If no session, redirect to login page
  if (!session || !user) {
    throw redirect(303, '/login');
  }

  try {
    // Call Supabase function to get all user's lists
    const { data, error } = await supabase.rpc('get_user_lists_with_items');

    if (error) {
      console.error('Error fetching lists:', error);
      return {
        userId: user.id,
        lists: []
      };
    }

    // Parse the JSON response
    const lists: ListWithItems[] = data || [];

    return {
      userId: user.id,
      lists
    };
  } catch (err) {
    console.error('Unexpected error fetching lists:', err);
    return {
      userId: user.id,
      lists: []
    };
  }
};

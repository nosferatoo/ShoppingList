// Main page server load - requires authentication and fetches lists with items
// Redirects to /login if user is not authenticated

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { ListWithItems } from '$lib/types';

export const load: PageServerLoad = async ({ locals: { session, supabase, user } }) => {
  // If no session or user, redirect to login page
  if (!session || !user) {
    throw redirect(303, '/login');
  }

  try {
    // Call Supabase function to get all user's lists with items
    const { data, error } = await supabase.rpc('get_user_lists_with_items');

    if (error) {
      console.error('Error fetching lists:', error);
      return {
        lists: []
      };
    }

    // Parse the JSON response
    const lists: ListWithItems[] = (data as unknown as ListWithItems[]) || [];

    return {
      lists
    };
  } catch (err) {
    console.error('Unexpected error fetching lists:', err);
    return {
      lists: []
    };
  }
};

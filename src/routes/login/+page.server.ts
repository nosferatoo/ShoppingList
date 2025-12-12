// Login page server load - redirects authenticated users
// If user is already logged in, redirect them to main page

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { session } }) => {
  // If user already has a session, redirect to main page
  if (session) {
    throw redirect(303, '/');
  }

  // User is not authenticated, allow access to login page
  return {};
};

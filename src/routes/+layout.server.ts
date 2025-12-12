// Root layout server load - handles session management
// Session is made available to all pages via $page.data.session

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session } }) => {
  return {
    session
  };
};

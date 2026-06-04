import { redirect } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import type { ListWithItems } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	try {
		const lists = await withUser(locals.user.id, async (tx) => {
			const [row] = await tx`SELECT get_user_lists_with_items() AS data`;
			return row.data;
		});

		return { lists: (lists as ListWithItems[]) || [] };
	} catch (err) {
		console.error('Error fetching lists:', err);
		return { lists: [] };
	}
};

import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401);

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`SELECT get_orphaned_ingredients() AS data`;
		return row.data;
	});

	return json(result);
};

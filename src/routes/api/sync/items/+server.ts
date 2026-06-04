import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const { p_items } = await request.json();

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`SELECT sync_items(${JSON.stringify(p_items)}::json) AS data`;
		return row.data;
	});

	return json(result);
};

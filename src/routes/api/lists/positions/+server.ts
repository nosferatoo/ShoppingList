import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const { p_positions } = await request.json();

	await withUser(locals.user.id, async (tx) => {
		await tx`SELECT save_list_positions(${JSON.stringify(p_positions)}::json)`;
	});

	return json({ success: true });
};

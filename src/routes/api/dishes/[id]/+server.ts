import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();
	const id = Number(params.id);

	await withUser(locals.user.id, async (tx) => {
		await tx`UPDATE dishes SET ${tx(body)} WHERE id = ${id}`;
	});

	return json({ success: true });
};

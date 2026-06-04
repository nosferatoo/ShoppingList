import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			INSERT INTO lists (title, type, owner_id, is_shared, is_food)
			VALUES (${body.title}, ${body.type}, ${body.owner_id}, ${body.is_shared ?? false}, ${body.is_food ?? false})
			RETURNING *
		`;
		return row;
	});

	return json(result);
};

import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();
	const dishId = Number(params.id);

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			INSERT INTO dish_ingredients (dish_id, item_id, item_text)
			VALUES (${dishId}, ${body.item_id}, ${body.item_text})
			RETURNING *
		`;
		return row;
	});

	return json(result);
};

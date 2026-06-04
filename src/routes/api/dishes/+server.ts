import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401);

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`SELECT get_dishes_with_ingredients() AS data`;
		return row.data;
	});

	return json(result);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			INSERT INTO dishes (name, link, owner_id)
			VALUES (${body.name}, ${body.link ?? null}, ${body.owner_id})
			RETURNING *
		`;
		return row;
	});

	return json(result);
};

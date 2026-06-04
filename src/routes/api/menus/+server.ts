import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) throw error(401);

	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	if (!from || !to) throw error(400, 'Missing from/to parameters');

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`SELECT get_menus_with_dishes(${from}::date, ${to}::date) AS data`;
		return row.data;
	});

	return json(result);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			INSERT INTO menus (planned_date, dish_id, dish_name)
			VALUES (${body.planned_date}, ${body.dish_id}, ${body.dish_name})
			RETURNING *
		`;
		return row;
	});

	return json(result);
};

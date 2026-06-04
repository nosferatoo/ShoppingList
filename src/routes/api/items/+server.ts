import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			INSERT INTO items (list_id, text, is_checked)
			VALUES (${body.list_id}, ${body.text}, ${body.is_checked ?? false})
			RETURNING *
		`;
		return row;
	});

	return json(result);
};

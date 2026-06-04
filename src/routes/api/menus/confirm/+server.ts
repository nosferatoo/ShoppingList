import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const { p_menu_ids, p_excluded_item_ids } = await request.json();

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			SELECT confirm_menu_and_update_quantities(
				${JSON.stringify(p_menu_ids)}::json,
				${JSON.stringify(p_excluded_item_ids)}::json
			) AS data
		`;
		return row.data;
	});

	return json(result);
};

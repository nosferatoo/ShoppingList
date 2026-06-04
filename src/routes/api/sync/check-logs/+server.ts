import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const logs = await request.json();

	await withUser(locals.user.id, async (tx) => {
		for (const log of logs) {
			await tx`
				INSERT INTO item_check_logs (user_id, list_name, item_name, checked_at, list_id, item_id)
				VALUES (${log.user_id}, ${log.list_name}, ${log.item_name}, ${log.checked_at}, ${log.list_id}, ${log.item_id})
			`;
		}
	});

	return json({ success: true });
};

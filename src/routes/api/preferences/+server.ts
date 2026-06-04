import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401);

	const result = await withUser(locals.user.id, async (tx) => {
		const [row] = await tx`
			SELECT theme_color FROM user_preferences WHERE user_id = auth.uid()
		`;
		return row ?? null;
	});

	return json(result);
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();

	await withUser(locals.user.id, async (tx) => {
		await tx`
			INSERT INTO user_preferences (user_id, theme_color, updated_at)
			VALUES (auth.uid(), ${body.theme_color}, ${new Date().toISOString()})
			ON CONFLICT (user_id) DO UPDATE SET
				theme_color = ${body.theme_color},
				updated_at = ${new Date().toISOString()}
		`;
	});

	return json({ success: true });
};

import { json, error } from '@sveltejs/kit';
import { withUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.user) throw error(401);

	const body = await request.json();
	const ingredientId = Number(params.ingredientId);

	await withUser(locals.user.id, async (tx) => {
		await tx`UPDATE dish_ingredients SET ${tx(body)} WHERE id = ${ingredientId}`;
	});

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) throw error(401);

	const ingredientId = Number(params.ingredientId);

	await withUser(locals.user.id, async (tx) => {
		await tx`DELETE FROM dish_ingredients WHERE id = ${ingredientId}`;
	});

	return json({ success: true });
};

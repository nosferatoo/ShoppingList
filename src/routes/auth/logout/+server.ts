import { json } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies);
	return json({ redirect: '/login' });
};

import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth/password';
import { createSessionCookie } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		throw error(400, 'Email and password are required');
	}

	const [user] = await sql`
		SELECT id, email, password_hash FROM auth.users WHERE email = ${email}
	`;

	if (!user) {
		throw error(401, 'Invalid credentials');
	}

	const valid = await verifyPassword(password, user.password_hash);
	if (!valid) {
		throw error(401, 'Invalid credentials');
	}

	await createSessionCookie(cookies, { id: user.id, email: user.email });

	return json({ redirect: '/' });
};

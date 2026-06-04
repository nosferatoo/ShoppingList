import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

function getSecret() {
	return new TextEncoder().encode(env.SESSION_SECRET);
}
const COOKIE_NAME = 'session';
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function createSessionCookie(
	cookies: Cookies,
	user: { id: string; email: string }
): Promise<void> {
	const token = await new SignJWT({ sub: user.id, email: user.email })
		.setProtectedHeader({ alg: 'HS256' })
		.setExpirationTime(`${THIRTY_DAYS}s`)
		.setIssuedAt()
		.sign(getSecret());

	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: THIRTY_DAYS
	});
}

export async function verifySession(
	cookies: Cookies
): Promise<{ id: string; email: string } | null> {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return null;

	try {
		const { payload } = await jwtVerify(token, getSecret());
		if (!payload.sub || !payload.email) return null;
		return { id: payload.sub, email: payload.email as string };
	} catch {
		return null;
	}
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

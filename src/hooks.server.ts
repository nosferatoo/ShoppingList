import { verifySession } from '$lib/server/auth/session';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (pathname === '/healthz' || pathname.startsWith('/auth/')) {
		event.locals.user = null;
		return resolve(event);
	}

	event.locals.user = await verifySession(event.cookies);

	return resolve(event);
};

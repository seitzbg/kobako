import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSessionToken } from '$lib/server/auth/session';
import { setSessionCookie, deleteSessionCookie } from '$lib/server/auth/cookies';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await validateSessionToken(token);
	if (session) {
		setSessionCookie(event.cookies, token, session.expiresAt); // refresh sliding expiry
	} else {
		deleteSessionCookie(event.cookies);
	}
	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

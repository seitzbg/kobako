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

	let result: Awaited<ReturnType<typeof validateSessionToken>>;
	try {
		result = await validateSessionToken(token);
	} catch (err) {
		// A transient DB error must not 500 every request. Degrade to logged-out
		// but keep the cookie, so the user is logged back in once the DB recovers.
		console.error('[hooks] session validation failed; degrading to logged-out', err);
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = result;
	if (session) {
		setSessionCookie(event.cookies, token, session.expiresAt); // refresh sliding expiry
	} else {
		deleteSessionCookie(event.cookies);
	}
	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

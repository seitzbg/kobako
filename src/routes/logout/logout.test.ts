import { describe, it, expect } from 'vitest';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { isRedirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { sessions } from '$lib/server/db/schema';
import { createUser } from '$lib/server/auth/user';
import { generateSessionToken, createSession, SESSION_COOKIE } from '$lib/server/auth/session';
import { actions } from './+page.server';

function fakeCookies() {
	const store: Record<string, unknown> = {};
	return {
		store,
		set: (name: string, value: string, opts: unknown) => (store[name] = { value, opts }),
		delete: (name: string) => (store[name] = { deleted: true })
	} as unknown as Cookies & { store: Record<string, unknown> };
}

function buildEvent(
	locals: RequestEvent<Record<string, never>, '/logout'>['locals'],
	cookies: Cookies
): RequestEvent<Record<string, never>, '/logout'> {
	return {
		locals,
		cookies
	} as unknown as RequestEvent<Record<string, never>, '/logout'>;
}

describe('POST /logout', () => {
	it('invalidates the session, deletes the cookie, and redirects to /login', async () => {
		const username = `user_${Date.now()}_logout`;
		const user = await createUser(username, 'hunter2hunter2');
		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		const cookies = fakeCookies();

		let caught: unknown;
		try {
			await actions.default(buildEvent({ session, user }, cookies));
		} catch (e) {
			caught = e;
		}

		if (!isRedirect(caught)) throw new Error('expected a redirect to be thrown');
		expect(caught.status).toBe(303);
		expect(caught.location).toBe('/login');

		const rows = await db.select().from(sessions).where(eq(sessions.id, session.id));
		expect(rows).toHaveLength(0);

		expect(cookies.store[SESSION_COOKIE]).toEqual({ deleted: true });
	});
});

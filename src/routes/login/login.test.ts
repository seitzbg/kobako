import { describe, it, expect } from 'vitest';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { isRedirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { sessions } from '$lib/server/db/schema';
import { createUser } from '$lib/server/auth/user';
import { SESSION_COOKIE } from '$lib/server/auth/session';
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
	formData: FormData,
	cookies: Cookies,
	address = `ip_${Date.now()}_${Math.random().toString(36).slice(2)}`
): RequestEvent<Record<string, never>, '/login'> {
	return {
		request: new Request('http://localhost/login', { method: 'POST', body: formData }),
		cookies,
		getClientAddress: () => address
	} as unknown as RequestEvent<Record<string, never>, '/login'>;
}

function buildForm(fields: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) formData.set(key, value);
	return formData;
}

describe('POST /login', () => {
	it('logs in with correct credentials, sets a session cookie, and redirects to /', async () => {
		const username = `user_${Date.now()}`;
		const user = await createUser(username, 'hunter2hunter2');
		const cookies = fakeCookies();
		const formData = buildForm({ username, password: 'hunter2hunter2' });

		let caught: unknown;
		try {
			await actions.default(buildEvent(formData, cookies));
		} catch (e) {
			caught = e;
		}

		if (!isRedirect(caught)) throw new Error('expected a redirect to be thrown');
		expect(caught.status).toBe(303);
		expect(caught.location).toBe('/');

		expect(cookies.store[SESSION_COOKIE]).toBeDefined();

		const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));
		expect(rows).toHaveLength(1);
	});

	it('rejects an incorrect password without setting a cookie', async () => {
		const username = `user_${Date.now()}_wrongpw`;
		const user = await createUser(username, 'hunter2hunter2');
		const cookies = fakeCookies();
		const formData = buildForm({ username, password: 'wrong-password' });

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		expect(cookies.store[SESSION_COOKIE]).toBeUndefined();

		const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));
		expect(rows).toHaveLength(0);
	});

	it('rejects an unknown username', async () => {
		const cookies = fakeCookies();
		const formData = buildForm({
			username: `nonexistent_${Date.now()}`,
			password: 'hunter2hunter2'
		});

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		// No cookie is set — the action returns fail(400) before any session is
		// created, so an unknown username never establishes a session. (A global
		// session-count assertion here would race other test files on the shared DB.)
		expect(cookies.store[SESSION_COOKIE]).toBeUndefined();
	});

	it('returns 429 after too many attempts from one address', async () => {
		const address = `rl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		let last: unknown;
		for (let i = 0; i < 11; i++) {
			const form = buildForm({ username: `nobody_${Date.now()}_${i}`, password: 'whatever12' });
			last = await actions.default(buildEvent(form, fakeCookies(), address));
		}
		expect((last as { status: number }).status).toBe(429);
	});
});

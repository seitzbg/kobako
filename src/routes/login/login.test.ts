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
	cookies: Cookies
): RequestEvent<Record<string, never>, '/login'> {
	return {
		request: new Request('http://localhost/login', { method: 'POST', body: formData }),
		cookies
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
		await createUser(username, 'hunter2hunter2');
		const cookies = fakeCookies();
		const formData = buildForm({ username, password: 'wrong-password' });

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		expect(cookies.store[SESSION_COOKIE]).toBeUndefined();
	});

	it('rejects an unknown username', async () => {
		const cookies = fakeCookies();
		const formData = buildForm({
			username: `nonexistent_${Date.now()}`,
			password: 'hunter2hunter2'
		});

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		expect(cookies.store[SESSION_COOKIE]).toBeUndefined();
	});
});

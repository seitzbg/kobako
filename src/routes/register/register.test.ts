import { describe, it, expect } from 'vitest';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { isRedirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, invites } from '$lib/server/db/schema';
import { createInvite } from '$lib/server/auth/invite';
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
): RequestEvent<Record<string, never>, '/register'> {
	return {
		request: new Request('http://localhost/register', { method: 'POST', body: formData }),
		cookies,
		getClientAddress: () => address
	} as unknown as RequestEvent<Record<string, never>, '/register'>;
}

function buildForm(fields: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) formData.set(key, value);
	return formData;
}

describe('POST /register', () => {
	it('registers a user with a valid invite, sets a session cookie, and redirects to /', async () => {
		const invite = await createInvite(null);
		const username = `user_${Date.now()}`;
		const cookies = fakeCookies();
		const formData = buildForm({ invite: invite.token, username, password: 'hunter2hunter2' });

		let caught: unknown;
		try {
			await actions.default(buildEvent(formData, cookies));
		} catch (e) {
			caught = e;
		}

		if (!isRedirect(caught)) throw new Error('expected a redirect to be thrown');
		expect(caught.status).toBe(303);
		expect(caught.location).toBe('/');

		const [user] = await db.select().from(users).where(eq(users.username, username));
		expect(user).toBeDefined();

		expect(cookies.store[SESSION_COOKIE]).toBeDefined();

		const [usedInvite] = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(usedInvite.usedAt).not.toBeNull();
	});

	it('rejects reuse of an already-used invite and does not create a second user', async () => {
		const invite = await createInvite(null);
		const firstUsername = `user_${Date.now()}_a`;
		const firstCookies = fakeCookies();
		const firstForm = buildForm({
			invite: invite.token,
			username: firstUsername,
			password: 'hunter2hunter2'
		});

		try {
			await actions.default(buildEvent(firstForm, firstCookies));
		} catch (e) {
			if (!isRedirect(e)) throw e;
		}

		const secondUsername = `user_${Date.now()}_b`;
		const secondCookies = fakeCookies();
		const secondForm = buildForm({
			invite: invite.token,
			username: secondUsername,
			password: 'hunter2hunter2'
		});

		const result = await actions.default(buildEvent(secondForm, secondCookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		const rows = await db.select().from(users).where(eq(users.username, secondUsername));
		expect(rows).toHaveLength(0);
	});

	it('rejects a too-short username without creating a user', async () => {
		const invite = await createInvite(null);
		const username = 'ab';
		const cookies = fakeCookies();
		const formData = buildForm({ invite: invite.token, username, password: 'hunter2hunter2' });

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		const rows = await db.select().from(users).where(eq(users.username, username));
		expect(rows).toHaveLength(0);
	});

	it('rejects a too-short password without creating a user', async () => {
		const invite = await createInvite(null);
		const username = `user_${Date.now()}_shortpw`;
		const cookies = fakeCookies();
		const formData = buildForm({ invite: invite.token, username, password: 'short' });

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		const rows = await db.select().from(users).where(eq(users.username, username));
		expect(rows).toHaveLength(0);
	});

	it('does not burn the invite when registration fails on a duplicate username', async () => {
		const uname = `dup_${Date.now()}`;
		await createUser(uname, 'hunter2hunter2');

		const invite = await createInvite(null);
		const cookies = fakeCookies();
		const formData = buildForm({
			invite: invite.token,
			username: uname,
			password: 'hunter2hunter2'
		});

		const result = await actions.default(buildEvent(formData, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);

		const freshUsername = `user_${Date.now()}_retry`;
		const retryCookies = fakeCookies();
		const retryForm = buildForm({
			invite: invite.token,
			username: freshUsername,
			password: 'hunter2hunter2'
		});

		let caught: unknown;
		try {
			await actions.default(buildEvent(retryForm, retryCookies));
		} catch (e) {
			caught = e;
		}

		if (!isRedirect(caught)) throw new Error('expected a redirect to be thrown');
		expect(caught.status).toBe(303);
		expect(caught.location).toBe('/');

		const [user] = await db.select().from(users).where(eq(users.username, freshUsername));
		expect(user).toBeDefined();
	});

	it('returns 429 after too many attempts from one address', async () => {
		const address = `rl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		let last: unknown;
		for (let i = 0; i < 6; i++) {
			const form = buildForm({
				invite: 'bogus-token',
				username: `u_${Date.now()}_${i}`,
				password: 'hunter2hunter2'
			});
			last = await actions.default(buildEvent(form, fakeCookies(), address));
		}
		expect((last as { status: number }).status).toBe(429);
	});

	it('rejects a username that duplicates an existing one case-insensitively', async () => {
		const mixed = `Dupe_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		await createUser(mixed, 'hunter2hunter2'); // existing 'Dupe_...'
		const invite = await createInvite(null);
		const cookies = fakeCookies();
		const form = buildForm({
			invite: invite.token,
			username: mixed.toLowerCase(),
			password: 'hunter2hunter2'
		});

		const result = await actions.default(buildEvent(form, cookies));
		expect((result as { status: number } | undefined)?.status).toBe(400);
	});
});

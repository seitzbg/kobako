import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db/client';
import { users } from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { generateSessionToken, createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';
import { hit } from '$lib/server/rateLimit';

// A cached hash to verify against when the username is unknown, so response
// time does not reveal whether an account exists (username-enumeration guard).
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
	return (dummyHashPromise ??= hashPassword('kobako-timing-equalizer'));
}

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const rl = hit(`login:${getClientAddress()}`, 10, 15 * 60 * 1000);
		if (!rl.allowed) {
			const mins = Math.ceil(rl.retryAfterSec / 60);
			return fail(429, {
				error: `Too many attempts. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`
			});
		}

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		const [user] = await db
			.select()
			.from(users)
			.where(sql`lower(${users.username}) = lower(${username})`);
		const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);
		if (!user || !ok) return fail(400, { error: 'Invalid username or password.' });

		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		setSessionCookie(cookies, token, session.expiresAt);
		throw redirect(303, '/');
	}
};

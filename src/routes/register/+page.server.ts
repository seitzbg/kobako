import { fail, redirect } from '@sveltejs/kit';
import postgres from 'postgres';
import type { Actions } from './$types';
import { db } from '$lib/server/db/client';
import { consumeInvite } from '$lib/server/auth/invite';
import { createUser } from '$lib/server/auth/user';
import { generateSessionToken, createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';
import { hit } from '$lib/server/rateLimit';

class RegError extends Error {}

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const rl = hit(`register:${getClientAddress()}`, 5, 60 * 60 * 1000);
		if (!rl.allowed) {
			const mins = Math.ceil(rl.retryAfterSec / 60);
			return fail(429, {
				error: `Too many attempts. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`
			});
		}

		const form = await request.formData();
		const invite = String(form.get('invite') ?? '');
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (username.length < 3) return fail(400, { error: 'Username must be at least 3 characters.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });

		const token = generateSessionToken();
		let session;
		try {
			session = await db.transaction(async (tx) => {
				const usedInvite = await consumeInvite(invite, tx);
				if (!usedInvite) throw new RegError('invite');

				const user = await createUser(username, password, tx);
				return await createSession(token, user.id, tx);
			});
		} catch (err) {
			if (err instanceof RegError) return fail(400, { error: 'Invalid or already-used invite.' });
			// drizzle-orm wraps the driver error in a DrizzleQueryError, with the
			// original postgres error preserved on `.cause`.
			const pgError =
				err instanceof postgres.PostgresError
					? err
					: err instanceof Error && err.cause instanceof postgres.PostgresError
						? err.cause
						: undefined;
			if (pgError?.code === '23505') return fail(400, { error: 'That username is taken.' });
			throw err;
		}

		setSessionCookie(cookies, token, session.expiresAt);

		throw redirect(303, '/');
	}
};

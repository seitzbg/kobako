import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { consumeInvite } from '$lib/server/auth/invite';
import { createUser } from '$lib/server/auth/user';
import { generateSessionToken, createSession } from '$lib/server/auth/session';
import { setSessionCookie } from '$lib/server/auth/cookies';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const invite = String(form.get('invite') ?? '');
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (username.length < 3) return fail(400, { error: 'Username must be at least 3 characters.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });

		const usedInvite = await consumeInvite(invite);
		if (!usedInvite) return fail(400, { error: 'Invalid or already-used invite.' });

		const user = await createUser(username, password);
		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		setSessionCookie(cookies, token, session.expiresAt);

		throw redirect(303, '/');
	}
};

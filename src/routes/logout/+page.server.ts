import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { invalidateSession } from '$lib/server/auth/session';
import { deleteSessionCookie } from '$lib/server/auth/cookies';

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (locals.session) await invalidateSession(locals.session.id);
		deleteSessionCookie(cookies);
		throw redirect(303, '/login');
	}
};

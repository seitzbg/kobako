import type { Actions, PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { invites } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/auth/guard';
import { createInvite } from '$lib/server/auth/invite';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const all = await db.select().from(invites).orderBy(desc(invites.createdAt));
	return { invites: all };
};

export const actions: Actions = {
	default: async ({ locals }) => {
		const admin = requireAdmin(locals);
		const invite = await createInvite(admin.id);
		return { created: invite.token };
	}
};

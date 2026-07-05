import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { listIncenseSummaries } from '$lib/server/db/catalog';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const items = await listIncenseSummaries();
	return { user: { username: user.username, role: user.role }, items };
};

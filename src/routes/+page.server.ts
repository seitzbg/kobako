import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { listIncenseSummaries } from '$lib/server/db/catalog';
import { parseCatalogQuery } from '$lib/incense';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const filters = parseCatalogQuery(url.searchParams);
	const items = await listIncenseSummaries(filters);
	return { user: { username: user.username, role: user.role }, items, filters };
};

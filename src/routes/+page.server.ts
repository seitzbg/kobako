import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { listIncenseSummaries } from '$lib/server/db/catalog';
import { parseCatalogQuery } from '$lib/incense';
import { handleSetStatus } from '$lib/server/collectionAction';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const filters = parseCatalogQuery(url.searchParams);
	const items = await listIncenseSummaries(user.id, filters);
	return { user: { username: user.username, role: user.role }, items, filters };
};

export const actions: Actions = {
	setStatus: (event) => handleSetStatus(event)
};

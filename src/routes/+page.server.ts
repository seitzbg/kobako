import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { listIncenseSummaries } from '$lib/server/db/catalog';
import { listAllTags } from '$lib/server/db/tags';
import { parseCatalogQuery } from '$lib/incense';
import { handleSetStatus } from '$lib/server/collectionAction';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const filters = parseCatalogQuery(url.searchParams);
	const items = await listIncenseSummaries(user.id, filters);
	const allTags = (await listAllTags()).map((t) => t.name);
	return { user: { username: user.username, role: user.role }, items, filters, allTags };
};

export const actions: Actions = {
	setStatus: handleSetStatus
};

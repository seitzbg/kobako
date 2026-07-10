import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { listIncenseSummaries } from '$lib/server/db/catalog';
import { COLLECTION_STATUSES } from '$lib/incense';
import { handleSetStatus } from '$lib/server/collectionAction';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const items = await listIncenseSummaries(user.id, {
		q: '',
		formats: [],
		scents: [],
		statuses: [...COLLECTION_STATUSES],
		tags: [],
		sort: 'newest'
	});
	const groups = COLLECTION_STATUSES.map((status) => ({
		status,
		items: items.filter((i) => i.myStatus === status)
	}));
	return { user: { username: user.username, role: user.role }, groups };
};

export const actions: Actions = {
	setStatus: (event) => handleSetStatus(event)
};

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { getIncense, listReviewsForIncense } from '$lib/server/db/catalog';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireUser(locals);
	const item = await getIncense(params.id);
	if (!item) throw error(404, 'That incense is not in the catalog.');
	const reviews = await listReviewsForIncense(item.id);
	return {
		item,
		reviews,
		myReview: reviews.find((r) => r.userId === user.id),
		currentUserId: user.id
	};
};

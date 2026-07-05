import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { parseReviewForm } from '$lib/incense';
import { getIncense, listReviewsForIncense, upsertReview } from '$lib/server/db/catalog';

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

export const actions: Actions = {
	review: async ({ params, request, locals }) => {
		const user = requireUser(locals);
		const item = await getIncense(params.id);
		if (!item) throw error(404, 'That incense is not in the catalog.');
		const parsed = parseReviewForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		await upsertReview(item.id, user.id, parsed.value);
		return { saved: true };
	}
};

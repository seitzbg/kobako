import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import {
	parseReviewForm,
	parseCollectionStatus,
	parseBurnEntryForm,
	todayIso,
	parseTags
} from '$lib/incense';
import {
	getIncense,
	listReviewsForIncense,
	upsertReview,
	getMyCollectionStatus,
	listCollectionForIncense,
	setCollectionStatus
} from '$lib/server/db/catalog';
import { listBurnLogForIncense, addBurnEntry, deleteBurnEntry } from '$lib/server/db/burnLog';
import {
	listTagsForIncense,
	listAllTags,
	addTagToIncense,
	removeTagFromIncense
} from '$lib/server/db/tags';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireUser(locals);
	const item = await getIncense(params.id);
	if (!item) throw error(404, 'That incense is not in the catalog.');
	const reviews = await listReviewsForIncense(item.id);
	return {
		item,
		reviews,
		myReview: reviews.find((r) => r.userId === user.id),
		myStatus: await getMyCollectionStatus(item.id, user.id),
		collection: await listCollectionForIncense(item.id),
		burnLog: await listBurnLogForIncense(item.id),
		tags: await listTagsForIncense(item.id),
		allTags: (await listAllTags()).map((t) => t.name),
		todayIso: todayIso(),
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
	},
	status: async ({ params, request, locals }) => {
		const user = requireUser(locals);
		const item = await getIncense(params.id);
		if (!item) throw error(404, 'That incense is not in the catalog.');
		const form = await request.formData();
		await setCollectionStatus(
			item.id,
			user.id,
			parseCollectionStatus(String(form.get('status') ?? ''))
		);
		return { statusSaved: true };
	},
	burn: async ({ params, request, locals }) => {
		const user = requireUser(locals);
		const item = await getIncense(params.id);
		if (!item) throw error(404, 'That incense is not in the catalog.');
		const parsed = parseBurnEntryForm(await request.formData());
		if (!parsed.ok) return fail(400, { burnError: parsed.error });
		await addBurnEntry(item.id, user.id, parsed.value);
		return { burnSaved: true };
	},
	deleteBurn: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const entryId = String(form.get('entryId') ?? '');
		if (entryId) await deleteBurnEntry(entryId, user.id);
		return { burnDeleted: true };
	},
	addTag: async ({ params, request, locals }) => {
		const user = requireUser(locals);
		const item = await getIncense(params.id);
		if (!item) throw error(404, 'That incense is not in the catalog.');
		void user;
		const form = await request.formData();
		for (const name of parseTags(String(form.get('tag') ?? ''))) {
			await addTagToIncense(item.id, name);
		}
		return { tagsSaved: true };
	},
	removeTag: async ({ params, request, locals }) => {
		const user = requireUser(locals);
		const item = await getIncense(params.id);
		if (!item) throw error(404, 'That incense is not in the catalog.');
		void user;
		const form = await request.formData();
		await removeTagFromIncense(item.id, String(form.get('tag') ?? ''));
		return { tagsSaved: true };
	}
};

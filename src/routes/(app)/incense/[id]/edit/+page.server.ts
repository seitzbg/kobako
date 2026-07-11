import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { parseIncenseForm, parseTags } from '$lib/incense';
import { getIncense, updateIncense } from '$lib/server/db/catalog';
import { listTagsForIncense, setIncenseTags } from '$lib/server/db/tags';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireUser(locals);
	const item = await getIncense(params.id);
	if (!item) throw error(404, 'That incense is not in the catalog.');
	return { item, tags: await listTagsForIncense(item.id) };
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		requireUser(locals);
		const form = await request.formData();
		const parsed = parseIncenseForm(form);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const updated = await updateIncense(params.id, parsed.value);
		if (!updated) throw error(404, 'That incense is not in the catalog.');
		await setIncenseTags(params.id, parseTags(String(form.get('tags') ?? '')));
		throw redirect(303, `/incense/${params.id}`);
	}
};

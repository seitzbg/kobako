import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { parseIncenseForm } from '$lib/incense';
import { getIncense, updateIncense } from '$lib/server/db/catalog';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireUser(locals);
	const item = await getIncense(params.id);
	if (!item) throw error(404, 'That incense is not in the catalog.');
	return { item };
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		requireUser(locals);
		const parsed = parseIncenseForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const updated = await updateIncense(params.id, parsed.value);
		if (!updated) throw error(404, 'That incense is not in the catalog.');
		throw redirect(303, `/incense/${params.id}`);
	}
};

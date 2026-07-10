import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { parseIncenseForm, parseTags } from '$lib/incense';
import { createIncense } from '$lib/server/db/catalog';
import { setIncenseTags } from '$lib/server/db/tags';

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals);
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const parsed = parseIncenseForm(form);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const item = await createIncense(parsed.value, user.id);
		await setIncenseTags(item.id, parseTags(String(form.get('tags') ?? '')));
		throw redirect(303, `/incense/${item.id}`);
	}
};

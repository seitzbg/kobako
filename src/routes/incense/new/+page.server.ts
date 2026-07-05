import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { parseIncenseForm } from '$lib/incense';
import { createIncense } from '$lib/server/db/catalog';

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals);
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals);
		const parsed = parseIncenseForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const item = await createIncense(parsed.value, user.id);
		throw redirect(303, `/incense/${item.id}`);
	}
};

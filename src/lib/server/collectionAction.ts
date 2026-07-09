import { fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { requireUser } from './auth/guard';
import { parseCollectionStatus } from '$lib/incense';
import { getIncense, setCollectionStatus } from './db/catalog';

// Shared handler for the grid quick-set on both the catalog and /collection pages.
export async function handleSetStatus(event: Pick<RequestEvent, 'request' | 'locals'>) {
	const user = requireUser(event.locals);
	const form = await event.request.formData();
	const item = await getIncense(String(form.get('incenseId') ?? ''));
	if (!item) return fail(404, { error: 'Unknown incense.' });
	await setCollectionStatus(
		item.id,
		user.id,
		parseCollectionStatus(String(form.get('status') ?? ''))
	);
	return { statusSaved: true };
}

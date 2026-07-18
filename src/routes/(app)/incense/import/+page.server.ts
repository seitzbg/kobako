import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth/guard';
import { parseIncenseForm, shopNameFromUrl } from '$lib/incense';
import { assertPublicUrl, SsrfError, FetchError } from '$lib/server/import/ssrf';
import { extractProduct } from '$lib/server/import/extract';
import { cacheImage } from '$lib/server/import/images';
import { DATA_DIR } from '$lib/server/config';
import { createIncense, findBySourceUrl, findSimilarByName } from '$lib/server/db/catalog';

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals);
	return {};
};

export const actions: Actions = {
	fetch: async ({ request, locals }) => {
		requireUser(locals);
		const url = String((await request.formData()).get('url') ?? '').trim();
		try {
			await assertPublicUrl(url);
		} catch (e) {
			if (e instanceof SsrfError) return fail(400, { error: e.message, url });
			throw e;
		}

		const existing = (await findBySourceUrl(url)) ?? null;

		let extracted;
		try {
			extracted = await extractProduct(url);
		} catch (e) {
			// Never a dead end — degrade to manual entry with the URL kept, but say
			// why, so a blocked shop doesn't look like a form that just came back blank.
			return {
				stage: 'confirm',
				error:
					e instanceof FetchError
						? `Couldn't read that page (${e.message}) — fill in the details yourself.`
						: "Couldn't read that page — fill in the details yourself.",
				prefill: { sourceUrl: url, sourceShop: shopNameFromUrl(url) },
				imagePath: null,
				existing
			};
		}

		const imagePath = extracted.imageUrl ? await cacheImage(extracted.imageUrl, DATA_DIR) : null;
		// Also de-dup by name once it's known — the source-URL check above
		// catches re-imports of the same link; this catches the same product
		// pasted from a different (e.g. mirrored) URL.
		const existingByName =
			!existing && extracted.name ? ((await findSimilarByName(extracted.name)) ?? null) : null;
		// A 200 that carries no product metadata at all is indistinguishable, to the
		// user, from the form silently coming back blank — so name that case too.
		const foundNothing = !Object.values(extracted).some((v) => v !== null);
		return {
			stage: 'confirm',
			imagePath,
			existing: existing ?? existingByName,
			...(foundNothing
				? { error: "That page didn't expose any product details — fill them in yourself." }
				: {}),
			prefill: {
				name: extracted.name,
				brand: extracted.brand,
				description: extracted.description,
				price: extracted.price,
				currency: extracted.currency,
				sourceUrl: url,
				sourceShop: shopNameFromUrl(url)
			}
		};
	},

	save: async ({ request, locals }) => {
		const user = requireUser(locals);
		const fdata = await request.formData();
		const parsed = parseIncenseForm(fdata);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const imagePathRaw = String(fdata.get('imagePath') ?? '');
		const imagePath = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(imagePathRaw)
			? imagePathRaw
			: null;
		const item = await createIncense(parsed.value, user.id, imagePath);
		throw redirect(303, `/incense/${item.id}`);
	}
};

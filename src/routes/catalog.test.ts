import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, incense, reviews, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import {
	listIncenseSummaries,
	setCollectionStatus,
	getMyCollectionStatus,
	listCollectionForIncense
} from '$lib/server/db/catalog';
import { collection } from '$lib/server/db/schema';
import type { CatalogFilters } from '$lib/incense';
import { load, actions as homeActions } from './+page.server';

async function member(): Promise<User> {
	const [u] = await db
		.insert(users)
		.values({
			username: `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			passwordHash: await hashPassword('x'),
			role: 'member'
		})
		.returning();
	return u;
}

// Unique per-invocation marker so assertions can be scoped to just this test's
// rows in the shared dev DB. Embed it in a searchable field and query for it.
function marker(): string {
	return `mk${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function baseFilters(over: Partial<CatalogFilters> = {}): CatalogFilters {
	return { q: '', formats: [], scents: [], statuses: [], sort: 'newest', ...over };
}

describe('home catalog load', () => {
	it('returns items with review count and average overall', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Grid ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();
		await db.insert(reviews).values({ incenseId: item.id, userId: u.id, overall: 4 });

		const result = (await load({
			locals: { user: u },
			url: new URL('http://localhost/')
		} as unknown as Parameters<typeof load>[0])) as {
			items: { id: string; reviewCount: number; avgOverall: number | null }[];
		};

		const mine = result.items.find((i) => i.id === item.id);
		expect(mine).toBeDefined();
		expect(mine!.reviewCount).toBe(1);
		expect(mine!.avgOverall).toBe(4);
	});

	it('counts a review even when its overall score is blank', async () => {
		// A user may rate some axes but leave Overall unset. The item must still
		// register as reviewed (reviewCount >= 1) with a null average — the grid
		// keys its "No reviews yet" state off reviewCount, not avgOverall.
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `NoOverall ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();
		await db.insert(reviews).values({ incenseId: item.id, userId: u.id, scent: 4 });

		const result = (await load({
			locals: { user: u },
			url: new URL('http://localhost/')
		} as unknown as Parameters<typeof load>[0])) as {
			items: { id: string; reviewCount: number; avgOverall: number | null }[];
		};

		const mine = result.items.find((i) => i.id === item.id);
		expect(mine!.reviewCount).toBe(1);
		expect(mine!.avgOverall).toBeNull();
	});

	it('redirects anonymous visitors to /login', async () => {
		await expect(
			load({
				locals: { user: null },
				url: new URL('http://localhost/')
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});
});

describe('listIncenseSummaries filtering', () => {
	it('searches across name, brand, origin, ingredients and description (case-insensitive)', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} in name`, createdBy: u.id },
			{ name: 'plain one', brand: `${mk}Brand`, createdBy: u.id },
			{ name: 'plain two', origin: `made in ${mk}`, createdBy: u.id },
			{ name: 'plain three', ingredients: `${mk}, sandalwood`, createdBy: u.id },
			{ name: 'plain four', description: `notes of ${mk}`, createdBy: u.id }
		]);

		const lower = await listIncenseSummaries(u.id, baseFilters({ q: mk }));
		expect(lower).toHaveLength(5);

		const upper = await listIncenseSummaries(u.id, baseFilters({ q: mk.toUpperCase() }));
		expect(upper).toHaveLength(5);
	});

	it('filters by any selected format (OR within the facet)', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} a`, format: 'stick', createdBy: u.id },
			{ name: `${mk} b`, format: 'coil', createdBy: u.id },
			{ name: `${mk} c`, format: 'resin', createdBy: u.id }
		]);

		const rows = await listIncenseSummaries(
			u.id,
			baseFilters({ q: mk, formats: ['stick', 'coil'] })
		);
		expect(rows.map((r) => r.format).sort()).toEqual(['coil', 'stick']);
	});

	it('filters by scent family and combines facets + search with AND', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} hit`, format: 'stick', scentFamily: 'floral', createdBy: u.id },
			{ name: `${mk} wrong scent`, format: 'stick', scentFamily: 'spice', createdBy: u.id },
			{ name: `${mk} wrong format`, format: 'coil', scentFamily: 'floral', createdBy: u.id }
		]);

		const rows = await listIncenseSummaries(
			u.id,
			baseFilters({ q: mk, formats: ['stick'], scents: ['floral'] })
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe(`${mk} hit`);
	});

	it('sort=top orders by average overall with un-reviewed items last', async () => {
		const u = await member();
		const mk = marker();
		const [hi, lo, none] = await db
			.insert(incense)
			.values([
				{ name: `${mk} high`, createdBy: u.id },
				{ name: `${mk} low`, createdBy: u.id },
				{ name: `${mk} none`, createdBy: u.id }
			])
			.returning();
		await db.insert(reviews).values([
			{ incenseId: hi.id, userId: u.id, overall: 5 },
			{ incenseId: lo.id, userId: u.id, overall: 2 }
		]);

		const rows = await listIncenseSummaries(u.id, baseFilters({ q: mk, sort: 'top' }));
		expect(rows.map((r) => r.id)).toEqual([hi.id, lo.id, none.id]);
	});

	it('sort=name orders case-insensitively', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} banana`, createdBy: u.id },
			{ name: `${mk} Apple`, createdBy: u.id },
			{ name: `${mk} cherry`, createdBy: u.id }
		]);

		const rows = await listIncenseSummaries(u.id, baseFilters({ q: mk, sort: 'name' }));
		expect(rows.map((r) => r.name)).toEqual([`${mk} Apple`, `${mk} banana`, `${mk} cherry`]);
	});

	it('treats %, _ and \\ in the search as literal characters', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} 50% off sale`, createdBy: u.id },
			{ name: `${mk} 5000 sticks`, createdBy: u.id },
			{ name: `${mk} a_b`, createdBy: u.id },
			{ name: `${mk} aXb`, createdBy: u.id },
			{ name: `${mk} a\\b`, createdBy: u.id }
		]);

		// % is not a wildcard: "50%" only matches the row with a literal "%".
		const percentRows = await listIncenseSummaries(u.id, baseFilters({ q: `${mk} 50%` }));
		expect(percentRows).toHaveLength(1);
		expect(percentRows[0].name).toBe(`${mk} 50% off sale`);

		// _ is not a single-char wildcard: "a_b" must not also match "aXb".
		// Without escaping both rows would match, since _ matches any character.
		const underscoreRows = await listIncenseSummaries(u.id, baseFilters({ q: `${mk} a_b` }));
		expect(underscoreRows).toHaveLength(1);
		expect(underscoreRows[0].name).toBe(`${mk} a_b`);

		// \ is not an escape introducer in the user's term: "a\b" matches the
		// row containing a literal backslash only. (escapeLike escapes \, %
		// and _ via the same regex branch, so this exercises that shared path.)
		const backslashRows = await listIncenseSummaries(u.id, baseFilters({ q: `${mk} a\\b` }));
		expect(backslashRows).toHaveLength(1);
		expect(backslashRows[0].name).toBe(`${mk} a\\b`);
	});

	it('sort=most_reviewed orders by review count desc, then avg overall desc nulls last', async () => {
		const u1 = await member();
		const u2 = await member();
		const u3 = await member();
		const mk = marker();
		const [twoReviews, oneReview, noReviews] = await db
			.insert(incense)
			.values([
				{ name: `${mk} two reviews`, createdBy: u1.id },
				{ name: `${mk} one review`, createdBy: u1.id },
				{ name: `${mk} no reviews`, createdBy: u1.id }
			])
			.returning();
		// twoReviews has the most reviews but both leave overall blank, so its
		// average is null. It must still outrank oneReview (fewer reviews, but
		// a real average) under most_reviewed — count is the primary key, not
		// average. noReviews (count 0) must sort last regardless.
		await db.insert(reviews).values([
			{ incenseId: twoReviews.id, userId: u1.id, overall: null },
			{ incenseId: twoReviews.id, userId: u2.id, overall: null },
			{ incenseId: oneReview.id, userId: u3.id, overall: 5 }
		]);

		const rows = await listIncenseSummaries(u1.id, baseFilters({ q: mk, sort: 'most_reviewed' }));
		expect(rows.map((r) => r.id)).toEqual([twoReviews.id, oneReview.id, noReviews.id]);
	});
});

describe('home catalog load — filters', () => {
	async function loadWith(u: User, query: string) {
		return (await load({
			locals: { user: u },
			url: new URL(`http://localhost/${query}`)
		} as unknown as Parameters<typeof load>[0])) as {
			items: { id: string; name: string }[];
			filters: CatalogFilters;
		};
	}

	it('applies query params and echoes the parsed filters', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} keep`, format: 'stick', createdBy: u.id },
			{ name: `${mk} drop`, format: 'resin', createdBy: u.id }
		]);

		const result = await loadWith(u, `?q=${mk}&format=stick&sort=name`);
		expect(result.filters).toEqual({
			q: mk,
			formats: ['stick'],
			scents: [],
			statuses: [],
			sort: 'name'
		});
		expect(result.items.map((i) => i.name)).toEqual([`${mk} keep`]);
	});

	it('returns an empty item list (with filters set) when nothing matches', async () => {
		const u = await member();
		const result = await loadWith(u, `?q=zzz_no_such_${marker()}`);
		expect(result.items).toHaveLength(0);
		expect(result.filters.q).not.toBe('');
	});

	it('applies the status facet from the URL', async () => {
		const u = await member();
		const mk = `mk${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- negative control: must exist but not match the status filter
		const [own, plain] = await db
			.insert(incense)
			.values([
				{ name: `${mk} own`, createdBy: u.id },
				{ name: `${mk} plain`, createdBy: u.id }
			])
			.returning();
		await setCollectionStatus(own.id, u.id, 'owned');

		const result = await loadWith(u, `?q=${mk}&status=owned`);
		expect(result.filters.statuses).toEqual(['owned']);
		expect(result.items.map((i) => i.id)).toEqual([own.id]);
	});
});

describe('collection data access', () => {
	it('sets, changes, and removes a status (one row per user/item)', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Col ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();

		await setCollectionStatus(item.id, u.id, 'wishlist');
		expect(await getMyCollectionStatus(item.id, u.id)).toBe('wishlist');

		await setCollectionStatus(item.id, u.id, 'owned'); // upsert, not duplicate
		const rows = await db.select().from(collection).where(eq(collection.incenseId, item.id));
		expect(rows.length).toBe(1);
		expect(rows[0].status).toBe('owned');

		await setCollectionStatus(item.id, u.id, null); // remove
		expect(await getMyCollectionStatus(item.id, u.id)).toBeUndefined();
		expect(
			(await db.select().from(collection).where(eq(collection.incenseId, item.id))).length
		).toBe(0);
	});

	it('lists everyone’s status for an item', async () => {
		const a = await member();
		const b = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Shared ${Date.now()}_${Math.random()}`, createdBy: a.id })
			.returning();
		await setCollectionStatus(item.id, a.id, 'owned');
		await setCollectionStatus(item.id, b.id, 'wishlist');

		const rows = await listCollectionForIncense(item.id);
		const byUser = Object.fromEntries(rows.map((r) => [r.username, r.status]));
		expect(byUser[a.username]).toBe('owned');
		expect(byUser[b.username]).toBe('wishlist');
	});

	it('summaries carry only the current user’s myStatus', async () => {
		const a = await member();
		const b = await member();
		const mk = `mk${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
		const [item] = await db
			.insert(incense)
			.values({ name: `${mk} scope`, createdBy: a.id })
			.returning();
		await setCollectionStatus(item.id, a.id, 'owned');
		await setCollectionStatus(item.id, b.id, 'wishlist');

		const asA = await listIncenseSummaries(a.id, baseFilters({ q: mk }));
		expect(asA.find((i) => i.id === item.id)?.myStatus).toBe('owned');
		const asB = await listIncenseSummaries(b.id, baseFilters({ q: mk }));
		expect(asB.find((i) => i.id === item.id)?.myStatus).toBe('wishlist');
	});

	it('filters by the current user’s status', async () => {
		const a = await member();
		const mk = `mk${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
		const [own, wish] = await db
			.insert(incense)
			.values([
				{ name: `${mk} own`, createdBy: a.id },
				{ name: `${mk} wish`, createdBy: a.id },
				{ name: `${mk} none`, createdBy: a.id }
			])
			.returning();
		await setCollectionStatus(own.id, a.id, 'owned');
		await setCollectionStatus(wish.id, a.id, 'wishlist');

		const rows = await listIncenseSummaries(a.id, baseFilters({ q: mk, statuses: ['owned'] }));
		expect(rows.map((r) => r.id)).toEqual([own.id]);

		const ownOrWish = await listIncenseSummaries(
			a.id,
			baseFilters({ q: mk, statuses: ['owned', 'wishlist'] })
		);
		expect(ownOrWish.map((r) => r.id).sort()).toEqual([own.id, wish.id].sort());
	});
});

describe('catalog setStatus action', () => {
	function setReq(incenseId: string, status: string) {
		const f = new FormData();
		f.set('incenseId', incenseId);
		f.set('status', status);
		return { request: { formData: async () => f } };
	}

	it('upserts the caller’s status for an item', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Quick ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();

		await homeActions.setStatus({
			...setReq(item.id, 'owned'),
			locals: { user: u }
		} as unknown as Parameters<typeof homeActions.setStatus>[0]);

		expect(await getMyCollectionStatus(item.id, u.id)).toBe('owned');
	});

	it('404s an unknown incense', async () => {
		const u = await member();
		const result = await homeActions.setStatus({
			...setReq('00000000-0000-0000-0000-000000000000', 'owned'),
			locals: { user: u }
		} as unknown as Parameters<typeof homeActions.setStatus>[0]);
		expect((result as { status: number }).status).toBe(404);
	});
});

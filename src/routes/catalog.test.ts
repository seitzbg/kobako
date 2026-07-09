import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { users, incense, reviews, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { listIncenseSummaries } from '$lib/server/db/catalog';
import type { CatalogFilters } from '$lib/incense';
import { load } from './+page.server';

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
	return { q: '', formats: [], scents: [], sort: 'newest', ...over };
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

		const lower = await listIncenseSummaries(baseFilters({ q: mk }));
		expect(lower).toHaveLength(5);

		const upper = await listIncenseSummaries(baseFilters({ q: mk.toUpperCase() }));
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

		const rows = await listIncenseSummaries(baseFilters({ q: mk, formats: ['stick', 'coil'] }));
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

		const rows = await listIncenseSummaries(baseFilters({ q: mk, sort: 'top' }));
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

		const rows = await listIncenseSummaries(baseFilters({ q: mk, sort: 'name' }));
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
		const percentRows = await listIncenseSummaries(baseFilters({ q: `${mk} 50%` }));
		expect(percentRows).toHaveLength(1);
		expect(percentRows[0].name).toBe(`${mk} 50% off sale`);

		// _ is not a single-char wildcard: "a_b" must not also match "aXb".
		// Without escaping both rows would match, since _ matches any character.
		const underscoreRows = await listIncenseSummaries(baseFilters({ q: `${mk} a_b` }));
		expect(underscoreRows).toHaveLength(1);
		expect(underscoreRows[0].name).toBe(`${mk} a_b`);

		// \ is not an escape introducer in the user's term: "a\b" matches the
		// row containing a literal backslash only. (escapeLike escapes \, %
		// and _ via the same regex branch, so this exercises that shared path.)
		const backslashRows = await listIncenseSummaries(baseFilters({ q: `${mk} a\\b` }));
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

		const rows = await listIncenseSummaries(baseFilters({ q: mk, sort: 'most_reviewed' }));
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
		expect(result.filters).toEqual({ q: mk, formats: ['stick'], scents: [], sort: 'name' });
		expect(result.items.map((i) => i.name)).toEqual([`${mk} keep`]);
	});

	it('returns an empty item list (with filters set) when nothing matches', async () => {
		const u = await member();
		const result = await loadWith(u, `?q=zzz_no_such_${marker()}`);
		expect(result.items).toHaveLength(0);
		expect(result.filters.q).not.toBe('');
	});
});

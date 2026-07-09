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
			locals: { user: u }
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
			locals: { user: u }
		} as unknown as Parameters<typeof load>[0])) as {
			items: { id: string; reviewCount: number; avgOverall: number | null }[];
		};

		const mine = result.items.find((i) => i.id === item.id);
		expect(mine!.reviewCount).toBe(1);
		expect(mine!.avgOverall).toBeNull();
	});

	it('redirects anonymous visitors to /login', async () => {
		await expect(
			load({ locals: { user: null } } as unknown as Parameters<typeof load>[0])
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

	it('treats % and _ in the search as literal characters', async () => {
		const u = await member();
		const mk = marker();
		await db.insert(incense).values([
			{ name: `${mk} 50% off sale`, createdBy: u.id },
			{ name: `${mk} 5000 sticks`, createdBy: u.id }
		]);

		const rows = await listIncenseSummaries(baseFilters({ q: `${mk} 50%` }));
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe(`${mk} 50% off sale`);
	});
});

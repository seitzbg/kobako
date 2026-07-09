import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, incense, reviews, collection, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { setCollectionStatus } from '$lib/server/db/catalog';
import { load, actions } from './+page.server';

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

describe('incense detail load', () => {
	it('returns the item plus every review with usernames', async () => {
		const a = await member();
		const b = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Detail ${Date.now()}_${Math.random()}`, createdBy: a.id })
			.returning();
		await db
			.insert(reviews)
			.values({ incenseId: item.id, userId: a.id, overall: 5, reviewText: 'mine' });
		await db.insert(reviews).values({ incenseId: item.id, userId: b.id, overall: 3 });

		const result = (await load({
			params: { id: item.id },
			locals: { user: a }
		} as unknown as Parameters<typeof load>[0])) as {
			item: { id: string };
			reviews: { username: string; overall: number | null }[];
			myReview?: { reviewText: string | null };
		};

		expect(result.item.id).toBe(item.id);
		expect(result.reviews.length).toBe(2);
		expect(result.reviews.some((r) => r.username === a.username)).toBe(true);
		expect(result.myReview?.reviewText).toBe('mine');
	});

	it('404s an unknown id', async () => {
		const a = await member();
		await expect(
			load({
				params: { id: '00000000-0000-0000-0000-000000000000' },
				locals: { user: a }
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 404 });
	});

	it('redirects anonymous visitors to /login', async () => {
		await expect(
			load({
				params: { id: '00000000-0000-0000-0000-000000000000' },
				locals: { user: null }
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});
});

function reviewReq(id: string, entries: Record<string, string>) {
	const f = new FormData();
	for (const [k, v] of Object.entries(entries)) f.set(k, v);
	return { params: { id }, request: { formData: async () => f } };
}

describe('incense review upsert action', () => {
	it('creates then updates the same user’s single review', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Rev ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();

		await actions.review({
			...reviewReq(item.id, { scent: '4', overall: '4', reviewText: 'first' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.review>[0]);

		let rows = await db.select().from(reviews).where(eq(reviews.incenseId, item.id));
		expect(rows.length).toBe(1);
		expect(rows[0].reviewText).toBe('first');

		await actions.review({
			...reviewReq(item.id, { scent: '5', overall: '5', reviewText: 'second' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.review>[0]);

		rows = await db.select().from(reviews).where(eq(reviews.incenseId, item.id));
		expect(rows.length).toBe(1); // still one — upserted, not duplicated
		expect(rows[0].overall).toBe(5);
		expect(rows[0].reviewText).toBe('second');
	});

	it('rejects an out-of-range score with 400', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Rev2 ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();
		const result = await actions.review({
			...reviewReq(item.id, { scent: '9' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.review>[0]);
		expect((result as { status: number }).status).toBe(400);
	});
});

describe('incense detail — collection', () => {
	function statusReq(id: string, status: string) {
		const f = new FormData();
		f.set('status', status);
		return { params: { id }, request: { formData: async () => f } };
	}

	it('load returns my status and everyone’s statuses', async () => {
		const a = await member();
		const b = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Col ${Date.now()}_${Math.random()}`, createdBy: a.id })
			.returning();
		await setCollectionStatus(item.id, a.id, 'owned');
		await setCollectionStatus(item.id, b.id, 'wishlist');

		const result = (await load({
			params: { id: item.id },
			locals: { user: a }
		} as unknown as Parameters<typeof load>[0])) as {
			myStatus: string | undefined;
			collection: { username: string; status: string }[];
		};
		expect(result.myStatus).toBe('owned');
		expect(
			result.collection.some((c) => c.username === b.username && c.status === 'wishlist')
		).toBe(true);
	});

	it('status action sets then removes my status', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `ColAct ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();

		await actions.status({
			...statusReq(item.id, 'sample'),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.status>[0]);
		let rows = await db.select().from(collection).where(eq(collection.incenseId, item.id));
		expect(rows.length).toBe(1);
		expect(rows[0].status).toBe('sample');

		await actions.status({
			...statusReq(item.id, ''),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.status>[0]);
		rows = await db.select().from(collection).where(eq(collection.incenseId, item.id));
		expect(rows.length).toBe(0);
	});
});

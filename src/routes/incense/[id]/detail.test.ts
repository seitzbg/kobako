import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, incense, reviews, collection, burnLog, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { setCollectionStatus } from '$lib/server/db/catalog';
import { listTagsForIncense } from '$lib/server/db/tags';
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

describe('incense detail — burn log', () => {
	function burnReq(id: string, entries: Record<string, string>) {
		const f = new FormData();
		for (const [k, v] of Object.entries(entries)) f.set(k, v);
		return { params: { id }, request: { formData: async () => f } };
	}

	it('load returns the shared burn log and today', async () => {
		const a = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `BurnLoad ${Date.now()}_${Math.random()}`, createdBy: a.id })
			.returning();
		await db
			.insert(burnLog)
			.values({ incenseId: item.id, userId: a.id, burnedOn: '2026-01-01', notes: 'first' });

		const result = (await load({
			params: { id: item.id },
			locals: { user: a }
		} as unknown as Parameters<typeof load>[0])) as {
			burnLog: { notes: string | null }[];
			todayIso: string;
		};
		expect(result.burnLog.some((e) => e.notes === 'first')).toBe(true);
		expect(result.todayIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('burn action adds an entry', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `BurnAct ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();
		await actions.burn({
			...burnReq(item.id, { burnedOn: '2026-02-02', rating: '3', notes: 'nice' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.burn>[0]);
		const rows = await db.select().from(burnLog).where(eq(burnLog.incenseId, item.id));
		expect(rows.length).toBe(1);
		expect(rows[0].notes).toBe('nice');
	});

	it('burn action rejects a future date with 400 and adds nothing', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `BurnBad ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();
		const result = await actions.burn({
			...burnReq(item.id, { burnedOn: '2999-01-01' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.burn>[0]);
		expect((result as { status: number }).status).toBe(400);
		expect((await db.select().from(burnLog).where(eq(burnLog.incenseId, item.id))).length).toBe(0);
	});

	it('deleteBurn removes only the caller’s own entry', async () => {
		const a = await member();
		const b = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `BurnDel ${Date.now()}_${Math.random()}`, createdBy: a.id })
			.returning();
		await db
			.insert(burnLog)
			.values({ incenseId: item.id, userId: a.id, burnedOn: '2026-01-01', notes: 'a' });
		const [entry] = await db.select().from(burnLog).where(eq(burnLog.incenseId, item.id));

		await actions.deleteBurn({
			...burnReq(item.id, { entryId: entry.id }),
			locals: { user: b }
		} as unknown as Parameters<typeof actions.deleteBurn>[0]);
		expect((await db.select().from(burnLog).where(eq(burnLog.incenseId, item.id))).length).toBe(1);

		await actions.deleteBurn({
			...burnReq(item.id, { entryId: entry.id }),
			locals: { user: a }
		} as unknown as Parameters<typeof actions.deleteBurn>[0]);
		expect((await db.select().from(burnLog).where(eq(burnLog.incenseId, item.id))).length).toBe(0);
	});
});

describe('incense detail — tags', () => {
	function tagReq(id: string, tag: string) {
		const f = new FormData();
		f.set('tag', tag);
		return { params: { id }, request: { formData: async () => f } };
	}

	it('load returns the item tags and the full tag list', async () => {
		const a = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `TagLoad ${Date.now()}_${Math.random()}`, createdBy: a.id })
			.returning();
		const uniq = `tl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		const { addTagToIncense } = await import('$lib/server/db/tags');
		await addTagToIncense(item.id, uniq);

		const result = (await load({
			params: { id: item.id },
			locals: { user: a }
		} as unknown as Parameters<typeof load>[0])) as { tags: string[]; allTags: string[] };
		expect(result.tags).toContain(uniq);
		expect(result.allTags).toContain(uniq);
	});

	it('addTag action adds (comma-separated) tags; removeTag removes one', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `TagAct ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();

		await actions.addTag({
			...tagReq(item.id, 'Sweet, Resinous'),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.addTag>[0]);
		expect(await listTagsForIncense(item.id)).toEqual(['resinous', 'sweet']);

		await actions.removeTag({
			...tagReq(item.id, 'sweet'),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.removeTag>[0]);
		expect(await listTagsForIncense(item.id)).toEqual(['resinous']);
	});
});

import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { users, incense, reviews, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
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

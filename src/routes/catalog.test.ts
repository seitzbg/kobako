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

	it('redirects anonymous visitors to /login', async () => {
		await expect(
			load({ locals: { user: null } } as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});
});

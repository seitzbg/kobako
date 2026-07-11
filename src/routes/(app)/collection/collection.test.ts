import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db/client';
import { users, incense, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { setCollectionStatus } from '$lib/server/db/catalog';
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

describe('collection page load', () => {
	it('groups my items by status and excludes others’ and unset items', async () => {
		const u = await member();
		const other = await member();
		const [own, wish, none] = await db
			.insert(incense)
			.values([
				{ name: `Own ${Date.now()}_${Math.random()}`, createdBy: u.id },
				{ name: `Wish ${Date.now()}_${Math.random()}`, createdBy: u.id },
				{ name: `None ${Date.now()}_${Math.random()}`, createdBy: u.id }
			])
			.returning();
		await setCollectionStatus(own.id, u.id, 'owned');
		await setCollectionStatus(wish.id, u.id, 'wishlist');
		await setCollectionStatus(none.id, other.id, 'owned'); // someone else's

		const result = (await load({
			locals: { user: u }
		} as unknown as Parameters<typeof load>[0])) as {
			groups: { status: string; items: { id: string }[] }[];
		};
		const owned = result.groups.find((g) => g.status === 'owned')!;
		const wishlist = result.groups.find((g) => g.status === 'wishlist')!;
		expect(owned.items.map((i) => i.id)).toContain(own.id);
		expect(owned.items.map((i) => i.id)).not.toContain(none.id);
		expect(wishlist.items.map((i) => i.id)).toContain(wish.id);
	});

	it('redirects anonymous visitors to /login', async () => {
		await expect(
			load({ locals: { user: null } } as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});
});

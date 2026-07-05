import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, incense, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { findBySourceUrl, findSimilarByName } from '$lib/server/db/catalog';
import { actions } from './+page.server';

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
function form(entries: Record<string, string>) {
	const f = new FormData();
	for (const [k, v] of Object.entries(entries)) f.set(k, v);
	return { request: { formData: async () => f } };
}

describe('catalog de-dup helpers', () => {
	it('finds an item by exact source URL and by case-insensitive name', async () => {
		const u = await member();
		const url = `https://shop.example/p/${Date.now()}_${Math.random()}`;
		const name = `Dedup ${Date.now()}_${Math.random()}`;
		await db.insert(incense).values({ name, sourceUrl: url, createdBy: u.id });
		expect((await findBySourceUrl(url))?.name).toBe(name);
		expect((await findSimilarByName(name.toUpperCase()))?.name).toBe(name);
		expect(await findBySourceUrl('https://nope.example/x')).toBeUndefined();
	});
});

describe('/incense/import save action', () => {
	it('creates the item (with imagePath from the hidden field) and redirects to detail', async () => {
		const u = await member();
		const name = `Imp ${Date.now()}_${Math.random()}`;
		let location = '';
		try {
			await actions.save({
				...form({ name, brand: 'Baieido', imagePath: '00000000-0000-0000-0000-000000000000.png' }),
				locals: { user: u }
			} as unknown as Parameters<typeof actions.save>[0]);
		} catch (e) {
			location = (e as { location: string }).location;
		}
		const [row] = await db.select().from(incense).where(eq(incense.name, name));
		expect(row.imagePath).toBe('00000000-0000-0000-0000-000000000000.png');
		expect(location).toBe(`/incense/${row.id}`);
	});

	it('save fails 400 on a blank name', async () => {
		const u = await member();
		const res = await actions.save({
			...form({ name: '  ' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.save>[0]);
		expect((res as { status: number }).status).toBe(400);
	});

	it('fetch action rejects a non-http URL with a friendly 400', async () => {
		const u = await member();
		const res = await actions.fetch({
			...form({ url: 'file:///etc/passwd' }),
			locals: { user: u }
		} as unknown as Parameters<typeof actions.fetch>[0]);
		expect((res as { status: number }).status).toBe(400);
	});

	it('fetch action redirects an anonymous visitor', async () => {
		await expect(
			actions.fetch({
				...form({ url: 'https://example.com' }),
				locals: { user: null }
			} as unknown as Parameters<typeof actions.fetch>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});
});

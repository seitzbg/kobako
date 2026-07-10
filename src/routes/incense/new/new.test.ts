import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, incense, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { listTagsForIncense } from '$lib/server/db/tags';
import { actions } from './+page.server';

async function createMember(): Promise<User> {
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

function req(entries: Record<string, string>) {
	const f = new FormData();
	for (const [k, v] of Object.entries(entries)) f.set(k, v);
	return { request: { formData: async () => f } };
}

describe('/incense/new create action', () => {
	it('creates an item and redirects to its detail page', async () => {
		const user = await createMember();
		const name = `Test Kō ${Date.now()}`;
		let redirectedTo = '';
		try {
			await actions.default({
				...req({ name, brand: 'Baieido', format: 'stick', scentFamily: 'aloeswood' }),
				locals: { user }
			} as unknown as Parameters<typeof actions.default>[0]);
		} catch (e) {
			// SvelteKit redirect() throws a Redirect object { status, location }
			redirectedTo = (e as { location: string }).location;
		}
		const [row] = await db.select().from(incense).where(eq(incense.name, name));
		expect(row).toBeDefined();
		expect(row.brand).toBe('Baieido');
		expect(row.createdBy).toBe(user.id);
		expect(redirectedTo).toBe(`/incense/${row.id}`);
	});

	it('returns a 400 fail on a blank name', async () => {
		const user = await createMember();
		const result = await actions.default({
			...req({ name: '   ' }),
			locals: { user }
		} as unknown as Parameters<typeof actions.default>[0]);
		expect((result as { status: number }).status).toBe(400);
	});

	it('redirects an anonymous visitor to /login', async () => {
		await expect(
			actions.default({
				...req({ name: 'x' }),
				locals: { user: null }
			} as unknown as Parameters<typeof actions.default>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});

	it('persists comma-separated tags on create', async () => {
		const user = await createMember();
		const name = `New ${Date.now()}_${Math.random()}`;
		try {
			await actions.default({
				...req({ name, tags: 'Gift, Daily, gift' }),
				locals: { user }
			} as unknown as Parameters<typeof actions.default>[0]);
		} catch {
			// action redirects (303) on success
		}
		const [row] = await db.select().from(incense).where(eq(incense.name, name));
		expect(await listTagsForIncense(row.id)).toEqual(['daily', 'gift']);
	});
});

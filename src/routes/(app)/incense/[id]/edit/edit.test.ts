import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, incense, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { setIncenseTags, listTagsForIncense } from '$lib/server/db/tags';
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

function req(id: string, entries: Record<string, string>) {
	const f = new FormData();
	for (const [k, v] of Object.entries(entries)) f.set(k, v);
	return { params: { id }, request: { formData: async () => f } };
}

describe('/incense/[id]/edit', () => {
	it('updates fields and redirects to the detail page', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Edit ${Date.now()}_${Math.random()}`, brand: 'Old', createdBy: u.id })
			.returning();

		let location = '';
		try {
			await actions.default({
				...req(item.id, { name: item.name, brand: 'New Maker', format: 'coil' }),
				locals: { user: u }
			} as unknown as Parameters<typeof actions.default>[0]);
		} catch (e) {
			location = (e as { location: string }).location;
		}
		const [row] = await db.select().from(incense).where(eq(incense.id, item.id));
		expect(row.brand).toBe('New Maker');
		expect(row.format).toBe('coil');
		expect(location).toBe(`/incense/${item.id}`);
	});

	it('load 404s an unknown id', async () => {
		const u = await member();
		await expect(
			load({
				params: { id: '00000000-0000-0000-0000-000000000000' },
				locals: { user: u }
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 404 });
	});

	it('load prefills existing tags and the action replaces them', async () => {
		const u = await member();
		const [item] = await db
			.insert(incense)
			.values({ name: `Edit ${Date.now()}_${Math.random()}`, createdBy: u.id })
			.returning();
		await setIncenseTags(item.id, ['old']);

		const loaded = (await load({
			params: { id: item.id },
			locals: { user: u }
		} as unknown as Parameters<typeof load>[0])) as { tags: string[] };
		expect(loaded.tags).toEqual(['old']);

		try {
			await actions.default({
				...req(item.id, { name: item.name, tags: 'new1, new2' }),
				locals: { user: u }
			} as unknown as Parameters<typeof actions.default>[0]);
		} catch {
			// action redirects (303) on success
		}
		expect(await listTagsForIncense(item.id)).toEqual(['new1', 'new2']);
	});
});

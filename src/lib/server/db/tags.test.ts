import { describe, it, expect } from 'vitest';
import { db } from './client';
import { users, incense, type User } from './schema';
import { hashPassword } from '$lib/server/auth/password';
import {
	addTagToIncense,
	removeTagFromIncense,
	listTagsForIncense,
	listAllTags,
	setIncenseTags,
	tagsForIncenseIds
} from './tags';

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
async function makeIncense(userId: string) {
	const [item] = await db
		.insert(incense)
		.values({ name: `Tag ${Date.now()}_${Math.random()}`, createdBy: userId })
		.returning();
	return item;
}

describe('tags data access', () => {
	it('adds tags idempotently and lists them alphabetically', async () => {
		const a = await member();
		const item = await makeIncense(a.id);
		await addTagToIncense(item.id, 'Woody');
		await addTagToIncense(item.id, 'woody'); // dup after normalize — no second link
		await addTagToIncense(item.id, 'aloeswood');
		expect(await listTagsForIncense(item.id)).toEqual(['aloeswood', 'woody']);
	});

	it('shares a tag row across items (reuse by name)', async () => {
		const a = await member();
		const i1 = await makeIncense(a.id);
		const i2 = await makeIncense(a.id);
		const uniq = `share_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		await addTagToIncense(i1.id, uniq);
		await addTagToIncense(i2.id, uniq);
		const all = await listAllTags();
		const row = all.find((t) => t.name === uniq);
		expect(row?.count).toBe(2);
	});

	it('removes a tag link from one item without touching another', async () => {
		const a = await member();
		const i1 = await makeIncense(a.id);
		const i2 = await makeIncense(a.id);
		const uniq = `rm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		await addTagToIncense(i1.id, uniq);
		await addTagToIncense(i2.id, uniq);
		await removeTagFromIncense(i1.id, uniq);
		expect(await listTagsForIncense(i1.id)).not.toContain(uniq);
		expect(await listTagsForIncense(i2.id)).toContain(uniq);
	});

	it('setIncenseTags replaces the whole set', async () => {
		const a = await member();
		const item = await makeIncense(a.id);
		await setIncenseTags(item.id, ['one', 'two']);
		expect(await listTagsForIncense(item.id)).toEqual(['one', 'two']);
		await setIncenseTags(item.id, ['two', 'three']);
		expect(await listTagsForIncense(item.id)).toEqual(['three', 'two']);
	});

	it('tagsForIncenseIds groups names by incense id', async () => {
		const a = await member();
		const i1 = await makeIncense(a.id);
		const i2 = await makeIncense(a.id);
		await setIncenseTags(i1.id, ['x1', 'x2']);
		await setIncenseTags(i2.id, ['y1']);
		const map = await tagsForIncenseIds([i1.id, i2.id]);
		expect(map.get(i1.id)).toEqual(['x1', 'x2']);
		expect(map.get(i2.id)).toEqual(['y1']);
	});
});

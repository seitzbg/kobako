import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from './client';
import { tags, incenseTags } from './schema';
import { normalizeTag } from '$lib/incense';

export async function listTagsForIncense(incenseId: string): Promise<string[]> {
	const rows = await db
		.select({ name: tags.name })
		.from(incenseTags)
		.innerJoin(tags, eq(tags.id, incenseTags.tagId))
		.where(eq(incenseTags.incenseId, incenseId))
		.orderBy(tags.name);
	return rows.map((r) => r.name);
}

export async function listAllTags(): Promise<{ name: string; count: number }[]> {
	return db
		.select({ name: tags.name, count: sql<number>`count(${incenseTags.incenseId})::int` })
		.from(tags)
		.innerJoin(incenseTags, eq(incenseTags.tagId, tags.id))
		.groupBy(tags.id)
		.orderBy(tags.name);
}

export async function addTagToIncense(incenseId: string, tagName: string): Promise<void> {
	const name = normalizeTag(tagName);
	if (!name) return;
	await db.insert(tags).values({ name }).onConflictDoNothing({ target: tags.name });
	const [tag] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name));
	if (!tag) return;
	await db.insert(incenseTags).values({ incenseId, tagId: tag.id }).onConflictDoNothing();
}

export async function removeTagFromIncense(incenseId: string, tagName: string): Promise<void> {
	const name = normalizeTag(tagName);
	if (!name) return;
	const [tag] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name));
	if (!tag) return;
	await db
		.delete(incenseTags)
		.where(and(eq(incenseTags.incenseId, incenseId), eq(incenseTags.tagId, tag.id)));
}

export async function setIncenseTags(incenseId: string, names: string[]): Promise<void> {
	await db.delete(incenseTags).where(eq(incenseTags.incenseId, incenseId));
	for (const name of names) {
		await addTagToIncense(incenseId, name);
	}
}

export async function tagsForIncenseIds(ids: string[]): Promise<Map<string, string[]>> {
	const map = new Map<string, string[]>();
	if (!ids.length) return map;
	const rows = await db
		.select({ incenseId: incenseTags.incenseId, name: tags.name })
		.from(incenseTags)
		.innerJoin(tags, eq(tags.id, incenseTags.tagId))
		.where(inArray(incenseTags.incenseId, ids))
		.orderBy(tags.name);
	for (const r of rows) {
		const arr = map.get(r.incenseId) ?? [];
		arr.push(r.name);
		map.set(r.incenseId, arr);
	}
	return map;
}

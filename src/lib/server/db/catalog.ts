import { eq } from 'drizzle-orm';
import { db } from './client';
import { incense, type Incense } from './schema';
import type { IncenseInput } from '$lib/incense';

export async function createIncense(input: IncenseInput, userId: string): Promise<Incense> {
	const [row] = await db
		.insert(incense)
		.values({ ...input, createdBy: userId })
		.returning();
	return row;
}

export async function getIncense(id: string): Promise<Incense | undefined> {
	const [row] = await db.select().from(incense).where(eq(incense.id, id));
	return row;
}

export async function updateIncense(id: string, input: IncenseInput): Promise<Incense | undefined> {
	const [row] = await db
		.update(incense)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(incense.id, id))
		.returning();
	return row;
}

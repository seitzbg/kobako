import { and, eq, desc } from 'drizzle-orm';
import { db } from './client';
import { burnLog, users } from './schema';
import type { BurnEntryInput } from '$lib/incense';

export type BurnLogRow = {
	id: string;
	userId: string;
	username: string;
	burnedOn: string;
	rating: number | null;
	notes: string | null;
};

export async function listBurnLogForIncense(incenseId: string): Promise<BurnLogRow[]> {
	return db
		.select({
			id: burnLog.id,
			userId: burnLog.userId,
			username: users.username,
			burnedOn: burnLog.burnedOn,
			rating: burnLog.rating,
			notes: burnLog.notes
		})
		.from(burnLog)
		.innerJoin(users, eq(users.id, burnLog.userId))
		.where(eq(burnLog.incenseId, incenseId))
		.orderBy(desc(burnLog.burnedOn), desc(burnLog.createdAt));
}

export async function addBurnEntry(
	incenseId: string,
	userId: string,
	entry: BurnEntryInput
): Promise<void> {
	await db.insert(burnLog).values({ incenseId, userId, ...entry });
}

export async function deleteBurnEntry(entryId: string, userId: string): Promise<void> {
	await db.delete(burnLog).where(and(eq(burnLog.id, entryId), eq(burnLog.userId, userId)));
}

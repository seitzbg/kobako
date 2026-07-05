import { eq, sql, desc } from 'drizzle-orm';
import { db } from './client';
import { incense, reviews, type Incense } from './schema';
import type { IncenseInput, Format, ScentFamily } from '$lib/incense';

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

export type IncenseSummary = {
	id: string;
	name: string;
	brand: string | null;
	format: Format | null;
	scentFamily: ScentFamily | null;
	reviewCount: number;
	avgOverall: number | null;
};

export async function listIncenseSummaries(): Promise<IncenseSummary[]> {
	const rows = await db
		.select({
			id: incense.id,
			name: incense.name,
			brand: incense.brand,
			format: incense.format,
			scentFamily: incense.scentFamily,
			reviewCount: sql<number>`count(${reviews.id})::int`,
			avgOverall: sql<number | null>`round(avg(${reviews.overall}), 1)::float8`
		})
		.from(incense)
		.leftJoin(reviews, eq(reviews.incenseId, incense.id))
		.groupBy(incense.id)
		.orderBy(desc(incense.createdAt));
	return rows as IncenseSummary[];
}

import { eq, sql, desc } from 'drizzle-orm';
import { db } from './client';
import { incense, reviews, users, type Incense, type Review } from './schema';
import type { IncenseInput, ReviewInput, Format, ScentFamily } from '$lib/incense';

export async function createIncense(
	input: IncenseInput,
	userId: string,
	imagePath: string | null = null
): Promise<Incense> {
	const [row] = await db
		.insert(incense)
		.values({ ...input, imagePath, createdBy: userId })
		.returning();
	return row;
}

export async function getIncense(id: string): Promise<Incense | undefined> {
	const [row] = await db.select().from(incense).where(eq(incense.id, id));
	return row;
}

export async function findBySourceUrl(url: string): Promise<Incense | undefined> {
	const [row] = await db.select().from(incense).where(eq(incense.sourceUrl, url));
	return row;
}

export async function findSimilarByName(name: string): Promise<Incense | undefined> {
	const [row] = await db
		.select()
		.from(incense)
		.where(sql`lower(${incense.name}) = lower(${name})`)
		.limit(1);
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
	imagePath: string | null;
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
			imagePath: incense.imagePath,
			reviewCount: sql<number>`count(${reviews.id})::int`,
			avgOverall: sql<number | null>`round(avg(${reviews.overall}), 1)::float8`
		})
		.from(incense)
		.leftJoin(reviews, eq(reviews.incenseId, incense.id))
		.groupBy(incense.id)
		.orderBy(desc(incense.createdAt));
	return rows as IncenseSummary[];
}

export type ReviewWithUser = Review & { username: string };

export async function listReviewsForIncense(id: string): Promise<ReviewWithUser[]> {
	const rows = await db
		.select({ review: reviews, username: users.username })
		.from(reviews)
		.innerJoin(users, eq(users.id, reviews.userId))
		.where(eq(reviews.incenseId, id))
		.orderBy(users.username);
	return rows.map((r) => ({ ...r.review, username: r.username }));
}

export async function upsertReview(
	incenseId: string,
	userId: string,
	input: ReviewInput
): Promise<Review> {
	const [row] = await db
		.insert(reviews)
		.values({ incenseId, userId, ...input })
		.onConflictDoUpdate({
			target: [reviews.incenseId, reviews.userId],
			set: {
				scent: input.scent,
				throwSmoke: input.throwSmoke,
				longevity: input.longevity,
				value: input.value,
				overall: input.overall,
				reviewText: input.reviewText,
				updatedAt: new Date()
			}
		})
		.returning();
	return row;
}

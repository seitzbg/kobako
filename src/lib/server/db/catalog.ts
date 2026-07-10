import { and, or, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from './client';
import { incense, reviews, users, collection, type Incense, type Review } from './schema';
import type {
	IncenseInput,
	ReviewInput,
	CatalogFilters,
	CollectionStatus,
	IncenseSummary
} from '$lib/incense';

export type { IncenseSummary } from '$lib/incense';

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

// Escape LIKE/ILIKE wildcards so user-supplied text matches literally.
// Postgres uses backslash as the default ESCAPE character.
export function escapeLike(s: string): string {
	return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const EMPTY_FILTERS: CatalogFilters = {
	q: '',
	formats: [],
	scents: [],
	statuses: [],
	tags: [],
	sort: 'newest'
};

export async function listIncenseSummaries(
	userId: string,
	filters: CatalogFilters = EMPTY_FILTERS
): Promise<IncenseSummary[]> {
	const { formats, scents, statuses, sort } = filters;
	const term = filters.q.trim();

	const conditions: SQL[] = [];
	if (term) {
		const like = `%${escapeLike(term)}%`;
		conditions.push(
			or(
				ilike(incense.name, like),
				ilike(incense.brand, like),
				ilike(incense.origin, like),
				ilike(incense.ingredients, like),
				ilike(incense.description, like)
			)!
		);
	}
	if (formats.length) conditions.push(inArray(incense.format, formats));
	if (scents.length) conditions.push(inArray(incense.scentFamily, scents));
	if (statuses.length) conditions.push(inArray(collection.status, statuses));

	const avg = sql`avg(${reviews.overall})`;
	const cnt = sql`count(${reviews.id})`;
	const createdDesc = sql`${incense.createdAt} desc`;
	const orderBy: SQL[] =
		sort === 'name'
			? [sql`lower(${incense.name}) asc`]
			: sort === 'top'
				? [sql`${avg} desc nulls last`, sql`${cnt} desc`, createdDesc]
				: sort === 'most_reviewed'
					? [sql`${cnt} desc`, sql`${avg} desc nulls last`, createdDesc]
					: [createdDesc];

	const rows = await db
		.select({
			id: incense.id,
			name: incense.name,
			brand: incense.brand,
			format: incense.format,
			scentFamily: incense.scentFamily,
			imagePath: incense.imagePath,
			reviewCount: sql<number>`count(${reviews.id})::int`,
			avgOverall: sql<number | null>`round(avg(${reviews.overall}), 1)::float8`,
			myStatus: sql<CollectionStatus | null>`max(${collection.status})`
		})
		.from(incense)
		.leftJoin(reviews, eq(reviews.incenseId, incense.id))
		.leftJoin(collection, and(eq(collection.incenseId, incense.id), eq(collection.userId, userId)))
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(incense.id)
		.orderBy(...orderBy);

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

export async function setCollectionStatus(
	incenseId: string,
	userId: string,
	status: CollectionStatus | null
): Promise<void> {
	if (status === null) {
		await db
			.delete(collection)
			.where(and(eq(collection.incenseId, incenseId), eq(collection.userId, userId)));
		return;
	}
	await db
		.insert(collection)
		.values({ incenseId, userId, status })
		.onConflictDoUpdate({
			target: [collection.incenseId, collection.userId],
			set: { status, updatedAt: new Date() }
		});
}

export async function getMyCollectionStatus(
	incenseId: string,
	userId: string
): Promise<CollectionStatus | undefined> {
	const [row] = await db
		.select({ status: collection.status })
		.from(collection)
		.where(and(eq(collection.incenseId, incenseId), eq(collection.userId, userId)));
	return row?.status;
}

export async function listCollectionForIncense(
	incenseId: string
): Promise<{ username: string; status: CollectionStatus }[]> {
	return db
		.select({ username: users.username, status: collection.status })
		.from(collection)
		.innerJoin(users, eq(users.id, collection.userId))
		.where(eq(collection.incenseId, incenseId))
		.orderBy(users.username);
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

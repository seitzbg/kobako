import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { sessions, users, type Session, type User } from '../db/schema';

export const SESSION_COOKIE = 'kobako_session';
const DAY = 1000 * 60 * 60 * 24;

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(token: string, userId: string): Promise<Session> {
	const id = hashToken(token);
	const expiresAt = new Date(Date.now() + 30 * DAY);
	const [session] = await db.insert(sessions).values({ id, userId, expiresAt }).returning();
	return session;
}

export async function validateSessionToken(
	token: string
): Promise<{ session: Session; user: User } | { session: null; user: null }> {
	const id = hashToken(token);
	const [row] = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id));

	if (!row) return { session: null, user: null };

	if (Date.now() >= row.session.expiresAt.getTime()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return { session: null, user: null };
	}

	// Sliding refresh
	if (Date.now() >= row.session.expiresAt.getTime() - 15 * DAY) {
		const expiresAt = new Date(Date.now() + 30 * DAY);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
		row.session.expiresAt = expiresAt;
	}

	return { session: row.session, user: row.user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

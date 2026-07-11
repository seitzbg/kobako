import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users, sessions } from '../db/schema';
import { hashPassword } from './password';
import {
	generateSessionToken,
	createSession,
	validateSessionToken,
	invalidateSession
} from './session';

let userId: string;

beforeEach(async () => {
	const [u] = await db
		.insert(users)
		.values({
			username: `sess_${Date.now()}`,
			passwordHash: await hashPassword('x'),
			role: 'member'
		})
		.returning();
	userId = u.id;
});

describe('sessions', () => {
	it('creates, validates, and invalidates a session', async () => {
		const token = generateSessionToken();
		const created = await createSession(token, userId);
		expect(created.userId).toBe(userId);

		const ok = await validateSessionToken(token);
		expect(ok.user?.id).toBe(userId);

		await invalidateSession(created.id);
		const gone = await validateSessionToken(token);
		expect(gone.session).toBeNull();
	});

	it('rejects and deletes an expired session', async () => {
		const token = generateSessionToken();
		const s = await createSession(token, userId);

		await db
			.update(sessions)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(sessions.id, s.id));

		const result = await validateSessionToken(token);
		expect(result).toEqual({ session: null, user: null });

		const rows = await db.select().from(sessions).where(eq(sessions.id, s.id));
		expect(rows).toHaveLength(0);
	});

	it('slides the expiry forward when under 15 days remain', async () => {
		const token = generateSessionToken();
		const s = await createSession(token, userId);

		await db
			.update(sessions)
			.set({ expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) })
			.where(eq(sessions.id, s.id));

		const result = await validateSessionToken(token);
		expect(result.session).not.toBeNull();
		expect(result.user?.id).toBe(userId);

		const [row] = await db.select().from(sessions).where(eq(sessions.id, s.id));
		const daysRemaining = (row.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(daysRemaining).toBeGreaterThan(29);
	});
});

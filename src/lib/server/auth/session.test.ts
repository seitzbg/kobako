import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db/client';
import { users } from '../db/schema';
import { hashPassword } from './password';
import {
	generateSessionToken,
	createSession,
	validateSessionToken,
	invalidateSession
} from './session';

let userId: string;

beforeAll(async () => {
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
});

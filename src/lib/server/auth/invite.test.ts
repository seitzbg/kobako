import { describe, it, expect } from 'vitest';
import { db } from '../db/client';
import { users } from '../db/schema';
import { hashPassword } from './password';
import { createInvite, consumeInvite } from './invite';
import { createUser } from './user';

describe('invites & users', () => {
	it('an invite can be consumed exactly once', async () => {
		const invite = await createInvite(null);
		expect(invite.token).toBeTruthy();
		const first = await consumeInvite(invite.token);
		expect(first?.id).toBe(invite.id);
		const second = await consumeInvite(invite.token);
		expect(second).toBeNull();
	});

	it('creates a user with a hashed password', async () => {
		const u = await createUser(`user_${Date.now()}`, 'hunter2hunter2');
		expect(u.passwordHash).not.toContain('hunter2');
		expect(['member', 'admin']).toContain(u.role);
	});

	it('assigns member role when users already exist', async () => {
		await db.insert(users).values({
			username: `pre_${Date.now()}`,
			passwordHash: await hashPassword('x'),
			role: 'member'
		});
		const u = await createUser(`user_${Date.now()}`, 'hunter2hunter2');
		expect(u.role).toBe('member');
		expect(u.passwordHash).not.toContain('hunter2');
	});
});

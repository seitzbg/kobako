import { describe, it, expect } from 'vitest';
import { createUser } from './user';

describe('createUser role bootstrapping', () => {
	it('makes the first user an admin and subsequent users members', async () => {
		// users is empty at the start of each test (truncation).
		const first = await createUser(`first_${Date.now()}`, 'hunter2hunter2');
		expect(first.role).toBe('admin');

		const second = await createUser(`second_${Date.now()}`, 'hunter2hunter2');
		expect(second.role).toBe('member');
	});
});

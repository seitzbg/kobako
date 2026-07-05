import { describe, it, expect } from 'vitest';
import { db } from './client';
import { users } from './schema';

describe('schema', () => {
	it('can select from users (table exists, empty)', async () => {
		const rows = await db.select().from(users);
		expect(Array.isArray(rows)).toBe(true);
	});
});

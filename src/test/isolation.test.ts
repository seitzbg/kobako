import { describe, it, expect } from 'vitest';
import { sql, db } from '../lib/server/db/client';
import { users } from '../lib/server/db/schema';

describe('test isolation', () => {
	it("connects to this worker's dedicated database", async () => {
		// VITEST_POOL_ID (not VITEST_WORKER_ID) is the bounded 1..maxWorkers slot
		// id — see the comment in setup.ts for why.
		const pool = process.env.VITEST_POOL_ID ?? '1';
		const [{ current_database }] = await sql<
			{ current_database: string }[]
		>`SELECT current_database()`;
		expect(current_database).toBe(`kobako_test_w${pool}`);
	});

	it('starts a test with an empty users table, then inserts one', async () => {
		expect(await db.select().from(users)).toHaveLength(0);
		await db.insert(users).values({ username: 'iso_probe', passwordHash: 'x', role: 'member' });
		expect(await db.select().from(users)).toHaveLength(1);
	});

	it('sees users empty again next test — the previous insert was truncated', async () => {
		expect(await db.select().from(users)).toHaveLength(0);
	});
});

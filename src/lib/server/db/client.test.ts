import { describe, it, expect } from 'vitest';
import { sql } from './client';

describe('db client', () => {
	it('connects and runs a trivial query', async () => {
		const rows = await sql`select 1 as n`;
		expect(rows[0].n).toBe(1);
	});
});

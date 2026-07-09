import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { users, incense, burnLog, type User } from './schema';
import { hashPassword } from '$lib/server/auth/password';
import { addBurnEntry, deleteBurnEntry, listBurnLogForIncense } from './burnLog';

async function member(): Promise<User> {
	const [u] = await db
		.insert(users)
		.values({
			username: `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			passwordHash: await hashPassword('x'),
			role: 'member'
		})
		.returning();
	return u;
}

async function makeIncense(userId: string) {
	const [item] = await db
		.insert(incense)
		.values({ name: `Burn ${Date.now()}_${Math.random()}`, createdBy: userId })
		.returning();
	return item;
}

describe('burn log data access', () => {
	it('adds an entry and lists it with the username', async () => {
		const a = await member();
		const item = await makeIncense(a.id);
		await addBurnEntry(item.id, a.id, { burnedOn: '2026-01-05', rating: 4, notes: 'warm' });

		const rows = await listBurnLogForIncense(item.id);
		expect(rows.length).toBe(1);
		expect(rows[0]).toMatchObject({
			userId: a.id,
			username: a.username,
			burnedOn: '2026-01-05',
			rating: 4,
			notes: 'warm'
		});
	});

	it('orders entries newest burn-date first', async () => {
		const a = await member();
		const item = await makeIncense(a.id);
		await addBurnEntry(item.id, a.id, { burnedOn: '2026-01-01', rating: null, notes: null });
		await addBurnEntry(item.id, a.id, { burnedOn: '2026-03-01', rating: null, notes: null });
		await addBurnEntry(item.id, a.id, { burnedOn: '2026-02-01', rating: null, notes: null });

		const rows = await listBurnLogForIncense(item.id);
		expect(rows.map((r) => r.burnedOn)).toEqual(['2026-03-01', '2026-02-01', '2026-01-01']);
	});

	it('shares entries — another user’s burn shows in the list', async () => {
		const a = await member();
		const b = await member();
		const item = await makeIncense(a.id);
		await addBurnEntry(item.id, a.id, { burnedOn: '2026-01-01', rating: null, notes: null });
		await addBurnEntry(item.id, b.id, {
			burnedOn: '2026-01-02',
			rating: null,
			notes: 'b was here'
		});

		const rows = await listBurnLogForIncense(item.id);
		expect(rows.length).toBe(2);
		expect(rows.some((r) => r.userId === b.id && r.notes === 'b was here')).toBe(true);
	});

	it('delete is owner-scoped — cannot delete another user’s entry', async () => {
		const a = await member();
		const b = await member();
		const item = await makeIncense(a.id);
		await addBurnEntry(item.id, a.id, { burnedOn: '2026-01-01', rating: null, notes: 'a-only' });
		const [entry] = await db.select().from(burnLog).where(eq(burnLog.incenseId, item.id));

		await deleteBurnEntry(entry.id, b.id); // wrong owner — no-op
		expect((await listBurnLogForIncense(item.id)).length).toBe(1);

		await deleteBurnEntry(entry.id, a.id); // correct owner
		expect((await listBurnLogForIncense(item.id)).length).toBe(0);
	});
});

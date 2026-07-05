import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { users, invites, type User } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';
import { load, actions } from './+page.server';

async function createAdmin(): Promise<User> {
	const [admin] = await db
		.insert(users)
		.values({
			username: `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			passwordHash: await hashPassword('x'),
			role: 'admin'
		})
		.returning();
	return admin;
}

describe('/invites', () => {
	it('lets an admin create an invite', async () => {
		const admin = await createAdmin();

		const result = await actions.default({
			locals: { user: admin }
		} as unknown as Parameters<typeof actions.default>[0]);

		expect(typeof (result as { created: string }).created).toBe('string');

		const token = (result as { created: string }).created;
		const [row] = await db.select().from(invites).where(eq(invites.token, token));
		expect(row).toBeDefined();
		expect(row.createdBy).toBe(admin.id);
	});

	it('lets an admin list outstanding invites', async () => {
		const admin = await createAdmin();
		await actions.default({
			locals: { user: admin }
		} as unknown as Parameters<typeof actions.default>[0]);

		const result = await load({
			locals: { user: admin }
		} as unknown as Parameters<typeof load>[0]);

		expect(Array.isArray((result as { invites: unknown[] }).invites)).toBe(true);
	});

	it('forbids a member from listing invites', async () => {
		const member = { id: 'x', role: 'member' } as unknown as User;

		await expect(
			load({ locals: { user: member } } as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 403 });
	});

	it('redirects a signed-out visitor to /login', async () => {
		await expect(
			load({ locals: { user: null } } as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});

	it('forbids a member from creating an invite', async () => {
		const member = { id: 'x', role: 'member' } as unknown as User;

		await expect(
			actions.default({
				locals: { user: member }
			} as unknown as Parameters<typeof actions.default>[0])
		).rejects.toMatchObject({ status: 403 });
	});

	it('redirects a signed-out visitor who tries to create an invite', async () => {
		await expect(
			actions.default({
				locals: { user: null }
			} as unknown as Parameters<typeof actions.default>[0])
		).rejects.toMatchObject({ status: 303, location: '/login' });
	});

	it('lists invites newest-first', async () => {
		const admin = await createAdmin();
		const first = (await actions.default({
			locals: { user: admin }
		} as unknown as Parameters<typeof actions.default>[0])) as { created: string };
		const second = (await actions.default({
			locals: { user: admin }
		} as unknown as Parameters<typeof actions.default>[0])) as { created: string };

		const result = (await load({
			locals: { user: admin }
		} as unknown as Parameters<typeof load>[0])) as { invites: { token: string }[] };

		const tokens = result.invites.map((i) => i.token);
		const idxFirst = tokens.indexOf(first.created);
		const idxSecond = tokens.indexOf(second.created);
		expect(idxFirst).toBeGreaterThanOrEqual(0);
		expect(idxSecond).toBeGreaterThanOrEqual(0);
		// newest-first: the later-created invite sorts before the earlier one,
		// regardless of any other invites in the shared DB.
		expect(idxSecond).toBeLessThan(idxFirst);
	});
});

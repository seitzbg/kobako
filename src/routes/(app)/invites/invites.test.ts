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
});

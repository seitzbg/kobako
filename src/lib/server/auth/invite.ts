import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { invites, type Invite } from '../db/schema';

export async function createInvite(createdBy: string | null): Promise<Invite> {
	const token = randomBytes(24).toString('hex');
	const [invite] = await db.insert(invites).values({ token, createdBy }).returning();
	return invite;
}

export async function consumeInvite(token: string): Promise<Invite | null> {
	// Atomic: only update rows that are unused, return the updated row (or nothing).
	const [invite] = await db
		.update(invites)
		.set({ usedAt: new Date() })
		.where(and(eq(invites.token, token), isNull(invites.usedAt)))
		.returning();
	return invite ?? null;
}

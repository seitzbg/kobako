import { sql as raw } from 'drizzle-orm';
import { db } from '../db/client';
import { users, type User } from '../db/schema';
import { hashPassword } from './password';

export async function createUser(username: string, password: string): Promise<User> {
	const passwordHash = await hashPassword(password);
	const [{ count }] = await db.select({ count: raw<number>`count(*)::int` }).from(users);
	const role = count === 0 ? 'admin' : 'member';
	const [user] = await db.insert(users).values({ username, passwordHash, role }).returning();
	return user;
}

import { redirect, error } from '@sveltejs/kit';
import type { User } from '$lib/server/db/schema';

type HasUser = { user: User | null };

export function requireUser(locals: HasUser): User {
	if (!locals.user) throw redirect(303, '/login');
	return locals.user;
}

export function requireAdmin(locals: HasUser): User {
	const user = requireUser(locals);
	if (user.role !== 'admin') throw error(403, 'Admins only.');
	return user;
}

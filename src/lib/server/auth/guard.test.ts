import { describe, it, expect } from 'vitest';
import { requireUser, requireAdmin } from './guard';
import type { User } from '$lib/server/db/schema';

const admin = { id: '1', role: 'admin' } as unknown as User;
const member = { id: '2', role: 'member' } as unknown as User;

describe('guards', () => {
	it('requireUser throws a 303 redirect to /login when signed out', () => {
		try {
			requireUser({ user: null });
			expect.unreachable('requireUser should have thrown');
		} catch (e) {
			expect(e).toMatchObject({ status: 303, location: '/login' });
		}
	});
	it('requireUser returns the user when signed in', () => {
		expect(requireUser({ user: member }).id).toBe('2');
	});
	it('requireAdmin throws a 403 for a member', () => {
		try {
			requireAdmin({ user: member });
			expect.unreachable('requireAdmin should have thrown');
		} catch (e) {
			expect(e).toMatchObject({ status: 403 });
		}
	});
	it('requireAdmin throws a 303 redirect when signed out (redirect wins over 403)', () => {
		try {
			requireAdmin({ user: null });
			expect.unreachable('requireAdmin should have thrown');
		} catch (e) {
			expect(e).toMatchObject({ status: 303, location: '/login' });
		}
	});
	it('requireAdmin returns the admin', () => {
		expect(requireAdmin({ user: admin }).id).toBe('1');
	});
});

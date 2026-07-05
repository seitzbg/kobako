import { describe, it, expect } from 'vitest';
import { requireUser, requireAdmin } from './guard';
import type { User } from '$lib/server/db/schema';

const admin = { id: '1', role: 'admin' } as unknown as User;
const member = { id: '2', role: 'member' } as unknown as User;

describe('guards', () => {
	it('requireUser throws a redirect when signed out', () => {
		expect(() => requireUser({ user: null })).toThrow();
	});
	it('requireUser returns the user when signed in', () => {
		expect(requireUser({ user: member }).id).toBe('2');
	});
	it('requireAdmin throws for a member', () => {
		expect(() => requireAdmin({ user: member })).toThrow();
	});
	it('requireAdmin returns the admin', () => {
		expect(requireAdmin({ user: admin }).id).toBe('1');
	});
});

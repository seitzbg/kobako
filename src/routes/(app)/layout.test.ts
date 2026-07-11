import { describe, it, expect } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import type { User } from '$lib/server/db/schema';
import { load } from './+layout.server';

const member = { id: '1', username: 'm', role: 'member' } as unknown as User;

describe('(app) layout guard', () => {
	it('redirects to /login when signed out', () => {
		let caught: unknown;
		try {
			load({ locals: { user: null } } as unknown as Parameters<typeof load>[0]);
		} catch (e) {
			caught = e;
		}
		expect(isRedirect(caught)).toBe(true);
	});

	it('returns cleanly when signed in', () => {
		const result = load({ locals: { user: member } } as unknown as Parameters<typeof load>[0]);
		expect(result).toEqual({});
	});
});

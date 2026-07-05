import { describe, it, expect } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { setSessionCookie, deleteSessionCookie } from './cookies';

function fakeCookies() {
	const store: Record<string, unknown> = {};
	return {
		store,
		set: (name: string, value: string, opts: unknown) => (store[name] = { value, opts }),
		delete: (name: string) => (store[name] = { deleted: true })
	} as unknown as Cookies & { store: Record<string, unknown> };
}

describe('session cookie helpers', () => {
	it('sets an httpOnly cookie and deletes it', () => {
		const c = fakeCookies();
		setSessionCookie(c, 'tok', new Date(Date.now() + 1000));
		expect((c.store['kobako_session'] as { opts: { httpOnly: boolean } }).opts.httpOnly).toBe(true);
		deleteSessionCookie(c);
		expect((c.store['kobako_session'] as { deleted: boolean }).deleted).toBe(true);
	});
});

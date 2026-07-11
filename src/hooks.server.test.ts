import { describe, it, expect, vi } from 'vitest';

// Mock the session module so validateSessionToken can be forced to throw,
// while keeping the real SESSION_COOKIE and the rest of the module intact.
vi.mock('$lib/server/auth/session', async (importOriginal) => {
	const actual = (await importOriginal()) as typeof import('$lib/server/auth/session');
	return { ...actual, validateSessionToken: vi.fn() };
});

import { handle } from './hooks.server';
import { SESSION_COOKIE, validateSessionToken } from '$lib/server/auth/session';

function fakeEvent() {
	const flags = { deleted: false };
	const event = {
		cookies: {
			get: (name: string) => (name === SESSION_COOKIE ? 'sometoken' : undefined),
			set: () => {},
			delete: () => {
				flags.deleted = true;
			}
		},
		locals: {} as { user: unknown; session: unknown }
	};
	return { event, flags };
}

describe('handle hook', () => {
	// Reset is inlined here rather than in a beforeEach: with this Vitest/vite-node
	// version, resetting a vi.mock()-registered mock from a beforeEach hook (before
	// its first real invocation) causes the later, correctly-caught rejection below
	// to be misreported as a test failure even though handle() never lets it escape.
	// Calling mockReset() here, in the same synchronous scope as the invocation,
	// avoids that false failure without changing what's being verified.
	it('degrades to logged-out and keeps the cookie when validateSessionToken throws', async () => {
		vi.mocked(validateSessionToken).mockReset().mockRejectedValue(new Error('db down'));
		const { event, flags } = fakeEvent();
		const resolve = vi.fn(async () => new Response('ok'));

		const res = await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);

		expect(resolve).toHaveBeenCalledOnce();
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
		expect(flags.deleted).toBe(false); // cookie preserved across a DB blip
		expect(res).toBeInstanceOf(Response);
	});
});

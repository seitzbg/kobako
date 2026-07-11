import { describe, it, expect, beforeEach } from 'vitest';
import { hit, __resetRateLimits } from './rateLimit';

describe('rate limiter (fixed window)', () => {
	beforeEach(() => __resetRateLimits());

	it('allows up to the limit then blocks within the same window', () => {
		const clock = () => 1000;
		for (let i = 0; i < 3; i++) {
			expect(hit('k', 3, 1000, clock).allowed).toBe(true);
		}
		const blocked = hit('k', 3, 1000, clock);
		expect(blocked.allowed).toBe(false);
		expect(blocked.retryAfterSec).toBeGreaterThan(0);
	});

	it('resets after the window elapses', () => {
		let t = 0;
		const clock = () => t;
		expect(hit('k2', 1, 1000, clock).allowed).toBe(true);
		expect(hit('k2', 1, 1000, clock).allowed).toBe(false);
		t = 1000; // window boundary reached
		expect(hit('k2', 1, 1000, clock).allowed).toBe(true);
	});

	it('tracks keys independently', () => {
		const clock = () => 500;
		expect(hit('a', 1, 1000, clock).allowed).toBe(true);
		expect(hit('a', 1, 1000, clock).allowed).toBe(false);
		expect(hit('b', 1, 1000, clock).allowed).toBe(true);
	});
});

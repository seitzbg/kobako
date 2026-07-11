// In-memory fixed-window rate limiter. Right-sized for a single self-hosted
// instance: state lives in-process and resets on restart. Keys are bounded by
// distinct client IPs and reset lazily on first access after the window ends.
type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

export function hit(
	key: string,
	limit: number,
	windowMs: number,
	now: () => number = Date.now
): RateLimitResult {
	const t = now();
	const b = buckets.get(key);
	if (!b || t - b.windowStart >= windowMs) {
		buckets.set(key, { count: 1, windowStart: t });
		return { allowed: true, retryAfterSec: 0 };
	}
	b.count += 1;
	if (b.count > limit) {
		return { allowed: false, retryAfterSec: Math.ceil((b.windowStart + windowMs - t) / 1000) };
	}
	return { allowed: true, retryAfterSec: 0 };
}

// Test-only: clear shared state between tests.
export function __resetRateLimits(): void {
	buckets.clear();
}

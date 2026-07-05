import { describe, it, expect, vi, afterEach } from 'vitest';
import { assertPublicUrl, safeFetch, SsrfError } from './ssrf';

describe('assertPublicUrl', () => {
	it('accepts a normal public https URL', async () => {
		await expect(assertPublicUrl('https://example.com/x')).resolves.toBeInstanceOf(URL);
	});

	it('rejects non-http(s) schemes', async () => {
		await expect(assertPublicUrl('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfError);
		await expect(assertPublicUrl('ftp://example.com')).rejects.toBeInstanceOf(SsrfError);
		await expect(assertPublicUrl('javascript:alert(1)')).rejects.toBeInstanceOf(SsrfError);
	});

	it('rejects literal private / loopback / link-local hosts', async () => {
		for (const u of [
			'http://127.0.0.1/',
			'http://localhost/',
			'http://10.0.0.5/',
			'http://192.168.1.1/',
			'http://169.254.169.254/', // cloud metadata
			'http://[::1]/',
			'http://0.0.0.0/'
		]) {
			await expect(assertPublicUrl(u)).rejects.toBeInstanceOf(SsrfError);
		}
	});

	it('blocks alternate IPv4 encodings that normalize to a private address', async () => {
		// new URL() normalizes these to dotted-quad before we check them.
		for (const u of [
			'http://2130706433/',
			'http://0x7f000001/',
			'http://0177.0.0.1/',
			'http://127.1/'
		]) {
			await expect(assertPublicUrl(u)).rejects.toBeInstanceOf(SsrfError);
		}
	});

	it('blocks IPv4-mapped IPv6 loopback', async () => {
		await expect(assertPublicUrl('http://[::ffff:127.0.0.1]/')).rejects.toBeInstanceOf(SsrfError);
	});
});

describe('safeFetch guards (mocked fetch, literal public IPs to avoid DNS)', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('rejects after too many redirects', async () => {
		vi.stubGlobal(
			'fetch',
			async () => new Response(null, { status: 302, headers: { location: 'https://8.8.4.4/next' } })
		);
		await expect(safeFetch('https://8.8.8.8/start', { maxRedirects: 1 })).rejects.toBeInstanceOf(
			SsrfError
		);
	});

	it('rejects a redirect that points at a private address', async () => {
		vi.stubGlobal(
			'fetch',
			async () =>
				new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } })
		);
		await expect(safeFetch('https://8.8.8.8/start')).rejects.toBeInstanceOf(SsrfError);
	});

	it('enforces the byte cap mid-stream', async () => {
		vi.stubGlobal(
			'fetch',
			async () =>
				new Response(new Uint8Array(1000), {
					status: 200,
					headers: { 'content-type': 'text/plain' }
				})
		);
		await expect(safeFetch('https://8.8.8.8/big', { maxBytes: 100 })).rejects.toThrow(
			/size limit/i
		);
	});

	it('returns the body under the cap', async () => {
		vi.stubGlobal(
			'fetch',
			async () => new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } })
		);
		const r = await safeFetch('https://8.8.8.8/ok', { maxBytes: 100 });
		expect(r.status).toBe(200);
		expect(r.body.toString('utf8')).toBe('hello');
	});
});

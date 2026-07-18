import { describe, it, expect, vi, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { assertPublicUrl, safeFetch, SsrfError, FetchError, type Transport } from './ssrf';

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

describe('safeFetch guards (stub transport, literal public IPs to avoid DNS)', () => {
	afterEach(() => vi.unstubAllGlobals());

	/** Minimal stand-in for a node:https response. */
	const reply = (
		status: number,
		body: string | Uint8Array = '',
		headers: Record<string, string> = {}
	): Transport => {
		return async () => ({
			status,
			headers,
			body: Readable.from([Buffer.from(body as Uint8Array)])
		});
	};

	it('rejects after too many redirects', async () => {
		const transport = reply(302, '', { location: 'https://8.8.4.4/next' });
		await expect(
			safeFetch('https://8.8.8.8/start', { maxRedirects: 1, transport })
		).rejects.toBeInstanceOf(SsrfError);
	});

	it('rejects a redirect that points at a private address', async () => {
		const transport = reply(302, '', { location: 'http://169.254.169.254/' });
		await expect(safeFetch('https://8.8.8.8/start', { transport })).rejects.toBeInstanceOf(
			SsrfError
		);
	});

	it('enforces the byte cap mid-stream', async () => {
		const transport = reply(200, new Uint8Array(1000), { 'content-type': 'text/plain' });
		await expect(safeFetch('https://8.8.8.8/big', { maxBytes: 100, transport })).rejects.toThrow(
			/size limit/i
		);
	});

	it('returns the body under the cap', async () => {
		const transport = reply(200, 'hello', { 'content-type': 'text/plain' });
		const r = await safeFetch('https://8.8.8.8/ok', { maxBytes: 100, transport });
		expect(r.status).toBe(200);
		expect(r.body.toString('utf8')).toBe('hello');
	});

	// A shop edge that rate-limits or blocks us returns a short non-HTML body.
	// Handing that to the extractor yields all-nulls, which reaches the user as a
	// silent blank form, so a non-2xx must fail loudly instead of being parsed.
	it('throws on a non-2xx response rather than returning the error body', async () => {
		const transport = reply(429, 'local_rate_limited', { 'content-type': 'text/plain' });
		await expect(safeFetch('https://8.8.8.8/blocked', { transport })).rejects.toMatchObject({
			status: 429
		});
		await expect(safeFetch('https://8.8.8.8/blocked', { transport })).rejects.toThrow(/429/);
	});

	it('throws on 404 too', async () => {
		await expect(
			safeFetch('https://8.8.8.8/gone', { transport: reply(404, 'nope') })
		).rejects.toBeInstanceOf(FetchError);
	});

	it('identifies itself in the User-Agent', async () => {
		let seen: Record<string, string> = {};
		const transport: Transport = async (_u, headers) => {
			seen = headers;
			return { status: 200, headers: {}, body: Readable.from([Buffer.from('ok')]) };
		};
		await safeFetch('https://8.8.8.8/ok', { transport });
		expect(seen['User-Agent']).toMatch(/KobakoImporter/);
	});

	it('decompresses a gzipped body', async () => {
		const transport: Transport = async () => ({
			status: 200,
			headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' },
			body: Readable.from([gzipSync(Buffer.from('<html>hi</html>'))])
		});
		const r = await safeFetch('https://8.8.8.8/gz', { transport });
		expect(r.body.toString('utf8')).toBe('<html>hi</html>');
	});
});

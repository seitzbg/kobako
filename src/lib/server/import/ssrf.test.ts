import { describe, it, expect } from 'vitest';
import { assertPublicUrl, SsrfError } from './ssrf';

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
});

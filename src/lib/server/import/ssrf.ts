import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class SsrfError extends Error {}

// Reject anything that is not a globally-routable unicast address.
function isPrivateIp(ip: string): boolean {
	const v = isIP(ip);
	if (v === 4) {
		const [a, b] = ip.split('.').map(Number);
		if (a === 10) return true;
		if (a === 127) return true; // loopback
		if (a === 0) return true; // "this host"
		if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254)
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
		if (a >= 224) return true; // multicast / reserved
		return false;
	}
	if (v === 6) {
		const l = ip.toLowerCase();
		if (l === '::1' || l === '::') return true; // loopback / unspecified
		if (l.startsWith('fe80')) return true; // link-local
		if (l.startsWith('fc') || l.startsWith('fd')) return true; // unique-local
		if (l.startsWith('::ffff:')) return isPrivateIp(l.slice(7)); // v4-mapped
		return false;
	}
	return true; // unparseable → reject
}

export async function assertPublicUrl(raw: string): Promise<URL> {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new SsrfError('Not a valid URL.');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:')
		throw new SsrfError('Only http and https URLs are allowed.');

	const host = url.hostname.replace(/^\[|\]$/g, '');
	// If host is already a literal IP, check it directly; else resolve all A/AAAA.
	const literals = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
	if (literals.length === 0) throw new SsrfError('Host did not resolve.');
	for (const ip of literals) {
		if (isPrivateIp(ip)) throw new SsrfError(`Refusing to fetch a private address (${ip}).`);
	}
	return url;
}

export async function safeFetch(
	raw: string,
	opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number; accept?: string } = {}
): Promise<{ url: string; status: number; contentType: string; body: Buffer }> {
	const maxBytes = opts.maxBytes ?? 2_000_000;
	const timeoutMs = opts.timeoutMs ?? 8_000;
	const maxRedirects = opts.maxRedirects ?? 3;

	let current = raw;
	for (let hop = 0; hop <= maxRedirects; hop++) {
		await assertPublicUrl(current); // re-validate EVERY hop (DNS-rebinding / redirect SSRF)
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), timeoutMs);
		let res: Response;
		try {
			res = await fetch(current, {
				redirect: 'manual',
				signal: ctrl.signal,
				headers: {
					'User-Agent': 'KobakoImporter/1.0 (+self-hosted incense catalog)',
					Accept: opts.accept ?? 'text/html,application/json;q=0.9,*/*;q=0.8'
				}
			});
		} finally {
			clearTimeout(timer);
		}

		if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
			current = new URL(res.headers.get('location')!, current).toString();
			continue;
		}

		const contentType = res.headers.get('content-type') ?? '';
		const reader = res.body?.getReader();
		const chunks: Uint8Array[] = [];
		let total = 0;
		if (reader) {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				total += value.byteLength;
				if (total > maxBytes) {
					await reader.cancel();
					throw new SsrfError('Response exceeded the size limit.');
				}
				chunks.push(value);
			}
		}
		return { url: current, status: res.status, contentType, body: Buffer.concat(chunks) };
	}
	throw new SsrfError('Too many redirects.');
}

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import type { Readable } from 'node:stream';

export class SsrfError extends Error {}

/** A hop completed but the shop answered with a non-2xx status. */
export class FetchError extends Error {
	constructor(readonly status: number) {
		super(`The shop returned HTTP ${status}.`);
	}
}

const USER_AGENT = 'KobakoImporter/1.0 (+self-hosted incense catalog)';

/**
 * The importer deliberately uses node:https rather than the global fetch().
 *
 * Node's fetch (undici) presents a TLS fingerprint that Cloudflare-fronted shops
 * answer with `429 local_rate_limited` and an 18-byte body. Measured against
 * nipponkodostore.com from the deploy host, same second, same egress IP:
 *   node:https  -> 200 (601,671 bytes), with either a bot or a browser UA
 *   undici      -> 429, with either UA, and with browser-consistent sec-fetch-* headers
 * The User-Agent is not the variable — the client is. Don't "modernise" this back
 * to fetch() without re-running that comparison.
 */
export type HttpResponse = {
	status: number;
	headers: IncomingMessage['headers'];
	body: Readable;
};
export type Transport = (
	url: URL,
	headers: Record<string, string>,
	signal: AbortSignal
) => Promise<HttpResponse>;

const nodeTransport: Transport = (url, headers, signal) =>
	new Promise((resolve, reject) => {
		const send = url.protocol === 'http:' ? httpRequest : httpsRequest;
		const req = send(url, { method: 'GET', headers, signal }, (res) =>
			resolve({ status: res.statusCode ?? 0, headers: res.headers, body: res })
		);
		req.on('error', reject);
		req.end();
	});

/** node:https hands back the raw stream, so content-encoding is ours to undo. */
function decoded(res: HttpResponse): Readable {
	const enc = String(res.headers['content-encoding'] ?? '')
		.split(',')[0]
		.trim()
		.toLowerCase();
	if (enc === 'gzip') return res.body.pipe(createGunzip());
	if (enc === 'deflate') return res.body.pipe(createInflate());
	if (enc === 'br') return res.body.pipe(createBrotliDecompress());
	return res.body;
}

async function readCapped(stream: Readable, maxBytes: number): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let total = 0;
	for await (const chunk of stream) {
		total += (chunk as Buffer).byteLength;
		if (total > maxBytes) {
			stream.destroy();
			throw new SsrfError('Response exceeded the size limit.');
		}
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks);
}

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
		if (/^fe[89ab]/.test(l)) return true; // link-local fe80::/10 (fe80–febf)
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
	opts: {
		maxBytes?: number;
		timeoutMs?: number;
		maxRedirects?: number;
		accept?: string;
		transport?: Transport;
	} = {}
): Promise<{ url: string; status: number; contentType: string; body: Buffer }> {
	const maxBytes = opts.maxBytes ?? 2_000_000;
	const timeoutMs = opts.timeoutMs ?? 8_000;
	const maxRedirects = opts.maxRedirects ?? 3;
	const transport = opts.transport ?? nodeTransport;

	let current = raw;
	for (let hop = 0; hop <= maxRedirects; hop++) {
		// re-validate EVERY hop (DNS-rebinding / redirect SSRF)
		const url = await assertPublicUrl(current);
		const ctrl = new AbortController();
		// One timer for the whole hop — request AND the body read — so a slow-trickle
		// response can't hold the connection open past the deadline. Aborting the
		// signal also aborts the response stream mid-read.
		const timer = setTimeout(() => ctrl.abort(), timeoutMs);
		try {
			const res = await transport(
				url,
				{
					'User-Agent': USER_AGENT,
					Accept: opts.accept ?? 'text/html,application/json;q=0.9,*/*;q=0.8',
					'Accept-Encoding': 'gzip, deflate, br'
				},
				ctrl.signal
			);

			const loc = res.headers.location;
			if (res.status >= 300 && res.status < 400 && loc) {
				res.body.resume(); // drain so the socket can be reused/closed
				current = new URL(loc, current).toString();
				continue;
			}

			// A blocked/missing page still has a body ("local_rate_limited", an error
			// page). Parsing it yields an all-null product, which surfaces to the user
			// as a silently blank form — so fail here instead of returning it.
			if (res.status < 200 || res.status >= 300) {
				res.body.destroy();
				throw new FetchError(res.status);
			}

			const contentType = String(res.headers['content-type'] ?? '');
			const body = await readCapped(decoded(res), maxBytes);
			return { url: current, status: res.status, contentType, body };
		} finally {
			clearTimeout(timer);
		}
	}
	throw new SsrfError('Too many redirects.');
}

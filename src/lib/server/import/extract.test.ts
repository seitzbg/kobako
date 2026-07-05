import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractFromShopifyJson, extractFromHtml, extractProduct } from './extract';

const fx = (f: string) => readFileSync(join(__dirname, 'fixtures', f), 'utf8');

describe('extractFromShopifyJson', () => {
	it('pulls fields from a real Kikoh product.json', () => {
		const r = extractFromShopifyJson(fx('kikoh-mainichi.json'));
		expect(r).not.toBeNull();
		expect(r!.name).toBe('Nippon Kodo Mainichi-koh Incense - Sandalwood');
		expect(r!.brand).toBe('Nippon Kodo');
		expect(r!.price).toBe('10.99');
		expect(r!.imageUrl).toMatch(/^https:\/\/cdn\.shopify\.com\/.+\.jpg/);
		expect(r!.description).toMatch(/Mainichi-koh/);
		expect(r!.description).not.toMatch(/</); // html stripped
	});

	it('returns null for non-product JSON', () => {
		expect(extractFromShopifyJson('{"foo":1}')).toBeNull();
		expect(extractFromShopifyJson('not json')).toBeNull();
	});
});

describe('extractFromHtml', () => {
	it('reads Open Graph from the real Kikoh HTML (no JSON-LD there)', () => {
		const r = extractFromHtml(fx('kikoh-mainichi.html'));
		expect(r.name).toBe('Nippon Kodo Mainichi-koh Incense - Sandalwood');
		expect(r.currency).toBe('USD');
		expect(r.imageUrl).toMatch(/mainichiKoh/i);
	});

	it('prefers JSON-LD Product when present (real Nippon Kodo HTML)', () => {
		const r = extractFromHtml(fx('nipponkodo-chie.html'));
		expect(r.name).toMatch(/CHIE/);
		expect(r.currency).toBe('USD');
	});

	it('handles JSON-LD-only, OG-only, meta-only, and empty synthetic pages', () => {
		const ld = extractFromHtml(fx('jsonld-only.html'));
		expect(ld.name).toBe('JsonLd Incense');
		expect(ld.brand).toBe('LdBrand');
		expect(ld.price).toBe('12.50');
		expect(ld.currency).toBe('EUR');

		const og = extractFromHtml(fx('og-only.html'));
		expect(og.name).toBe('OG Incense');
		expect(og.currency).toBe('GBP');
		expect(og.imageUrl).toBe('https://cdn.example.com/og.jpg');

		const meta = extractFromHtml(fx('meta-only.html'));
		expect(meta.name).toMatch(/Meta Incense/);
		expect(meta.description).toBe('From meta description.');

		const empty = extractFromHtml(fx('empty.html'));
		expect(empty.name).toBeNull();
	});
});

describe('extractProduct (merge)', () => {
	it('merges Shopify .json (rich) with HTML (currency), Shopify winning on shared fields', async () => {
		const fakeFetch = async (u: string) => ({
			url: u,
			status: 200,
			contentType: u.endsWith('.json') ? 'application/json' : 'text/html',
			body: Buffer.from(u.endsWith('.json') ? fx('kikoh-mainichi.json') : fx('kikoh-mainichi.html'))
		});
		const r = await extractProduct('https://kikohincense.com/products/x', fakeFetch as never);
		expect(r.name).toBe('Nippon Kodo Mainichi-koh Incense - Sandalwood');
		expect(r.brand).toBe('Nippon Kodo'); // from .json vendor
		expect(r.price).toBe('10.99'); // from .json variant
		expect(r.currency).toBe('USD'); // from HTML og
		expect(r.imageUrl).toMatch(/cdn\.shopify\.com/);
	});

	it('still works when .json 404s (non-Shopify): falls back to HTML', async () => {
		const fakeFetch = async (u: string) => {
			if (u.endsWith('.json'))
				return {
					url: u,
					status: 404,
					contentType: 'text/html',
					body: Buffer.from('<html></html>')
				};
			return {
				url: u,
				status: 200,
				contentType: 'text/html',
				body: Buffer.from(fx('jsonld-only.html'))
			};
		};
		const r = await extractProduct('https://shop.example.com/p/1', fakeFetch as never);
		expect(r.name).toBe('JsonLd Incense');
		expect(r.currency).toBe('EUR');
	});
});

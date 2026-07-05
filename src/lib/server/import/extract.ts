import * as cheerio from 'cheerio';
import { safeFetch } from './ssrf';

export type ExtractedProduct = {
	name: string | null;
	brand: string | null;
	description: string | null;
	price: string | null;
	currency: string | null;
	imageUrl: string | null;
};

const EMPTY: ExtractedProduct = {
	name: null,
	brand: null,
	description: null,
	price: null,
	currency: null,
	imageUrl: null
};

function clean(s: unknown): string | null {
	if (typeof s !== 'string') return null;
	const t = s.replace(/\s+/g, ' ').trim();
	return t.length ? t : null;
}
function htmlToText(html: unknown): string | null {
	if (typeof html !== 'string' || !html) return null;
	return clean(cheerio.load(html).root().text());
}

export function extractFromShopifyJson(text: string): ExtractedProduct | null {
	let doc: unknown;
	try {
		doc = JSON.parse(text);
	} catch {
		return null;
	}
	const p = (doc as { product?: Record<string, unknown> })?.product;
	if (!p || typeof p.title !== 'string') return null;
	const variants = Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]) : [];
	const images = Array.isArray(p.images) ? (p.images as Record<string, unknown>[]) : [];
	return {
		name: clean(p.title),
		brand: clean(p.vendor),
		description: htmlToText(p.body_html),
		price: clean(variants[0]?.price),
		currency: null, // not present in Shopify product.json — comes from HTML
		imageUrl: clean(images[0]?.src)
	};
}

function fromJsonLd($: cheerio.CheerioAPI): ExtractedProduct {
	for (const el of $('script[type="application/ld+json"]').toArray()) {
		let data: unknown;
		try {
			data = JSON.parse($(el).text());
		} catch {
			continue;
		}
		const nodes: unknown[] = Array.isArray(data)
			? data
			: ((data as { '@graph'?: unknown[] })?.['@graph'] ?? [data]);
		for (const nodeRaw of nodes) {
			const node = nodeRaw as Record<string, unknown>;
			const type = node?.['@type'];
			const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
			if (!isProduct) continue;
			const brand = node.brand as { name?: unknown } | string | undefined;
			const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as
				Record<string, unknown> | undefined;
			const image = Array.isArray(node.image) ? node.image[0] : node.image;
			return {
				name: clean(node.name),
				brand: clean(typeof brand === 'string' ? brand : brand?.name),
				description: clean(node.description),
				price: clean(offers?.price),
				currency: clean(offers?.priceCurrency),
				imageUrl: clean(image)
			};
		}
	}
	return { ...EMPTY };
}

function fromOpenGraph($: cheerio.CheerioAPI): ExtractedProduct {
	const m = (prop: string) =>
		clean($(`meta[property="${prop}"]`).attr('content')) ??
		clean($(`meta[name="${prop}"]`).attr('content'));
	return {
		name: m('og:title'),
		brand: m('product:brand') ?? m('og:brand'),
		description: m('og:description'),
		price: m('product:price:amount') ?? m('og:price:amount'),
		currency: m('product:price:currency') ?? m('og:price:currency'),
		imageUrl: m('og:image') ?? m('og:image:secure_url')
	};
}

function fromMeta($: cheerio.CheerioAPI): ExtractedProduct {
	const title = clean($('title').first().text());
	return {
		...EMPTY,
		// strip a trailing " — Shop"/" | Shop" suffix commonly appended to <title>
		name: title ? clean(title.split(/\s[|–—-]\s/)[0]) : null,
		description: clean($('meta[name="description"]').attr('content'))
	};
}

export function mergeExtracted(
	primary: ExtractedProduct,
	fallback: ExtractedProduct
): ExtractedProduct {
	const out = { ...EMPTY };
	for (const k of Object.keys(out) as (keyof ExtractedProduct)[]) {
		out[k] = primary[k] ?? fallback[k];
	}
	return out;
}

export function extractFromHtml(html: string): ExtractedProduct {
	const $ = cheerio.load(html);
	// tier order: JSON-LD (richest structured) → OG → bare meta
	return mergeExtracted(mergeExtracted(fromJsonLd($), fromOpenGraph($)), fromMeta($));
}

export async function extractProduct(
	url: string,
	fetchImpl: typeof safeFetch = safeFetch
): Promise<ExtractedProduct> {
	const page = await fetchImpl(url, { accept: 'text/html,*/*;q=0.8' });
	const fromHtml = extractFromHtml(page.body.toString('utf8'));

	let fromShopify: ExtractedProduct | null = null;
	try {
		const u = new URL(url);
		u.search = '';
		const jsonUrl = u.toString().replace(/\/$/, '') + '.json';
		const j = await fetchImpl(jsonUrl, { accept: 'application/json', maxBytes: 1_000_000 });
		if (j.status === 200 && j.contentType.includes('json'))
			fromShopify = extractFromShopifyJson(j.body.toString('utf8'));
	} catch {
		fromShopify = null; // non-Shopify or blocked — HTML tiers already cover it
	}

	// Shopify wins for name/brand/description/price/image; currency only in HTML.
	return fromShopify ? mergeExtracted(fromShopify, fromHtml) : fromHtml;
}

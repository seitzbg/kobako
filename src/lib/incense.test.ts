import { describe, it, expect } from 'vitest';
import {
	FORMATS,
	SCENT_FAMILIES,
	SCORE_AXES,
	CATALOG_SORTS,
	formatLabel,
	scentFamilyLabel,
	parseIncenseForm,
	parseReviewForm,
	parseCatalogQuery,
	isFiltered,
	shopNameFromUrl
} from './incense';

function fd(entries: Record<string, string>): FormData {
	const f = new FormData();
	for (const [k, v] of Object.entries(entries)) f.set(k, v);
	return f;
}

describe('incense enums & labels', () => {
	it('exposes the spec enum values', () => {
		expect(FORMATS).toEqual(['stick', 'coil', 'cone', 'rope', 'dhoop', 'loose_powder', 'resin']);
		expect(SCENT_FAMILIES).toEqual([
			'aloeswood',
			'sandalwood',
			'floral',
			'spice',
			'resin',
			'herbal',
			'other'
		]);
	});

	it('humanizes labels and dashes the unknown', () => {
		expect(formatLabel('loose_powder')).toBe('Loose powder');
		expect(scentFamilyLabel('aloeswood')).toBe('Aloeswood / kyara');
		expect(formatLabel(null)).toBe('—');
		expect(scentFamilyLabel('' as never)).toBe('—');
	});

	it('lists the five score axes with Overall last', () => {
		expect(SCORE_AXES.map((a) => a.key)).toEqual([
			'scent',
			'throwSmoke',
			'longevity',
			'value',
			'overall'
		]);
	});
});

describe('parseIncenseForm', () => {
	it('requires a non-empty name', () => {
		const r = parseIncenseForm(fd({ name: '   ' }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/name/i);
	});

	it('trims optional fields to null and keeps valid values', () => {
		const r = parseIncenseForm(
			fd({
				name: '  Kyara Kokoh ',
				brand: ' Baieido ',
				format: 'stick',
				scentFamily: 'aloeswood',
				ingredients: '',
				sticksPerBox: '35',
				price: '48.00'
			})
		);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value.name).toBe('Kyara Kokoh');
			expect(r.value.brand).toBe('Baieido');
			expect(r.value.format).toBe('stick');
			expect(r.value.scentFamily).toBe('aloeswood');
			expect(r.value.ingredients).toBeNull();
			expect(r.value.sticksPerBox).toBe(35);
			expect(r.value.price).toBe('48.00');
		}
	});

	it('rejects an unknown format or scent family', () => {
		expect(parseIncenseForm(fd({ name: 'x', format: 'bogus' })).ok).toBe(false);
		expect(parseIncenseForm(fd({ name: 'x', scentFamily: 'bogus' })).ok).toBe(false);
	});

	it('rejects a non-http source URL, a negative count, and a bad price', () => {
		expect(parseIncenseForm(fd({ name: 'x', sourceUrl: 'javascript:alert(1)' })).ok).toBe(false);
		expect(parseIncenseForm(fd({ name: 'x', sticksPerBox: '-3' })).ok).toBe(false);
		expect(parseIncenseForm(fd({ name: 'x', price: 'free' })).ok).toBe(false);
		expect(parseIncenseForm(fd({ name: 'x', price: '-5' })).ok).toBe(false);
	});

	it('captures an optional description and rejects an over-long one', () => {
		const ok = parseIncenseForm(fd({ name: 'x', description: '  A nice scent  ' }));
		expect(ok.ok).toBe(true);
		if (ok.ok) expect(ok.value.description).toBe('A nice scent');
		const long = parseIncenseForm(fd({ name: 'x', description: 'a'.repeat(4001) }));
		expect(long.ok).toBe(false);
	});

	it('derives a shop name from a URL host', () => {
		expect(shopNameFromUrl('https://www.kikohincense.com/products/x')).toBe('kikohincense.com');
		expect(shopNameFromUrl('not a url')).toBeNull();
	});
});

describe('parseReviewForm', () => {
	it('accepts blank scores as null and clamps range', () => {
		const r = parseReviewForm(
			fd({
				scent: '4',
				throwSmoke: '',
				longevity: '5',
				value: '3',
				overall: '4',
				reviewText: '  warm  '
			})
		);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value.scent).toBe(4);
			expect(r.value.throwSmoke).toBeNull();
			expect(r.value.reviewText).toBe('warm');
		}
	});

	it('rejects an out-of-range score', () => {
		expect(parseReviewForm(fd({ scent: '9' })).ok).toBe(false);
		expect(parseReviewForm(fd({ value: '-1' })).ok).toBe(false);
	});
});

describe('parseCatalogQuery', () => {
	const parse = (qs: string) => parseCatalogQuery(new URLSearchParams(qs));

	it('defaults to an empty, newest query', () => {
		expect(parse('')).toEqual({ q: '', formats: [], scents: [], sort: 'newest' });
	});

	it('reads and trims q, caps at 100 chars', () => {
		expect(parse('q=%20%20kyara%20%20').q).toBe('kyara');
		expect(parse(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
	});

	it('keeps valid formats and scents, drops unknown ones, de-dupes', () => {
		const f = parse('format=stick&format=coil&format=bogus&format=stick&scent=floral&scent=nope');
		expect(f.formats).toEqual(['stick', 'coil']);
		expect(f.scents).toEqual(['floral']);
	});

	it('accepts a known sort and falls back to newest for anything else', () => {
		expect(parse('sort=top').sort).toBe('top');
		expect(parse('sort=most_reviewed').sort).toBe('most_reviewed');
		expect(parse('sort=sideways').sort).toBe('newest');
	});

	it('exposes the four sort options with newest first', () => {
		expect(CATALOG_SORTS.map((s) => s.key)).toEqual(['newest', 'name', 'top', 'most_reviewed']);
	});
});

describe('isFiltered', () => {
	it('is false for the default query and for sort-only changes', () => {
		expect(isFiltered({ q: '', formats: [], scents: [], sort: 'newest' })).toBe(false);
		expect(isFiltered({ q: '', formats: [], scents: [], sort: 'top' })).toBe(false);
	});
	it('is true when q, a format, or a scent narrows the set', () => {
		expect(isFiltered({ q: 'x', formats: [], scents: [], sort: 'newest' })).toBe(true);
		expect(isFiltered({ q: '', formats: ['stick'], scents: [], sort: 'newest' })).toBe(true);
		expect(isFiltered({ q: '', formats: [], scents: ['floral'], sort: 'newest' })).toBe(true);
	});
});

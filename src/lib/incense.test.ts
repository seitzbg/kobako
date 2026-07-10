import { describe, it, expect } from 'vitest';
import {
	FORMATS,
	SCENT_FAMILIES,
	SCORE_AXES,
	CATALOG_SORTS,
	COLLECTION_STATUSES,
	formatLabel,
	scentFamilyLabel,
	collectionStatusLabel,
	parseCollectionStatus,
	parseIncenseForm,
	parseReviewForm,
	parseBurnEntryForm,
	todayIso,
	parseCatalogQuery,
	isFiltered,
	shopNameFromUrl,
	normalizeTag,
	parseTags,
	MAX_TAG_LEN,
	MAX_TAGS_PER_ITEM
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
		expect(parse('')).toEqual({
			q: '',
			formats: [],
			scents: [],
			statuses: [],
			tags: [],
			sort: 'newest'
		});
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
		expect(
			isFiltered({ q: '', formats: [], scents: [], statuses: [], tags: [], sort: 'newest' })
		).toBe(false);
		expect(
			isFiltered({ q: '', formats: [], scents: [], statuses: [], tags: [], sort: 'top' })
		).toBe(false);
	});
	it('is true when q, a format, or a scent narrows the set', () => {
		expect(
			isFiltered({ q: 'x', formats: [], scents: [], statuses: [], tags: [], sort: 'newest' })
		).toBe(true);
		expect(
			isFiltered({ q: '', formats: ['stick'], scents: [], statuses: [], tags: [], sort: 'newest' })
		).toBe(true);
		expect(
			isFiltered({ q: '', formats: [], scents: ['floral'], statuses: [], tags: [], sort: 'newest' })
		).toBe(true);
	});
});

describe('collection status helpers', () => {
	it('exposes the four statuses in order', () => {
		expect(COLLECTION_STATUSES).toEqual(['owned', 'wishlist', 'sample', 'used_up']);
	});
	it('labels statuses and dashes the unknown', () => {
		expect(collectionStatusLabel('used_up')).toBe('Used up');
		expect(collectionStatusLabel('owned')).toBe('Owned');
		expect(collectionStatusLabel(null)).toBe('—');
	});
	it('parses a valid status and nulls anything else (never throws)', () => {
		expect(parseCollectionStatus('wishlist')).toBe('wishlist');
		expect(parseCollectionStatus('  sample  ')).toBe('sample');
		expect(parseCollectionStatus('')).toBeNull();
		expect(parseCollectionStatus('none')).toBeNull();
		expect(parseCollectionStatus('bogus')).toBeNull();
	});
});

describe('parseCatalogQuery — status facet', () => {
	it('keeps valid statuses, drops unknown, de-dupes', () => {
		const f = parseCatalogQuery(
			new URLSearchParams('status=owned&status=owned&status=wishlist&status=nope')
		);
		expect(f.statuses).toEqual(['owned', 'wishlist']);
	});
	it('defaults to no statuses and reports isFiltered on a status', () => {
		expect(parseCatalogQuery(new URLSearchParams('')).statuses).toEqual([]);
		expect(
			isFiltered({ q: '', formats: [], scents: [], statuses: ['owned'], tags: [], sort: 'newest' })
		).toBe(true);
	});
});

describe('parseBurnEntryForm', () => {
	it('accepts a full entry', () => {
		const r = parseBurnEntryForm(fd({ burnedOn: '2020-01-01', rating: '4', notes: 'lovely' }));
		expect(r).toEqual({ ok: true, value: { burnedOn: '2020-01-01', rating: 4, notes: 'lovely' } });
	});

	it('accepts a date-only entry (rating and notes optional)', () => {
		const r = parseBurnEntryForm(fd({ burnedOn: '2020-06-15' }));
		expect(r).toEqual({ ok: true, value: { burnedOn: '2020-06-15', rating: null, notes: null } });
	});

	it('requires a date', () => {
		expect(parseBurnEntryForm(fd({ notes: 'x' })).ok).toBe(false);
	});

	it('rejects a malformed date', () => {
		expect(parseBurnEntryForm(fd({ burnedOn: '2026-13-40' })).ok).toBe(false);
		expect(parseBurnEntryForm(fd({ burnedOn: 'not-a-date' })).ok).toBe(false);
	});

	it('rejects a future date', () => {
		expect(parseBurnEntryForm(fd({ burnedOn: '2999-01-01' })).ok).toBe(false);
	});

	it('rejects an out-of-range or non-integer rating', () => {
		expect(parseBurnEntryForm(fd({ burnedOn: '2020-01-01', rating: '7' })).ok).toBe(false);
		expect(parseBurnEntryForm(fd({ burnedOn: '2020-01-01', rating: '2.5' })).ok).toBe(false);
	});

	it('rejects overly long notes', () => {
		expect(parseBurnEntryForm(fd({ burnedOn: '2020-01-01', notes: 'x'.repeat(2001) })).ok).toBe(
			false
		);
	});

	it('todayIso returns a YYYY-MM-DD string', () => {
		expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('normalizeTag', () => {
	it('lowercases, trims, and collapses whitespace', () => {
		expect(normalizeTag('  Aloeswood  ')).toBe('aloeswood');
		expect(normalizeTag('Special   Occasion')).toBe('special occasion');
	});
	it('returns null for empty or whitespace-only input', () => {
		expect(normalizeTag('')).toBe(null);
		expect(normalizeTag('   ')).toBe(null);
	});
	it('caps length at MAX_TAG_LEN', () => {
		expect(normalizeTag('x'.repeat(50))).toBe('x'.repeat(MAX_TAG_LEN));
	});
});

describe('parseTags', () => {
	it('splits on commas, normalizes, drops empties, dedupes', () => {
		expect(parseTags('Aloeswood, gift , , aloeswood, Daily')).toEqual([
			'aloeswood',
			'gift',
			'daily'
		]);
	});
	it('returns [] for a blank field', () => {
		expect(parseTags('   ')).toEqual([]);
	});
	it('caps the number of tags at MAX_TAGS_PER_ITEM', () => {
		const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(',');
		expect(parseTags(many).length).toBe(MAX_TAGS_PER_ITEM);
	});
});

describe('parseCatalogQuery tags facet + isFiltered', () => {
	it('reads repeated tag params, normalized and deduped', () => {
		const p = new URLSearchParams();
		p.append('tag', 'Aloeswood');
		p.append('tag', 'aloeswood');
		p.append('tag', 'GIFT');
		expect(parseCatalogQuery(p).tags).toEqual(['aloeswood', 'gift']);
	});
	it('isFiltered is true when a tag is selected', () => {
		const p = new URLSearchParams();
		p.append('tag', 'gift');
		expect(isFiltered(parseCatalogQuery(p))).toBe(true);
	});
});

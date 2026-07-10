// Pure, DB-free catalog/review domain helpers — safe to import in .svelte
// files and to unit-test without a database.

export const FORMATS = ['stick', 'coil', 'cone', 'rope', 'dhoop', 'loose_powder', 'resin'] as const;
export type Format = (typeof FORMATS)[number];

export const SCENT_FAMILIES = [
	'aloeswood',
	'sandalwood',
	'floral',
	'spice',
	'resin',
	'herbal',
	'other'
] as const;
export type ScentFamily = (typeof SCENT_FAMILIES)[number];

const FORMAT_LABELS: Record<Format, string> = {
	stick: 'Stick',
	coil: 'Coil',
	cone: 'Cone',
	rope: 'Rope',
	dhoop: 'Dhoop',
	loose_powder: 'Loose powder',
	resin: 'Resin'
};

const SCENT_FAMILY_LABELS: Record<ScentFamily, string> = {
	aloeswood: 'Aloeswood / kyara',
	sandalwood: 'Sandalwood',
	floral: 'Floral',
	spice: 'Spice',
	resin: 'Resin',
	herbal: 'Herbal',
	other: 'Other'
};

export function formatLabel(f: Format | null | undefined): string {
	return f && f in FORMAT_LABELS ? FORMAT_LABELS[f] : '—';
}

export function scentFamilyLabel(s: ScentFamily | null | undefined): string {
	return s && s in SCENT_FAMILY_LABELS ? SCENT_FAMILY_LABELS[s] : '—';
}

export const COLLECTION_STATUSES = ['owned', 'wishlist', 'sample', 'used_up'] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

const COLLECTION_STATUS_LABELS: Record<CollectionStatus, string> = {
	owned: 'Owned',
	wishlist: 'Wishlist',
	sample: 'Sample',
	used_up: 'Used up'
};

export function collectionStatusLabel(s: CollectionStatus | null | undefined): string {
	return s && s in COLLECTION_STATUS_LABELS ? COLLECTION_STATUS_LABELS[s] : '—';
}

export function parseCollectionStatus(raw: string): CollectionStatus | null {
	const v = raw.trim();
	return COLLECTION_STATUSES.includes(v as CollectionStatus) ? (v as CollectionStatus) : null;
}

export const MAX_TAG_LEN = 40;
export const MAX_TAGS_PER_ITEM = 20;

export function normalizeTag(raw: string): string | null {
	const v = raw.trim().toLowerCase().replace(/\s+/g, ' ');
	return v ? v.slice(0, MAX_TAG_LEN) : null;
}

export function parseTags(raw: string): string[] {
	const out: string[] = [];
	for (const part of raw.split(',')) {
		const t = normalizeTag(part);
		if (t && !out.includes(t)) out.push(t);
		if (out.length >= MAX_TAGS_PER_ITEM) break;
	}
	return out;
}

export type IncenseSummary = {
	id: string;
	name: string;
	brand: string | null;
	format: Format | null;
	scentFamily: ScentFamily | null;
	imagePath: string | null;
	reviewCount: number;
	avgOverall: number | null;
	myStatus: CollectionStatus | null;
	tags: string[];
};

export type ScoreKey = 'scent' | 'throwSmoke' | 'longevity' | 'value' | 'overall';

export const SCORE_AXES: readonly { key: ScoreKey; label: string }[] = [
	{ key: 'scent', label: 'Scent' },
	{ key: 'throwSmoke', label: 'Throw / smoke' },
	{ key: 'longevity', label: 'Longevity' },
	{ key: 'value', label: 'Value' },
	{ key: 'overall', label: 'Overall' }
];

export type IncenseInput = {
	name: string;
	brand: string | null;
	format: Format | null;
	scentFamily: ScentFamily | null;
	ingredients: string | null;
	origin: string | null;
	burnTime: string | null;
	length: string | null;
	sticksPerBox: number | null;
	sourceShop: string | null;
	sourceUrl: string | null;
	price: string | null;
	currency: string | null;
	description: string | null;
};

export type ReviewInput = {
	scent: number | null;
	throwSmoke: number | null;
	longevity: number | null;
	value: number | null;
	overall: number | null;
	reviewText: string | null;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function str(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v.trim() : '';
}
function nullIfEmpty(s: string): string | null {
	return s.length ? s : null;
}

export function parseIncenseForm(form: FormData): Parsed<IncenseInput> {
	const name = str(form, 'name');
	if (!name) return { ok: false, error: 'A name is required.' };
	if (name.length > 200) return { ok: false, error: 'Name is too long (max 200 characters).' };

	const formatRaw = str(form, 'format');
	if (formatRaw && !FORMATS.includes(formatRaw as Format))
		return { ok: false, error: 'Unknown format.' };

	const scentRaw = str(form, 'scentFamily');
	if (scentRaw && !SCENT_FAMILIES.includes(scentRaw as ScentFamily))
		return { ok: false, error: 'Unknown scent family.' };

	let sticksPerBox: number | null = null;
	const sticksRaw = str(form, 'sticksPerBox');
	if (sticksRaw) {
		const n = Number(sticksRaw);
		if (!Number.isInteger(n) || n < 0)
			return { ok: false, error: 'Sticks per box must be a whole number ≥ 0.' };
		sticksPerBox = n;
	}

	let price: string | null = null;
	const priceRaw = str(form, 'price');
	if (priceRaw) {
		const n = Number(priceRaw);
		if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'Price must be a number ≥ 0.' };
		price = priceRaw;
	}

	const sourceUrl = nullIfEmpty(str(form, 'sourceUrl'));
	if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl))
		return { ok: false, error: 'Source URL must start with http:// or https://.' };

	const description = nullIfEmpty(str(form, 'description'));
	if (description && description.length > 4000)
		return { ok: false, error: 'Description is too long (max 4000 characters).' };

	return {
		ok: true,
		value: {
			name,
			brand: nullIfEmpty(str(form, 'brand')),
			format: (formatRaw || null) as Format | null,
			scentFamily: (scentRaw || null) as ScentFamily | null,
			ingredients: nullIfEmpty(str(form, 'ingredients')),
			origin: nullIfEmpty(str(form, 'origin')),
			burnTime: nullIfEmpty(str(form, 'burnTime')),
			length: nullIfEmpty(str(form, 'length')),
			sticksPerBox,
			sourceShop: nullIfEmpty(str(form, 'sourceShop')),
			sourceUrl,
			price,
			currency: nullIfEmpty(str(form, 'currency')),
			description
		}
	};
}

function parseScore(
	form: FormData,
	key: string
): { ok: true; value: number | null } | { ok: false } {
	const raw = str(form, key);
	if (!raw) return { ok: true, value: null };
	const n = Number(raw);
	if (!Number.isInteger(n) || n < 0 || n > 5) return { ok: false };
	return { ok: true, value: n };
}

export function parseReviewForm(form: FormData): Parsed<ReviewInput> {
	const keys: ScoreKey[] = ['scent', 'throwSmoke', 'longevity', 'value', 'overall'];
	const scores: Record<string, number | null> = {};
	for (const k of keys) {
		const p = parseScore(form, k);
		if (!p.ok) return { ok: false, error: 'Scores must be whole numbers from 0 to 5.' };
		scores[k] = p.value;
	}
	return {
		ok: true,
		value: {
			scent: scores.scent,
			throwSmoke: scores.throwSmoke,
			longevity: scores.longevity,
			value: scores.value,
			overall: scores.overall,
			reviewText: nullIfEmpty(str(form, 'reviewText'))
		}
	};
}

export type BurnEntryInput = {
	burnedOn: string; // 'YYYY-MM-DD'
	rating: number | null;
	notes: string | null;
};

export function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function isRealIsoDate(s: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const d = new Date(`${s}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseBurnEntryForm(form: FormData): Parsed<BurnEntryInput> {
	const burnedOn = str(form, 'burnedOn');
	if (!burnedOn) return { ok: false, error: 'A burn date is required.' };
	if (!isRealIsoDate(burnedOn)) return { ok: false, error: 'Enter a valid date (YYYY-MM-DD).' };
	if (burnedOn > todayIso()) return { ok: false, error: 'A burn date cannot be in the future.' };

	const r = parseScore(form, 'rating');
	if (!r.ok) return { ok: false, error: 'Session rating must be a whole number from 0 to 5.' };

	const notes = nullIfEmpty(str(form, 'notes'));
	if (notes && notes.length > 2000)
		return { ok: false, error: 'Notes are too long (max 2000 characters).' };

	return { ok: true, value: { burnedOn, rating: r.value, notes } };
}

export function shopNameFromUrl(raw: string): string | null {
	try {
		return new URL(raw).hostname.replace(/^www\./, '') || null;
	} catch {
		return null;
	}
}

export type CatalogSort = 'newest' | 'name' | 'top' | 'most_reviewed';

export const CATALOG_SORTS: readonly { key: CatalogSort; label: string }[] = [
	{ key: 'newest', label: 'Newest' },
	{ key: 'name', label: 'Name (A–Z)' },
	{ key: 'top', label: 'Top rated' },
	{ key: 'most_reviewed', label: 'Most reviewed' }
];

const CATALOG_SORT_KEYS = CATALOG_SORTS.map((s) => s.key);

export type CatalogFilters = {
	q: string;
	formats: Format[];
	scents: ScentFamily[];
	statuses: CollectionStatus[];
	tags: string[];
	sort: CatalogSort;
};

const MAX_Q = 100;

function dedupe<T>(xs: T[]): T[] {
	return [...new Set(xs)];
}

export function parseCatalogQuery(params: URLSearchParams): CatalogFilters {
	const q = (params.get('q') ?? '').trim().slice(0, MAX_Q);
	const formats = dedupe(
		params.getAll('format').filter((v): v is Format => FORMATS.includes(v as Format))
	);
	const scents = dedupe(
		params
			.getAll('scent')
			.filter((v): v is ScentFamily => SCENT_FAMILIES.includes(v as ScentFamily))
	);
	const statuses = dedupe(
		params
			.getAll('status')
			.filter((v): v is CollectionStatus => COLLECTION_STATUSES.includes(v as CollectionStatus))
	);
	const tags = dedupe(
		params
			.getAll('tag')
			.map(normalizeTag)
			.filter((t): t is string => t !== null)
	);
	const sortRaw = params.get('sort') as CatalogSort | null;
	const sort: CatalogSort = sortRaw && CATALOG_SORT_KEYS.includes(sortRaw) ? sortRaw : 'newest';
	return { q, formats, scents, statuses, tags, sort };
}

export function isFiltered(f: CatalogFilters): boolean {
	return (
		f.q !== '' ||
		f.formats.length > 0 ||
		f.scents.length > 0 ||
		f.statuses.length > 0 ||
		f.tags.length > 0
	);
}

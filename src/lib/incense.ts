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

export function shopNameFromUrl(raw: string): string | null {
	try {
		return new URL(raw).hostname.replace(/^www\./, '') || null;
	} catch {
		return null;
	}
}

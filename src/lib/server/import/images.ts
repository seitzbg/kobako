import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { safeFetch } from './ssrf';

const EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif'
};

export async function cacheImage(
	imageUrl: string,
	dataDir: string,
	fetchImpl: typeof safeFetch = safeFetch
): Promise<string | null> {
	try {
		const res = await fetchImpl(imageUrl, {
			maxBytes: 5_000_000,
			timeoutMs: 10_000,
			accept: 'image/*'
		});
		const mime = res.contentType.split(';')[0].trim().toLowerCase();
		const ext = EXT[mime];
		if (!ext || res.body.length === 0) return null;
		const name = `${randomUUID()}.${ext}`;
		await mkdir(dataDir, { recursive: true });
		await writeFile(join(dataDir, name), res.body);
		return name;
	} catch (err) {
		// Image caching is best-effort — an import still succeeds without an image.
		// But log genuine failures (e.g. an unwritable DATA_DIR) so they aren't
		// invisible: a silent swallow once hid a root-owned-volume permission bug.
		console.warn(`cacheImage failed for ${imageUrl}:`, err instanceof Error ? err.message : err);
		return null;
	}
}

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from '$lib/server/config';
import type { RequestHandler } from './$types';

const FILE_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;
const MIME: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif'
};

export const GET: RequestHandler = async ({ params }) => {
	const file = params.file;
	if (!FILE_RE.test(file)) return new Response('Not found', { status: 404 });
	try {
		const bytes = await readFile(join(DATA_DIR, file));
		const ext = file.split('.').pop()!;
		return new Response(bytes, {
			headers: { 'content-type': MIME[ext], 'cache-control': 'public, max-age=31536000, immutable' }
		});
	} catch {
		return new Response('Not found', { status: 404 });
	}
};

import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point DATA_DIR at a temp dir before importing the handler.
const dir = mkdtempSync(join(tmpdir(), 'kobako-media-'));
process.env.KOBAKO_DATA_DIR = dir;
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const { GET } = await import('./+server');

describe('/media/[file]', () => {
	it('serves an existing file with an image content-type', async () => {
		const name = '00000000-0000-0000-0000-000000000000.png';
		writeFileSync(join(dir, name), Buffer.from([1, 2, 3]));
		const res = await GET({ params: { file: name } } as never);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toBe('image/png');
	});

	it('404s a bad filename (path traversal) and a missing file', async () => {
		await expect(GET({ params: { file: '../secret' } } as never)).resolves.toMatchObject({
			status: 404
		});
		await expect(
			GET({ params: { file: '11111111-1111-1111-1111-111111111111.png' } } as never)
		).resolves.toMatchObject({ status: 404 });
	});
});

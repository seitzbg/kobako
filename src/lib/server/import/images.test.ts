import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cacheImage } from './images';

const dir = mkdtempSync(join(tmpdir(), 'kobako-img-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const pngFetch = async () => ({
	url: 'https://cdn.example.com/x.png',
	status: 200,
	contentType: 'image/png',
	body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
});

describe('cacheImage', () => {
	it('saves an image and returns a safe <uuid>.png filename', async () => {
		const name = await cacheImage('https://cdn.example.com/x.png', dir, pngFetch as never);
		expect(name).toMatch(/^[a-f0-9-]{36}\.png$/);
		expect(existsSync(join(dir, name!))).toBe(true);
		expect(readFileSync(join(dir, name!)).length).toBe(7);
	});

	it('returns null for a non-image content-type', async () => {
		const htmlFetch = async () => ({
			url: 'u',
			status: 200,
			contentType: 'text/html',
			body: Buffer.from('<x>')
		});
		expect(await cacheImage('https://cdn.example.com/x', dir, htmlFetch as never)).toBeNull();
	});

	it('returns null (never throws) when the fetch fails', async () => {
		const boom = async () => {
			throw new Error('network');
		};
		expect(await cacheImage('https://cdn.example.com/x.png', dir, boom as never)).toBeNull();
	});
});

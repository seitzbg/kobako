import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { TEST_DB_WORKERS } from './src/test/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node: builds a standalone Node server (build/index.js) for the Docker image.
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				resolve: {
					alias: {
						// See src/test/envDynamicPrivateShim.ts for why this is necessary:
						// SvelteKit bakes `$env/dynamic/private` to a static snapshot at
						// Vite config-resolution time, which defeats the per-worker
						// DATABASE_URL rewrite in setup.ts. Scoped to this test project only.
						'$env/dynamic/private': fileURLToPath(
							new URL('./src/test/envDynamicPrivateShim.ts', import.meta.url)
						)
					}
				},
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					globalSetup: ['./src/test/globalSetup.ts'],
					setupFiles: ['./src/test/setup.ts'],
					// Vitest 4 removed `poolOptions` (all sub-options are now top-level); the
					// forks-pool equivalent of the old minForks/maxForks pin is `maxWorkers`.
					// This is coupled to the per-worker DB provisioning in globalSetup.ts,
					// which provisions exactly TEST_DB_WORKERS databases — do not override
					// piecemeal (e.g. a CLI `--maxWorkers` above this value would let a
					// worker land on an unprovisioned DB). That fails safe as a connection
					// error, not data loss, but it's still wrong.
					maxWorkers: TEST_DB_WORKERS
				}
			}
		]
	}
});

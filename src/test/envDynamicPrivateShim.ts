// Test-only replacement for `$env/dynamic/private`.
//
// SvelteKit's Vite plugin resolves `$env/dynamic/private` to a virtual module
// whose values are baked into a static object literal at Vite config-resolution
// time when Vite runs in "serve" mode — which is how Vitest loads modules.
// That resolution happens exactly once, in Vitest's main orchestrator process,
// using whatever `process.env` held at that moment; the generated code has no
// live reference to `process.env` left in it at all. So no later mutation —
// including this project's per-worker DATABASE_URL rewrite in setup.ts, which
// runs inside a forked worker process — can ever reach it (confirmed empirically:
// the plugin's `config`/`load` hooks fire in a different OS process than any
// worker ever does).
//
// This shim is aliased in vite.config.ts, for the "server" test project only,
// to give `$env/dynamic/private` a genuinely live view of `process.env`
// instead. It has no effect on `vite dev`/`vite build`, which never read
// vite.config.ts's `test.projects` section.
export const env = process.env;

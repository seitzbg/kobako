import { beforeEach } from 'vitest';

// Point THIS worker at its own database BEFORE the db client is imported.
// No static import of the client here: an ESM import would hoist above this
// assignment and capture the base URL. The truncation below imports it
// dynamically, after this runs.
//
// We key off VITEST_POOL_ID rather than VITEST_WORKER_ID: in Vitest 4 (forks
// pool), VITEST_WORKER_ID is a monotonically increasing counter assigned once
// per test FILE (unbounded — it can exceed the worker count), while
// VITEST_POOL_ID is the recycled 1..maxWorkers slot id assigned to whichever
// OS process is running a given file, which is what's actually bounded by
// `maxWorkers` in vite.config.ts and matches the number of provisioned
// per-worker databases.
const pool = process.env.VITEST_POOL_ID ?? '1';
const base = process.env.DATABASE_URL;
if (!base) throw new Error('DATABASE_URL is not set for tests');
process.env.DATABASE_URL = base.replace(/\/[^/?]+(\?.*)?$/, `/kobako_test_w${pool}$1`);

beforeEach(async () => {
	const { sql } = await import('../lib/server/db/client');

	// Safety guard: the truncation below is only safe if this client actually
	// connected to a per-worker database. That currently depends on the
	// test-scoped `resolve.alias` in vite.config.ts continuing to resolve
	// `$env/dynamic/private` to the shim; if that ever breaks (config refactor,
	// SvelteKit/Vitest upgrade), the client silently falls back to the base
	// DATABASE_URL and this would truncate the base database instead of a
	// throwaway one. Fail loud instead.
	const [{ current_database: dbName }] = await sql<
		{ current_database: string }[]
	>`SELECT current_database()`;
	if (!/^kobako_test_w\d+$/.test(dbName)) {
		throw new Error(`Refusing to truncate non-isolated database "${dbName}"`);
	}

	// drizzle's migrations table lives in the `drizzle` schema, not `public`,
	// so it's already excluded by the schemaname filter below.
	const tables = await sql<{ tablename: string }[]>`
		SELECT tablename FROM pg_tables
		WHERE schemaname = 'public'`;
	if (tables.length === 0) return;
	const list = tables.map((t) => `"${t.tablename}"`).join(', ');
	await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
});

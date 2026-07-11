import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { TEST_DB_WORKERS } from './config';

export default async function setup() {
	const base = process.env.DATABASE_URL;
	if (!base) throw new Error('DATABASE_URL is not set for tests');

	const workerDbs = Array.from({ length: TEST_DB_WORKERS }, (_, i) => `kobako_test_w${i + 1}`);

	// Maintenance connection (to the base DB) creates the worker DBs if absent.
	const admin = postgres(base, { max: 1 });
	try {
		for (const name of workerDbs) {
			const [{ exists }] = await admin<{ exists: boolean }[]>`
				SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name}) AS exists`;
			if (!exists) await admin.unsafe(`CREATE DATABASE "${name}"`);
		}
	} finally {
		await admin.end();
	}

	// Migrate each worker DB (idempotent — no-op once applied).
	for (const name of workerDbs) {
		const url = base.replace(/\/[^/?]+(\?.*)?$/, `/${name}$1`);
		const sql = postgres(url, { max: 1 });
		try {
			await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
		} finally {
			await sql.end();
		}
	}
}

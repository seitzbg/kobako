import { randomBytes } from 'node:crypto';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const token = randomBytes(24).toString('hex');
const sql = postgres(url, { max: 1 });
try {
	await sql`INSERT INTO invites (token) VALUES (${token})`;
	console.log(token);
} catch (err) {
	console.error('seed failed:', err);
	process.exit(1);
} finally {
	await sql.end();
}

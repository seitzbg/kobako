import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const connectionString = env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

export const sql = postgres(connectionString);
export const db = drizzle(sql);

export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

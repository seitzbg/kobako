import {
	pgTable,
	text,
	timestamp,
	uuid,
	pgEnum,
	integer,
	numeric,
	unique,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['member', 'admin']);

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: roleEnum('role').notNull().default('member'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(), // sha-256 hash of the session token
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const invites = pgTable('invites', {
	id: uuid('id').primaryKey().defaultRandom(),
	token: text('token').notNull().unique(),
	createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
	usedAt: timestamp('used_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const formatEnum = pgEnum('incense_format', [
	'stick',
	'coil',
	'cone',
	'rope',
	'dhoop',
	'loose_powder',
	'resin'
]);

export const scentFamilyEnum = pgEnum('scent_family', [
	'aloeswood',
	'sandalwood',
	'floral',
	'spice',
	'resin',
	'herbal',
	'other'
]);

export const incense = pgTable('incense', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	brand: text('brand'),
	format: formatEnum('format'),
	scentFamily: scentFamilyEnum('scent_family'),
	ingredients: text('ingredients'),
	origin: text('origin'),
	burnTime: text('burn_time'),
	length: text('length'),
	sticksPerBox: integer('sticks_per_box'),
	sourceShop: text('source_shop'),
	sourceUrl: text('source_url'),
	price: numeric('price', { precision: 10, scale: 2 }),
	currency: text('currency'),
	description: text('description'),
	imagePath: text('image_path'),
	createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const reviews = pgTable(
	'reviews',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		incenseId: uuid('incense_id')
			.notNull()
			.references(() => incense.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		scent: integer('scent'),
		throwSmoke: integer('throw_smoke'),
		longevity: integer('longevity'),
		value: integer('value'),
		overall: integer('overall'),
		reviewText: text('review_text'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		unique('reviews_incense_user_unique').on(t.incenseId, t.userId),
		check(
			'reviews_scores_range',
			sql`(${t.scent} is null or ${t.scent} between 0 and 5)
			  and (${t.throwSmoke} is null or ${t.throwSmoke} between 0 and 5)
			  and (${t.longevity} is null or ${t.longevity} between 0 and 5)
			  and (${t.value} is null or ${t.value} between 0 and 5)
			  and (${t.overall} is null or ${t.overall} between 0 and 5)`
		)
	]
);

export const collectionStatusEnum = pgEnum('collection_status', [
	'owned',
	'wishlist',
	'sample',
	'used_up'
]);

export const collection = pgTable(
	'collection',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		incenseId: uuid('incense_id')
			.notNull()
			.references(() => incense.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: collectionStatusEnum('status').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [unique('collection_incense_user_unique').on(t.incenseId, t.userId)]
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Incense = typeof incense.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Collection = typeof collection.$inferSelect;

CREATE TYPE "public"."incense_format" AS ENUM('stick', 'coil', 'cone', 'rope', 'dhoop', 'loose_powder', 'resin');--> statement-breakpoint
CREATE TYPE "public"."scent_family" AS ENUM('aloeswood', 'sandalwood', 'floral', 'spice', 'resin', 'herbal', 'other');--> statement-breakpoint
CREATE TABLE "incense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"format" "incense_format",
	"scent_family" "scent_family",
	"ingredients" text,
	"origin" text,
	"burn_time" text,
	"length" text,
	"sticks_per_box" integer,
	"source_shop" text,
	"source_url" text,
	"price" numeric(10, 2),
	"currency" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incense_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scent" integer,
	"throw_smoke" integer,
	"longevity" integer,
	"value" integer,
	"overall" integer,
	"review_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_incense_user_unique" UNIQUE("incense_id","user_id"),
	CONSTRAINT "reviews_scores_range" CHECK (("reviews"."scent" is null or "reviews"."scent" between 0 and 5)
			  and ("reviews"."throw_smoke" is null or "reviews"."throw_smoke" between 0 and 5)
			  and ("reviews"."longevity" is null or "reviews"."longevity" between 0 and 5)
			  and ("reviews"."value" is null or "reviews"."value" between 0 and 5)
			  and ("reviews"."overall" is null or "reviews"."overall" between 0 and 5))
);
--> statement-breakpoint
ALTER TABLE "incense" ADD CONSTRAINT "incense_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_incense_id_incense_id_fk" FOREIGN KEY ("incense_id") REFERENCES "public"."incense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
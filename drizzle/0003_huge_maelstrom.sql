CREATE TYPE "public"."collection_status" AS ENUM('owned', 'wishlist', 'sample', 'used_up');--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incense_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "collection_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_incense_user_unique" UNIQUE("incense_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_incense_id_incense_id_fk" FOREIGN KEY ("incense_id") REFERENCES "public"."incense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
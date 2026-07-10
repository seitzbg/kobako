CREATE TABLE "burn_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incense_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"burned_on" date NOT NULL,
	"rating" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "burn_log_rating_range" CHECK ("burn_log"."rating" is null or "burn_log"."rating" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "burn_log" ADD CONSTRAINT "burn_log_incense_id_incense_id_fk" FOREIGN KEY ("incense_id") REFERENCES "public"."incense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "burn_log" ADD CONSTRAINT "burn_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
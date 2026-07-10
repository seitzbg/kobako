CREATE TABLE "incense_tags" (
	"incense_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "incense_tags_incense_id_tag_id_pk" PRIMARY KEY("incense_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "incense_tags" ADD CONSTRAINT "incense_tags_incense_id_incense_id_fk" FOREIGN KEY ("incense_id") REFERENCES "public"."incense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incense_tags" ADD CONSTRAINT "incense_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
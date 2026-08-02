CREATE TYPE "public"."track_status" AS ENUM('watching', 'contacted', 'invited');--> statement-breakpoint
CREATE TABLE "talent_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"talent_id" text NOT NULL,
	"status" "track_status" DEFAULT 'watching' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talent_tracks" ADD CONSTRAINT "talent_tracks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_tracks" ADD CONSTRAINT "talent_tracks_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "talent_tracks_org_talent_idx" ON "talent_tracks" USING btree ("org_id","talent_id");
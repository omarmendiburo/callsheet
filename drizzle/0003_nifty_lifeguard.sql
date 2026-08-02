CREATE TABLE "project_bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"talent_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_bookmarks_talent_project_idx" ON "project_bookmarks" USING btree ("talent_id","project_id");
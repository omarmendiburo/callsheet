CREATE TYPE "public"."application_status" AS ENUM('applied', 'viewed', 'shortlisted', 'booked', 'declined');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('now', 'from_date', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."byo_gear" AS ENUM('not_needed', 'preferred', 'required');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('apprentice', 'emerging', 'professional', 'expert');--> statement-breakpoint
CREATE TYPE "public"."match_engine" AS ENUM('heuristic', 'claude');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('pitch', 'shortform', 'reel', 'headshot', 'still', 'document');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'approved', 'flagged', 'removed');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'manager', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('talent', 'business', 'admin');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"talent_id" text NOT NULL,
	"project_id" text NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"talent_id" text NOT NULL,
	"level" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disciplines" (
	"id" text PRIMARY KEY NOT NULL,
	"talent_id" text NOT NULL,
	"type" text NOT NULL,
	"level" "experience_level" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"talent_id" text NOT NULL,
	"score" integer NOT NULL,
	"rationale" text NOT NULL,
	"engine" "match_engine" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"talent_id" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"url" text NOT NULL,
	"thumb_url" text,
	"title" text,
	"vertical" boolean DEFAULT false NOT NULL,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"role" "membership_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ein" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"work_types" jsonb DEFAULT '[]'::jsonb,
	"website" text,
	"verified" boolean DEFAULT false NOT NULL,
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"timeline_start" timestamp,
	"timeline_end" timestamp,
	"location" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"remote_ok" boolean DEFAULT false NOT NULL,
	"day_rate_onset" integer,
	"hourly_postprod" integer,
	"byo_gear" "byo_gear" DEFAULT 'not_needed' NOT NULL,
	"roles_needed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "project_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"city" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"bio" text,
	"day_rate" integer,
	"post_hourly" integer,
	"byo_gear" boolean DEFAULT false NOT NULL,
	"gear_notes" text,
	"availability" "availability" DEFAULT 'now' NOT NULL,
	"available_from" timestamp,
	"willing_to_travel" boolean DEFAULT false NOT NULL,
	"travel_radius_miles" integer,
	"links" jsonb DEFAULT '[]'::jsonb,
	"prompts" jsonb DEFAULT '[]'::jsonb,
	"ai_summary" text,
	"cert_status" text DEFAULT 'none' NOT NULL,
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_talent_project_idx" ON "applications" USING btree ("talent_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_idx" ON "memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
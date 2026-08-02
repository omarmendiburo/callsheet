import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/*
 * Core entities from the Callsheet product spec §9.
 * Multi-tenancy: every business-owned row carries orgId. Talent, media,
 * disciplines, and open projects are platform-wide (the shared marketplace).
 * Org isolation is enforced at the query layer — every org-scoped query
 * goes through lib/tenancy.ts, never raw.
 */

export const userRole = pgEnum("user_role", ["talent", "business", "admin"]);
export const experienceLevel = pgEnum("experience_level", [
  "apprentice",
  "emerging",
  "professional",
  "expert",
]);
export const mediaKind = pgEnum("media_kind", [
  "pitch",
  "shortform",
  "reel",
  "headshot",
  "still",
  "document",
]);
export const mediaStatus = pgEnum("media_status", [
  "pending",
  "approved",
  "flagged",
  "removed",
]);
export const membershipRole = pgEnum("membership_role", [
  "owner",
  "manager",
  "viewer",
]);
export const byoGear = pgEnum("byo_gear", [
  "not_needed",
  "preferred",
  "required",
]);
export const projectStatus = pgEnum("project_status", [
  "draft",
  "open",
  "closed",
]);
export const applicationStatus = pgEnum("application_status", [
  "applied",
  "viewed",
  "shortlisted",
  "booked",
  "declined",
]);
export const matchEngine = pgEnum("match_engine", ["heuristic", "claude"]);
export const availability = pgEnum("availability", [
  "now",
  "from_date",
  "unavailable",
]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: userRole("role").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    suspended: boolean("suspended").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const talentProfiles = pgTable("talent_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  displayName: text("display_name").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  bio: text("bio"),
  dayRate: integer("day_rate"),
  postHourly: integer("post_hourly"),
  byoGear: boolean("byo_gear").notNull().default(false),
  gearNotes: text("gear_notes"),
  availability: availability("availability").notNull().default("now"),
  availableFrom: timestamp("available_from"),
  willingToTravel: boolean("willing_to_travel").notNull().default(false),
  travelRadiusMiles: integer("travel_radius_miles"),
  links: jsonb("links").$type<{ label: string; url: string }[]>().default([]),
  prompts: jsonb("prompts")
    .$type<{ prompt: string; answer: string }[]>()
    .default([]),
  aiSummary: text("ai_summary"),
  certStatus: text("cert_status").notNull().default("none"),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const disciplines = pgTable("disciplines", {
  id: text("id").primaryKey(),
  talentId: text("talent_id")
    .notNull()
    .references(() => talentProfiles.id),
  type: text("type").notNull(),
  level: experienceLevel("level").notNull(),
});

export const media = pgTable("media", {
  id: text("id").primaryKey(),
  talentId: text("talent_id")
    .notNull()
    .references(() => talentProfiles.id),
  kind: mediaKind("kind").notNull(),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url"),
  title: text("title"),
  vertical: boolean("vertical").notNull().default(false),
  status: mediaStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orgs = pgTable("orgs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ein: text("ein"),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  workTypes: jsonb("work_types").$type<string[]>().default([]),
  website: text("website"),
  verified: boolean("verified").notNull().default(false),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id),
    role: membershipRole("role").notNull(),
  },
  (t) => [uniqueIndex("memberships_user_org_idx").on(t.userId, t.orgId)],
);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => orgs.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  timelineStart: timestamp("timeline_start"),
  timelineEnd: timestamp("timeline_end"),
  location: text("location").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  remoteOk: boolean("remote_ok").notNull().default(false),
  dayRateOnset: integer("day_rate_onset"),
  hourlyPostprod: integer("hourly_postprod"),
  byoGear: byoGear("byo_gear").notNull().default("not_needed"),
  rolesNeeded: jsonb("roles_needed")
    .$type<{ discipline: string; count: number; level?: string }[]>()
    .notNull()
    .default([]),
  status: projectStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    talentId: text("talent_id")
      .notNull()
      .references(() => talentProfiles.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    status: applicationStatus("status").notNull().default("applied"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("applications_talent_project_idx").on(t.talentId, t.projectId),
  ],
);

export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  talentId: text("talent_id")
    .notNull()
    .references(() => talentProfiles.id),
  score: integer("score").notNull(),
  rationale: text("rationale").notNull(),
  engine: matchEngine("engine").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const certifications = pgTable("certifications", {
  id: text("id").primaryKey(),
  talentId: text("talent_id")
    .notNull()
    .references(() => talentProfiles.id),
  level: text("level").notNull(),
  grantedBy: text("granted_by")
    .notNull()
    .references(() => users.id),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

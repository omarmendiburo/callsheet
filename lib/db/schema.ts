import {
  boolean,
  doublePrecision,
  integer,
  index,
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
  /* Per-role terms (owner's call 2026-08-01): each role carries its own
   * rate, gear, and remote terms. Project-level rate/gear/remote columns
   * remain as legacy fallbacks for rows created before this change. */
  rolesNeeded: jsonb("roles_needed")
    .$type<
      {
        discipline: string;
        count: number;
        level?: string;
        dayRate?: number;
        hourlyPost?: number;
        byoGear?: "not_needed" | "preferred" | "required";
        remote?: boolean;
      }[]
    >()
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

export const trackStatus = pgEnum("track_status", [
  "watching",
  "contacted",
  "invited",
]);

/* Talent scouting tracker (owner's call 2026-08-01, mockup parity): an org's
 * private watchlist over the pool — who we're watching, who we've contacted,
 * who we've invited to a project — independent of any inbound application.
 * One row per org+talent; org-isolated like every business-owned table. */
export const talentTracks = pgTable(
  "talent_tracks",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id),
    talentId: text("talent_id")
      .notNull()
      .references(() => talentProfiles.id),
    status: trackStatus("status").notNull().default("watching"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("talent_tracks_org_talent_idx").on(t.orgId, t.talentId)],
);

/* AI ranking snapshots. WRITE-ONLY as of 2026-08-02: persisted by
 * lib/ai/match.ts as an audit trail; no read path exists yet (a future
 * admin "last ranking" surface is the intended consumer). */
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

/* Profile-view events (owner's ask 2026-08-02): recorded when a business
 * user opens a talent's reveal. The org is stored for dedupe and future
 * analytics but is NEVER surfaced to talent — their side only ever sees
 * that an open happened and when. */
export const profileViews = pgTable(
  "profile_views",
  {
    id: text("id").primaryKey(),
    talentId: text("talent_id")
      .notNull()
      .references(() => talentProfiles.id),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("profile_views_talent_idx").on(t.talentId, t.createdAt)],
);

/* Versioned acceptance records (audit H-7 layer 2 mechanics): who agreed to
 * which document version, when. Counsel's final text will bump the version;
 * the plumbing does not change. */
export const acceptances = pgTable("acceptances", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  doc: text("doc").notNull(),
  version: text("version").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* A creative bookmarks open projects to revisit (owner's ask 2026-08-02).
 * Keyed by talent profile + project; one row = one saved job. */
export const projectBookmarks = pgTable(
  "project_bookmarks",
  {
    id: text("id").primaryKey(),
    talentId: text("talent_id")
      .notNull()
      .references(() => talentProfiles.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("project_bookmarks_talent_project_idx").on(
      t.talentId,
      t.projectId,
    ),
  ],
);

import "server-only";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/*
 * Read helpers for the HMNTY admin back office (spec §6, §11).
 * Every number the admin surfaces shows is derived here, honestly, from the
 * DB — no cached aggregates, no invented figures. Pages label each figure as
 * exactly what it is (count vs. estimate vs. derived metric).
 *
 * Reads only. Mutations live in _actions.ts and re-check requireUser("admin").
 */

export type User = typeof schema.users.$inferSelect;
export type Org = typeof schema.orgs.$inferSelect;
export type Media = typeof schema.media.$inferSelect;

/* ---- Overview (spec §6) ------------------------------------------------- */

export type Overview = {
  talentCount: number;
  orgCount: number;
  orgsVerified: number;
  openProjects: number;
  closedProjects: number;
  applicationsByStatus: Record<string, number>;
  bookedPlacements: number;
  pendingMedia: number;
  flaggedMedia: number;
  // Sum of each booked application's project dayRateOnset. Labeled an ESTIMATE
  // on the page: it assumes one on-set day per booking and ignores post rates.
  estimatedWagesBooked: number;
};

export async function getOverview(): Promise<Overview> {
  const db = await getDb();

  const [talentRows, orgRows, projectRows, appRows, mediaRows] =
    await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(schema.talentProfiles),
      db
        .select({
          n: sql<number>`count(*)`,
          verified: sql<number>`count(*) filter (where ${schema.orgs.verified})`,
        })
        .from(schema.orgs),
      db
        .select({ status: schema.projects.status, n: sql<number>`count(*)` })
        .from(schema.projects)
        .groupBy(schema.projects.status),
      db
        .select({
          status: schema.applications.status,
          n: sql<number>`count(*)`,
        })
        .from(schema.applications)
        .groupBy(schema.applications.status),
      db
        .select({ status: schema.media.status, n: sql<number>`count(*)` })
        .from(schema.media)
        .groupBy(schema.media.status),
    ]);

  const projectByStatus: Record<string, number> = {};
  for (const r of projectRows) projectByStatus[r.status] = Number(r.n);

  const applicationsByStatus: Record<string, number> = {};
  for (const r of appRows) applicationsByStatus[r.status] = Number(r.n);

  const mediaByStatus: Record<string, number> = {};
  for (const r of mediaRows) mediaByStatus[r.status] = Number(r.n);

  // Estimated wages booked = sum of dayRateOnset across every booked
  // application's project. One row per booked application (a project booked
  // for three roles counts its day rate three times — the estimate is of
  // total on-set day-wages committed, not per-project spend).
  const wageRows = await db
    .select({ dayRate: schema.projects.dayRateOnset })
    .from(schema.applications)
    .innerJoin(
      schema.projects,
      eq(schema.applications.projectId, schema.projects.id),
    )
    .where(eq(schema.applications.status, "booked"));
  const estimatedWagesBooked = wageRows.reduce(
    (sum: number, r: { dayRate: number | null }) => sum + (r.dayRate ?? 0),
    0,
  );

  return {
    talentCount: Number(talentRows[0]?.n ?? 0),
    orgCount: Number(orgRows[0]?.n ?? 0),
    orgsVerified: Number(orgRows[0]?.verified ?? 0),
    openProjects: projectByStatus["open"] ?? 0,
    closedProjects: projectByStatus["closed"] ?? 0,
    applicationsByStatus,
    bookedPlacements: applicationsByStatus["booked"] ?? 0,
    pendingMedia: mediaByStatus["pending"] ?? 0,
    flaggedMedia: mediaByStatus["flagged"] ?? 0,
    estimatedWagesBooked,
  };
}

/* ---- Users (spec §6) ---------------------------------------------------- */

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  return db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
}

export async function listOrgs(): Promise<Org[]> {
  const db = await getDb();
  return db.select().from(schema.orgs).orderBy(desc(schema.orgs.createdAt));
}

/* ---- Moderation queue (spec §6) ----------------------------------------- */

export type MediaRow = {
  media: Media;
  displayName: string;
};

async function mediaByStatuses(statuses: string[]): Promise<MediaRow[]> {
  if (statuses.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      media: schema.media,
      displayName: schema.talentProfiles.displayName,
    })
    .from(schema.media)
    .innerJoin(
      schema.talentProfiles,
      eq(schema.media.talentId, schema.talentProfiles.id),
    )
    .where(inArray(schema.media.status, statuses as ("pending" | "flagged")[]))
    .orderBy(desc(schema.media.createdAt));
  return rows;
}

export function listPendingMedia(): Promise<MediaRow[]> {
  return mediaByStatuses(["pending"]);
}

export function listFlaggedMedia(): Promise<MediaRow[]> {
  return mediaByStatuses(["flagged"]);
}

/* ---- Certification (spec §6) -------------------------------------------- */

export type CertRow = {
  talentId: string;
  displayName: string;
  city: string;
  certStatus: string;
  userSuspended: boolean;
};

export async function listTalentForCert(): Promise<CertRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      talentId: schema.talentProfiles.id,
      displayName: schema.talentProfiles.displayName,
      city: schema.talentProfiles.city,
      certStatus: schema.talentProfiles.certStatus,
      userSuspended: schema.users.suspended,
    })
    .from(schema.talentProfiles)
    .innerJoin(schema.users, eq(schema.talentProfiles.userId, schema.users.id))
    .orderBy(desc(schema.talentProfiles.createdAt));
  return rows;
}

/* ---- Metrics scoreboard (spec §11) -------------------------------------- */

export type Metrics = {
  // Workforce
  bookedPlacements: number;
  estimatedWagesBooked: number;
  firstTimePlacements: number; // talent with exactly one booked application
  // Employer
  projectsWithBooking: number;
  totalProjects: number;
  avgApplicationsPerProject: number | null;
  // Platform
  activeTalent: number; // talent with >= 1 approved media
  totalTalent: number;
  activeOrgs: number; // orgs with >= 1 project posted
  totalOrgs: number;
  openProjects: number;
  closedProjects: number;
};

export async function getMetrics(): Promise<Metrics> {
  const db = await getDb();

  // Booked applications joined to projects (drives placements + wages).
  type BookedRow = {
    talentId: string;
    projectId: string;
    dayRate: number | null;
  };
  const booked: BookedRow[] = await db
    .select({
      talentId: schema.applications.talentId,
      projectId: schema.applications.projectId,
      dayRate: schema.projects.dayRateOnset,
    })
    .from(schema.applications)
    .innerJoin(
      schema.projects,
      eq(schema.applications.projectId, schema.projects.id),
    )
    .where(eq(schema.applications.status, "booked"));

  const bookedPlacements = booked.length;
  const estimatedWagesBooked = booked.reduce(
    (s: number, r: BookedRow) => s + (r.dayRate ?? 0),
    0,
  );

  // First-time placements: talent whose booked-application count is exactly 1.
  const bookedPerTalent = new Map<string, number>();
  for (const r of booked) {
    bookedPerTalent.set(r.talentId, (bookedPerTalent.get(r.talentId) ?? 0) + 1);
  }
  let firstTimePlacements = 0;
  for (const n of bookedPerTalent.values()) if (n === 1) firstTimePlacements++;

  // Employer: projects with >= 1 booking, and avg applications per project.
  const projectsWithBooking = new Set(booked.map((r) => r.projectId)).size;

  const [projCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.projects);
  const totalProjects = Number(projCount?.n ?? 0);

  const [appCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.applications);
  const totalApplications = Number(appCount?.n ?? 0);
  const avgApplicationsPerProject =
    totalProjects > 0 ? totalApplications / totalProjects : null;

  // Platform: active talent = has >= 1 approved media.
  const activeTalentRows = await db
    .selectDistinct({ talentId: schema.media.talentId })
    .from(schema.media)
    .where(eq(schema.media.status, "approved"));
  const activeTalent = activeTalentRows.length;

  const [talentCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.talentProfiles);
  const totalTalent = Number(talentCount?.n ?? 0);

  // Active orgs = orgs with >= 1 project posted.
  const activeOrgRows = await db
    .selectDistinct({ orgId: schema.projects.orgId })
    .from(schema.projects);
  const activeOrgs = activeOrgRows.length;

  const [orgCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.orgs);
  const totalOrgs = Number(orgCount?.n ?? 0);

  const projectStatusRows = await db
    .select({ status: schema.projects.status, n: sql<number>`count(*)` })
    .from(schema.projects)
    .groupBy(schema.projects.status);
  const projByStatus: Record<string, number> = {};
  for (const r of projectStatusRows) projByStatus[r.status] = Number(r.n);

  return {
    bookedPlacements,
    estimatedWagesBooked,
    firstTimePlacements,
    projectsWithBooking,
    totalProjects,
    avgApplicationsPerProject,
    activeTalent,
    totalTalent,
    activeOrgs,
    totalOrgs,
    openProjects: projByStatus["open"] ?? 0,
    closedProjects: projByStatus["closed"] ?? 0,
  };
}

/* Small shared money formatter. Wages are whole dollars in the schema. */
export function usd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

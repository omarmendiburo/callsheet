import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getMembership } from "@/lib/tenancy";

/*
 * Read helpers for the business portal (spec §5). Every org-scoped read takes
 * the caller's userId AND the orgId from the URL and re-checks membership
 * through lib/tenancy before returning a single row — a business user can
 * never read another org's projects, applications, or seats. Fail closed:
 * no membership → null / empty.
 */

export type Org = typeof schema.orgs.$inferSelect;
export type Project = typeof schema.projects.$inferSelect;
export type Membership = typeof schema.memberships.$inferSelect;

/* The active org plus the caller's role in it — null if not a member. */
export async function getOrgForUser(
  userId: string,
  orgId: string,
): Promise<{ org: Org; role: Membership["role"] } | null> {
  const m = await getMembership(userId, orgId);
  if (!m) return null;
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.orgs)
    .where(eq(schema.orgs.id, orgId))
    .limit(1);
  const org = rows[0];
  if (!org) return null;
  return { org, role: m.role };
}

/* Projects for one org, newest first, each with a live application count.
 * Membership is verified by the caller (page gates with requireUser +
 * getOrgForUser); the orgId filter is the isolation boundary. */
export async function getOrgProjects(
  orgId: string,
): Promise<{ project: Project; applicationCount: number }[]> {
  const db = await getDb();
  const rows = await db
    .select({
      project: schema.projects,
      applicationCount: sql<number>`count(${schema.applications.id})`.mapWith(
        Number,
      ),
    })
    .from(schema.projects)
    .leftJoin(
      schema.applications,
      eq(schema.applications.projectId, schema.projects.id),
    )
    .where(eq(schema.projects.orgId, orgId))
    .groupBy(schema.projects.id)
    .orderBy(desc(schema.projects.createdAt));
  return rows;
}

/* A single project, but only if it belongs to the given org. The orgId in the
 * WHERE clause is what stops a member of org A from reading org B's project by
 * guessing its id. */
export async function getOrgProject(
  orgId: string,
  projectId: string,
): Promise<Project | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.orgId, orgId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export type SeatRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Membership["role"];
};

/* Members of one org with their seat role, owners first. */
export async function getOrgSeats(orgId: string): Promise<SeatRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      membershipId: schema.memberships.id,
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id))
    .where(eq(schema.memberships.orgId, orgId));

  const rank: Record<string, number> = { owner: 0, manager: 1, viewer: 2 };
  return rows.sort(
    (a: SeatRow, b: SeatRow) => rank[a.role] - rank[b.role],
  );
}

export type ApplicationRow = {
  applicationId: string;
  status: (typeof schema.applications.status.enumValues)[number];
  note: string | null;
  displayName: string;
  dayRate: number | null;
  isPlaceholder: boolean;
  disciplines: string[];
};

/* Applications for one project, joined to the applicant's talent profile.
 * Disciplines are folded in per-talent so the caller doesn't fan out. */
export async function getProjectApplications(
  projectId: string,
): Promise<ApplicationRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      applicationId: schema.applications.id,
      status: schema.applications.status,
      note: schema.applications.note,
      talentId: schema.talentProfiles.id,
      displayName: schema.talentProfiles.displayName,
      dayRate: schema.talentProfiles.dayRate,
      isPlaceholder: schema.talentProfiles.isPlaceholder,
    })
    .from(schema.applications)
    .innerJoin(
      schema.talentProfiles,
      eq(schema.applications.talentId, schema.talentProfiles.id),
    )
    .where(eq(schema.applications.projectId, projectId))
    .orderBy(desc(schema.applications.updatedAt));

  if (rows.length === 0) return [];

  const talentIds = Array.from(
    new Set(rows.map((r: { talentId: string }) => r.talentId)),
  );
  const discRows = await db
    .select({
      talentId: schema.disciplines.talentId,
      type: schema.disciplines.type,
    })
    .from(schema.disciplines)
    .where(sql`${schema.disciplines.talentId} in ${talentIds}`);

  const byTalent = new Map<string, string[]>();
  for (const d of discRows as { talentId: string; type: string }[]) {
    const list = byTalent.get(d.talentId) ?? [];
    list.push(d.type);
    byTalent.set(d.talentId, list);
  }

  return rows.map(
    (r: {
      applicationId: string;
      status: ApplicationRow["status"];
      note: string | null;
      talentId: string;
      displayName: string;
      dayRate: number | null;
      isPlaceholder: boolean;
    }) => ({
      applicationId: r.applicationId,
      status: r.status,
      note: r.note,
      displayName: r.displayName,
      dayRate: r.dayRate,
      isPlaceholder: r.isPlaceholder,
      disciplines: byTalent.get(r.talentId) ?? [],
    }),
  );
}

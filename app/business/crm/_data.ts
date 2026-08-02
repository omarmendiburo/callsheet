import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/*
 * CRM read layer (spec §5). The org's whole talent pipeline: every application
 * across every project the org owns, joined to the applicant's talent profile
 * and the project it targets. Isolation is the orgId filter on projects — an
 * application can only enter this list through a project carrying the caller's
 * orgId, so a member of org A can never see org B's applicants. The page gates
 * membership first (requireUser + resolveScoutOrg); this is the second wall.
 *
 * Names are correct here (unlike the work-first scout wall): these people
 * applied to THIS org, and managing applicants is name-first.
 */

export type PipelineStatus =
  (typeof schema.applications.status.enumValues)[number];

export type PipelineRow = {
  applicationId: string;
  status: PipelineStatus;
  note: string | null;
  createdAt: Date;
  talentId: string;
  displayName: string;
  isPlaceholder: boolean;
  projectId: string;
  projectTitle: string;
  disciplines: string[];
};

/* Every application on every project this org owns, newest activity first.
 * Disciplines are folded in per-talent in a second query so the caller never
 * fans out row-by-row. */
export async function getOrgPipeline(orgId: string): Promise<PipelineRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      applicationId: schema.applications.id,
      status: schema.applications.status,
      note: schema.applications.note,
      createdAt: schema.applications.createdAt,
      talentId: schema.talentProfiles.id,
      displayName: schema.talentProfiles.displayName,
      isPlaceholder: schema.talentProfiles.isPlaceholder,
      projectId: schema.projects.id,
      projectTitle: schema.projects.title,
    })
    .from(schema.applications)
    .innerJoin(
      schema.projects,
      eq(schema.applications.projectId, schema.projects.id),
    )
    .innerJoin(
      schema.talentProfiles,
      eq(schema.applications.talentId, schema.talentProfiles.id),
    )
    // The isolation boundary: only projects owned by THIS org.
    .where(eq(schema.projects.orgId, orgId))
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
      status: PipelineStatus;
      note: string | null;
      createdAt: Date;
      talentId: string;
      displayName: string;
      isPlaceholder: boolean;
      projectId: string;
      projectTitle: string;
    }) => ({
      applicationId: r.applicationId,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt,
      talentId: r.talentId,
      displayName: r.displayName,
      isPlaceholder: r.isPlaceholder,
      projectId: r.projectId,
      projectTitle: r.projectTitle,
      disciplines: byTalent.get(r.talentId) ?? [],
    }),
  );
}

/* ---- Scouting tracker (owner's call 2026-08-01) ---- */

export type TrackStatus =
  (typeof schema.talentTracks.status.enumValues)[number];

export type TrackRow = {
  trackId: string;
  status: TrackStatus;
  note: string | null;
  createdAt: Date;
  talentId: string;
  displayName: string;
  isPlaceholder: boolean;
  city: string;
  availability: string;
  availableFrom: Date | null;
  dayRate: number | null;
  disciplines: string[];
};

/* The org's private watchlist, newest first. Same isolation shape as the
 * pipeline: rows only enter through their orgId. Names are correct here. */
export async function getOrgTracks(orgId: string): Promise<TrackRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      trackId: schema.talentTracks.id,
      status: schema.talentTracks.status,
      note: schema.talentTracks.note,
      createdAt: schema.talentTracks.createdAt,
      talentId: schema.talentProfiles.id,
      displayName: schema.talentProfiles.displayName,
      isPlaceholder: schema.talentProfiles.isPlaceholder,
      city: schema.talentProfiles.city,
      availability: schema.talentProfiles.availability,
      availableFrom: schema.talentProfiles.availableFrom,
      dayRate: schema.talentProfiles.dayRate,
    })
    .from(schema.talentTracks)
    .innerJoin(
      schema.talentProfiles,
      eq(schema.talentTracks.talentId, schema.talentProfiles.id),
    )
    .where(eq(schema.talentTracks.orgId, orgId))
    .orderBy(desc(schema.talentTracks.createdAt));

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

  return rows.map((r: Omit<TrackRow, "disciplines">) => ({
    ...r,
    disciplines: byTalent.get(r.talentId) ?? [],
  }));
}

/* The org's projects that have at least one application, for the filter chip
 * row. Newest first (rows already arrive newest-activity first). Derived from
 * the pipeline so the chips only ever offer a project that has rows. */
export function projectsInPipeline(
  rows: PipelineRow[],
): { id: string; title: string }[] {
  const seen = new Map<string, string>();
  for (const r of rows) {
    if (!seen.has(r.projectId)) seen.set(r.projectId, r.projectTitle);
  }
  return Array.from(seen, ([id, title]) => ({ id, title }));
}

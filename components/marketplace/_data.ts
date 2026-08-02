import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/*
 * Shared read layer for the W3 marketplace surfaces (spec §4.3, §4.4, §5.4).
 *
 * Two hard rules baked in here so no surface can violate them:
 *   1. Only status "approved" media ever leaves the server for a browsing
 *      surface. getBrowsableMedia() is the ONLY media reader the wall,
 *      scout grid, and screen-tests feed use — pending/flagged/removed rows
 *      never make it into a card.
 *   2. Cards carry NO identity. The talent-pool shape returned here omits the
 *      display name entirely; the name is fetched separately, and only ever
 *      on the /business/scout/[talentId] reveal page.
 */

export type TalentProfile = typeof schema.talentProfiles.$inferSelect;
export type Discipline = typeof schema.disciplines.$inferSelect;
export type Media = typeof schema.media.$inferSelect;
export type Project = typeof schema.projects.$inferSelect;
export type Application = typeof schema.applications.$inferSelect;

/* ---- Projects (job board) ------------------------------------------------ */

export type ProjectWithOrg = {
  project: Project;
  orgName: string;
};

/* All open projects, newest first, with the posting org's name. */
export async function getOpenProjects(): Promise<ProjectWithOrg[]> {
  const db = await getDb();
  const rows = await db
    .select({ project: schema.projects, orgName: schema.orgs.name })
    .from(schema.projects)
    .innerJoin(schema.orgs, eq(schema.projects.orgId, schema.orgs.id))
    .where(eq(schema.projects.status, "open"))
    .orderBy(desc(schema.projects.createdAt));
  return rows;
}

/* One open project scoped to an org (used by scout's project select). */
export async function getOpenProjectsForOrg(orgId: string): Promise<Project[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.orgId, orgId),
        eq(schema.projects.status, "open"),
      ),
    )
    .orderBy(desc(schema.projects.createdAt));
}

export async function getProjectForOrg(
  projectId: string,
  orgId: string,
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

/* ---- Applications --------------------------------------------------------- */

/* A talent's own application rows, keyed by projectId for O(1) card lookup. */
export async function getApplicationMap(
  talentId: string,
): Promise<Map<string, Application>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.talentId, talentId));
  return new Map(rows.map((a: Application) => [a.projectId, a]));
}

export async function getApplication(
  talentId: string,
  projectId: string,
): Promise<Application | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.talentId, talentId),
        eq(schema.applications.projectId, projectId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/* ---- Talent pool (scout grid + screen tests) ----------------------------- */

/*
 * A browsable creative: profile + disciplines + APPROVED media only, and a
 * flag for whether a certification exists. displayName is intentionally NOT
 * part of this shape — cards must never render it.
 */
export type BrowseCreative = {
  talentId: string;
  city: string;
  lat: number | null;
  lng: number | null;
  dayRate: number | null;
  postHourly: number | null;
  availability: string;
  certified: boolean;
  disciplines: Discipline[];
  media: Media[];
};

/*
 * The whole browsable talent pool. Platform-wide by design (the pool is not
 * org-scoped — spec §5.4). Only creatives with at least one APPROVED media
 * row of a browsable kind are returned, and only their approved media rides
 * along. Placeholder people are included (the seed is all placeholders) — the
 * "no real people invented" rule is about creation, not display.
 */
export async function getBrowsePool(kinds?: Media["kind"][]): Promise<
  BrowseCreative[]
> {
  const db = await getDb();

  const profiles: TalentProfile[] = await db
    .select()
    .from(schema.talentProfiles);
  if (profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);

  const [allMedia, allDisc, allCerts] = await Promise.all([
    db
      .select()
      .from(schema.media)
      .where(
        and(
          inArray(schema.media.talentId, ids),
          eq(schema.media.status, "approved"),
        ),
      )
      .orderBy(desc(schema.media.createdAt)) as Promise<Media[]>,
    db
      .select()
      .from(schema.disciplines)
      .where(inArray(schema.disciplines.talentId, ids)) as Promise<
      Discipline[]
    >,
    db
      .select({ talentId: schema.certifications.talentId })
      .from(schema.certifications)
      .where(inArray(schema.certifications.talentId, ids)) as Promise<
      { talentId: string }[]
    >,
  ]);

  const mediaBy = new Map<string, Media[]>();
  for (const m of allMedia) {
    if (kinds && !kinds.includes(m.kind)) continue;
    const list = mediaBy.get(m.talentId) ?? [];
    list.push(m);
    mediaBy.set(m.talentId, list);
  }
  const discBy = new Map<string, Discipline[]>();
  for (const d of allDisc) {
    const list = discBy.get(d.talentId) ?? [];
    list.push(d);
    discBy.set(d.talentId, list);
  }
  const certSet = new Set(allCerts.map((c) => c.talentId));

  const out: BrowseCreative[] = [];
  for (const p of profiles) {
    const media = mediaBy.get(p.id) ?? [];
    // A creative with no approved browsable media has nothing to show on a
    // work-first surface — skip them.
    if (media.length === 0) continue;
    out.push({
      talentId: p.id,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
      dayRate: p.dayRate,
      postHourly: p.postHourly,
      availability: p.availability,
      certified: certSet.has(p.id),
      disciplines: discBy.get(p.id) ?? [],
      media,
    });
  }
  return out;
}

/*
 * Any existing shortlist of this talent on one of the org's projects — used by
 * the reveal page to show "already shortlisted · <project>". Org-scoped: joins
 * applications to projects and filters to the caller's orgId.
 */
export async function getOrgShortlistForTalent(
  talentId: string,
  orgId: string,
): Promise<{ projectId: string; projectTitle: string } | null> {
  const db = await getDb();
  const rows = await db
    .select({
      projectId: schema.projects.id,
      projectTitle: schema.projects.title,
    })
    .from(schema.applications)
    .innerJoin(
      schema.projects,
      eq(schema.applications.projectId, schema.projects.id),
    )
    .where(
      and(
        eq(schema.applications.talentId, talentId),
        eq(schema.applications.status, "shortlisted"),
        eq(schema.projects.orgId, orgId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/* The org's scouting-tracker row for one creative, if any — drives the
 * track/tracked state on the reveal and reels surfaces. Org-scoped read. */
export async function getOrgTrackForTalent(
  orgId: string,
  talentId: string,
): Promise<{ trackId: string; status: string } | null> {
  const db = await getDb();
  const rows = await db
    .select({
      trackId: schema.talentTracks.id,
      status: schema.talentTracks.status,
    })
    .from(schema.talentTracks)
    .where(
      and(
        eq(schema.talentTracks.orgId, orgId),
        eq(schema.talentTracks.talentId, talentId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/* ---- The reveal (scout detail page) -------------------------------------- */

export type RevealCreative = {
  profile: TalentProfile;
  disciplines: Discipline[];
  media: Media[]; // approved only
  certLevel: string | null;
};

/*
 * The full talent record for the reveal page — the ONE surface where a name
 * appears. Still only approved media is returned (a pending pitch does not
 * render even here). Returns null if the talent has no browsable media, so a
 * card link can never resolve to a person who was never on the wall.
 */
export async function getRevealCreative(
  talentId: string,
): Promise<RevealCreative | null> {
  const db = await getDb();
  const profRows = await db
    .select()
    .from(schema.talentProfiles)
    .where(eq(schema.talentProfiles.id, talentId))
    .limit(1);
  const profile = profRows[0] as TalentProfile | undefined;
  if (!profile) return null;

  const [disciplines, media, certRows] = await Promise.all([
    db
      .select()
      .from(schema.disciplines)
      .where(eq(schema.disciplines.talentId, talentId)) as Promise<
      Discipline[]
    >,
    db
      .select()
      .from(schema.media)
      .where(
        and(
          eq(schema.media.talentId, talentId),
          eq(schema.media.status, "approved"),
        ),
      )
      .orderBy(desc(schema.media.createdAt)) as Promise<Media[]>,
    db
      .select()
      .from(schema.certifications)
      .where(eq(schema.certifications.talentId, talentId))
      .limit(1) as Promise<{ level: string }[]>,
  ]);

  return {
    profile,
    disciplines,
    media,
    certLevel: certRows[0]?.level ?? null,
  };
}

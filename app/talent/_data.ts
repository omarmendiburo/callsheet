import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/*
 * Read helpers for the talent portal. All talent pages resolve the current
 * user's own profile through here so the shape stays consistent across the
 * dashboard, onboarding, and profile surfaces.
 */

export type TalentProfile = typeof schema.talentProfiles.$inferSelect;
export type Discipline = typeof schema.disciplines.$inferSelect;
export type Media = typeof schema.media.$inferSelect;
export type Application = typeof schema.applications.$inferSelect;

export async function getProfileByUserId(
  userId: string,
): Promise<TalentProfile | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.talentProfiles)
    .where(eq(schema.talentProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDisciplines(talentId: string): Promise<Discipline[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.disciplines)
    .where(eq(schema.disciplines.talentId, talentId));
}

export async function getMedia(talentId: string): Promise<Media[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.media)
    .where(eq(schema.media.talentId, talentId))
    .orderBy(desc(schema.media.createdAt));
}

export async function getApplications(
  talentId: string,
): Promise<{ application: Application; projectTitle: string }[]> {
  const db = await getDb();
  const rows = await db
    .select({
      application: schema.applications,
      projectTitle: schema.projects.title,
    })
    .from(schema.applications)
    .innerJoin(
      schema.projects,
      eq(schema.applications.projectId, schema.projects.id),
    )
    .where(eq(schema.applications.talentId, talentId))
    .orderBy(desc(schema.applications.updatedAt));
  return rows;
}

/*
 * Profile completeness — which of the five onboarding steps still has nothing
 * in it. Drives the dashboard "what's empty" line and onboarding entry points.
 * media[] is the caller's already-fetched list to avoid a second query.
 */
export type StepKey = "links" | "media" | "pitch" | "prompts" | "rates";

export function completeness(
  profile: TalentProfile,
  media: Media[],
): { key: StepKey; label: string; done: boolean }[] {
  const links = profile.links ?? [];
  const prompts = profile.prompts ?? [];
  const hasWork = media.some((m) => m.kind !== "pitch");
  const hasPitch = media.some((m) => m.kind === "pitch");
  const hasRates =
    profile.dayRate != null || profile.postHourly != null || profile.byoGear;
  return [
    { key: "links", label: "portfolio links", done: links.length > 0 },
    { key: "media", label: "work samples", done: hasWork },
    { key: "pitch", label: "10-second pitch", done: hasPitch },
    { key: "prompts", label: "profile prompts", done: prompts.length > 0 },
    { key: "rates", label: "rates & gear", done: hasRates },
  ];
}

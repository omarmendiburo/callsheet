import "server-only";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";

/*
 * Profile-view events (owner's ask 2026-08-02). Recording is fail-open and
 * deduped: one event per org per talent per hour, so reloads and back-and-
 * forth do not inflate the count. Talent-side reads return counts and
 * timestamps ONLY — the viewing org never crosses to the talent side.
 */

const DEDUPE_MS = 60 * 60 * 1000;

export async function recordProfileView(talentId: string, orgId: string) {
  try {
    const db = await getDb();
    const cutoff = new Date(Date.now() - DEDUPE_MS);
    const recent = await db
      .select({ id: schema.profileViews.id })
      .from(schema.profileViews)
      .where(
        and(
          eq(schema.profileViews.talentId, talentId),
          eq(schema.profileViews.orgId, orgId),
          gt(schema.profileViews.createdAt, cutoff),
        ),
      )
      .limit(1);
    if (recent.length > 0) return;
    await db.insert(schema.profileViews).values({
      id: newId("pv"),
      talentId,
      orgId,
    });
  } catch (err) {
    // A failed view record must never break the reveal.
    console.error("[views] record failed", err);
  }
}

export type ProfileOpenStats = {
  total: number;
  lastOpenedAt: Date | null;
};

export async function getProfileOpenStats(
  talentId: string,
): Promise<ProfileOpenStats> {
  const db = await getDb();
  const totalRows: { n: number }[] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.profileViews)
    .where(eq(schema.profileViews.talentId, talentId));
  const lastRows: { at: Date }[] = await db
    .select({ at: schema.profileViews.createdAt })
    .from(schema.profileViews)
    .where(eq(schema.profileViews.talentId, talentId))
    .orderBy(desc(schema.profileViews.createdAt))
    .limit(1);
  return {
    total: totalRows[0]?.n ?? 0,
    lastOpenedAt: lastRows[0]?.at ?? null,
  };
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/tenancy";
import { newId } from "@/lib/id";

/*
 * Shortlist a creative for one of the org's open projects (spec §5.4). This
 * creates or updates an application row to status "shortlisted" — the same
 * application entity the talent sees, now reflecting business interest.
 *
 * Org isolation is enforced here: the project must belong to an org the caller
 * is a member of (via lib/tenancy.getMembership). The talent pool is
 * platform-wide, but the project the shortlist attaches to is org-owned, so
 * the write is org-scoped. Fails closed on any ownership mismatch.
 */
export async function shortlistTalent(formData: FormData) {
  const user = await requireUser("business");

  const talentId = String(formData.get("talentId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!talentId || !projectId || !orgId) return;

  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 200);

  // Caller must be a member of the org.
  const membership = await getMembership(user.id, orgId);
  if (!membership) return;

  const db = await getDb();

  // The project must belong to that org and exist. Org-scoped write.
  const projRows = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.orgId, orgId),
      ),
    )
    .limit(1);
  if (projRows.length === 0) return;

  // The talent must exist.
  const talentRows = await db
    .select({ id: schema.talentProfiles.id })
    .from(schema.talentProfiles)
    .where(eq(schema.talentProfiles.id, talentId))
    .limit(1);
  if (talentRows.length === 0) return;

  const existing = await db
    .select({ id: schema.applications.id })
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.talentId, talentId),
        eq(schema.applications.projectId, projectId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.applications)
      .set({
        status: "shortlisted",
        note: note || undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, existing[0].id));
  } else {
    await db.insert(schema.applications).values({
      id: newId("app"),
      talentId,
      projectId,
      status: "shortlisted",
      note: note || null,
    });
  }

  revalidatePath(`/business/scout/${talentId}`);
  revalidatePath("/business/scout");
}

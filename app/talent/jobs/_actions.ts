"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { getProfileByUserId } from "@/app/talent/_data";

/*
 * Apply to a project (spec §4.3). The talent is re-derived from the session —
 * the client only supplies projectId + an optional note. Fails closed on a
 * missing profile, an unknown/non-open project, or a duplicate application.
 * Uniqueness is enforced both here (pre-check) and by the DB unique index on
 * (talentId, projectId); a re-apply is a silent no-op and the card re-renders
 * in its "applied" state.
 */
export async function applyToProject(formData: FormData) {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);
  if (!profile) return;

  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return;

  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 400);

  const db = await getDb();

  // Only ever apply to an OPEN project that exists.
  const projRows = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.status, "open"),
      ),
    )
    .limit(1);
  if (projRows.length === 0) return;

  // Already applied? No-op, keep the existing row untouched.
  const existing = await db
    .select({ id: schema.applications.id })
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.talentId, profile.id),
        eq(schema.applications.projectId, projectId),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    revalidatePath("/talent/jobs");
    return;
  }

  await db.insert(schema.applications).values({
    id: newId("app"),
    talentId: profile.id,
    projectId,
    status: "applied",
    note: note || null,
  });

  revalidatePath("/talent/jobs");
}

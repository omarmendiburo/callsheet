"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireOrgRole } from "@/lib/tenancy";
import { newId } from "@/lib/id";
import { notifyTalentInvited } from "@/lib/notify";

/*
 * Shortlist a creative for one of the org's open projects (spec §5.4). This
 * creates or updates an application row to status "shortlisted" — the same
 * application entity the talent sees, now reflecting business interest.
 *
 * Org isolation is enforced here: the project must belong to an org the
 * caller holds MANAGER rank in (audit 2026-08-02: all five scout mutations
 * write org state — shortlist/invite touch the same applications table
 * transitionApplication protects at manager+, so they carry the same bar;
 * viewers browse, managers act). Fails closed on any ownership mismatch.
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

  // Caller must hold manager rank in the org (redirects away otherwise).
  await requireOrgRole(user.id, orgId, "manager");

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

/*
 * Talent scouting tracker (owner's call 2026-08-01): the org's private
 * watchlist, independent of applications. All four actions re-derive the
 * caller, require MANAGER rank through lib/tenancy (audit 2026-08-02 —
 * uniform bar with the pipeline actions), and verify the row's orgId
 * before touching it — fail closed on every mismatch.
 */

const TRACK_PATHS = ["/business/crm", "/business/scout", "/business/scout/reels"];

function revalidateTrackSurfaces(talentId?: string) {
  for (const p of TRACK_PATHS) revalidatePath(p);
  if (talentId) revalidatePath(`/business/scout/${talentId}`);
}

/* Start tracking a creative (status "watching"). Idempotent: an existing row
 * only picks up a note it did not have. */
export async function trackTalent(formData: FormData) {
  const user = await requireUser("business");
  const talentId = String(formData.get("talentId") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  if (!talentId || !orgId) return;

  await requireOrgRole(user.id, orgId, "manager");

  const db = await getDb();
  const talentRows = await db
    .select({ id: schema.talentProfiles.id })
    .from(schema.talentProfiles)
    .where(eq(schema.talentProfiles.id, talentId))
    .limit(1);
  if (talentRows.length === 0) return;

  const existing = await db
    .select({ id: schema.talentTracks.id, note: schema.talentTracks.note })
    .from(schema.talentTracks)
    .where(
      and(
        eq(schema.talentTracks.orgId, orgId),
        eq(schema.talentTracks.talentId, talentId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    if (note && !existing[0].note) {
      await db
        .update(schema.talentTracks)
        .set({ note })
        .where(eq(schema.talentTracks.id, existing[0].id));
    }
  } else {
    await db.insert(schema.talentTracks).values({
      id: newId("trk"),
      orgId,
      talentId,
      status: "watching",
      note: note || null,
    });
  }

  revalidateTrackSurfaces(talentId);
}

/* Advance a tracked creative: the one legal manual step is
 * watching -> contacted. "Invited" is only reachable through
 * inviteTrackedToProject, because inviting IS the project invite. */
export async function advanceTrack(formData: FormData) {
  const user = await requireUser("business");
  const trackId = String(formData.get("trackId") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!trackId || !orgId) return;

  await requireOrgRole(user.id, orgId, "manager");

  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.talentTracks)
    .where(
      and(
        eq(schema.talentTracks.id, trackId),
        eq(schema.talentTracks.orgId, orgId),
      ),
    )
    .limit(1);
  const track = rows[0];
  if (!track || track.status !== "watching") return;

  await db
    .update(schema.talentTracks)
    .set({ status: "contacted" })
    .where(eq(schema.talentTracks.id, trackId));

  revalidateTrackSurfaces(track.talentId);
}

/* Stop tracking. Org-scoped delete; nothing else is touched. */
export async function removeTrack(formData: FormData) {
  const user = await requireUser("business");
  const trackId = String(formData.get("trackId") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!trackId || !orgId) return;

  await requireOrgRole(user.id, orgId, "manager");

  const db = await getDb();
  const rows = await db
    .select({ talentId: schema.talentTracks.talentId })
    .from(schema.talentTracks)
    .where(
      and(
        eq(schema.talentTracks.id, trackId),
        eq(schema.talentTracks.orgId, orgId),
      ),
    )
    .limit(1);
  if (!rows[0]) return;

  await db
    .delete(schema.talentTracks)
    .where(eq(schema.talentTracks.id, trackId));

  revalidateTrackSurfaces(rows[0].talentId);
}

/* Invite a tracked creative to one of the org's open projects: creates or
 * updates the application row to "shortlisted" (the same entity the talent
 * sees) and marks the track "invited". The project AND the track must both
 * belong to the caller's org. */
export async function inviteTrackedToProject(formData: FormData) {
  const user = await requireUser("business");
  const trackId = String(formData.get("trackId") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!trackId || !orgId || !projectId) return;

  await requireOrgRole(user.id, orgId, "manager");

  const db = await getDb();

  const trackRows = await db
    .select()
    .from(schema.talentTracks)
    .where(
      and(
        eq(schema.talentTracks.id, trackId),
        eq(schema.talentTracks.orgId, orgId),
      ),
    )
    .limit(1);
  const track = trackRows[0];
  if (!track) return;

  const projRows = await db
    .select({ id: schema.projects.id, title: schema.projects.title })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.orgId, orgId),
        eq(schema.projects.status, "open"),
      ),
    )
    .limit(1);
  if (projRows.length === 0) return;

  const existing = await db
    .select({ id: schema.applications.id })
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.talentId, track.talentId),
        eq(schema.applications.projectId, projectId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.applications)
      .set({ status: "shortlisted", updatedAt: new Date() })
      .where(eq(schema.applications.id, existing[0].id));
  } else {
    await db.insert(schema.applications).values({
      id: newId("app"),
      talentId: track.talentId,
      projectId,
      status: "shortlisted",
      note: track.note ? `scouted: ${track.note}` : "invited from scouting",
    });
  }

  await db
    .update(schema.talentTracks)
    .set({ status: "invited" })
    .where(eq(schema.talentTracks.id, trackId));

  await notifyTalentInvited(track.talentId, projRows[0].title);

  revalidateTrackSurfaces(track.talentId);
}

"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { notifyOrgVerified, notifyTalentMediaApproved } from "@/lib/notify";

/*
 * All admin mutations (spec §6). Defense in depth: every action re-checks
 * requireUser("admin") itself — it never trusts that a page gate already ran.
 * Each validates its input against the DB (the id must resolve to a real row)
 * and fails closed: an unknown or malformed id is a no-op, never an error the
 * caller can exploit. Media never becomes public without an explicit approve.
 */

const MEDIA_STATUSES = ["pending", "approved", "flagged", "removed"] as const;

async function requireAdmin() {
  return requireUser("admin");
}

/* ---- Users: suspend / unsuspend ---------------------------------------- */

async function setSuspended(formData: FormData, suspended: boolean) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return;

  const db = await getDb();
  // Validate the id resolves before writing. Fail closed on anything unknown.
  const rows = await db
    .select({ id: schema.users.id, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!rows[0]) return;

  await db
    .update(schema.users)
    .set({ suspended })
    .where(eq(schema.users.id, userId));

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function suspendUser(formData: FormData) {
  await setSuspended(formData, true);
}

export async function unsuspendUser(formData: FormData) {
  await setSuspended(formData, false);
}

/* ---- Orgs: verify / unverify ------------------------------------------- */

async function setVerified(formData: FormData, verified: boolean) {
  await requireAdmin();
  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) return;

  const db = await getDb();
  const rows = await db
    .select({ id: schema.orgs.id, name: schema.orgs.name, verified: schema.orgs.verified })
    .from(schema.orgs)
    .where(eq(schema.orgs.id, orgId))
    .limit(1);
  if (!rows[0]) return;

  await db
    .update(schema.orgs)
    .set({ verified })
    .where(eq(schema.orgs.id, orgId));

  if (verified && !rows[0].verified) {
    await notifyOrgVerified(orgId, rows[0].name);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function verifyOrg(formData: FormData) {
  await setVerified(formData, true);
}

export async function unverifyOrg(formData: FormData) {
  await setVerified(formData, false);
}

/* ---- Moderation: approve / flag / remove ------------------------------- */

async function setMediaStatus(
  formData: FormData,
  next: (typeof MEDIA_STATUSES)[number],
) {
  await requireAdmin();
  const mediaId = String(formData.get("mediaId") ?? "").trim();
  if (!mediaId) return;
  if (!MEDIA_STATUSES.includes(next)) return; // belt and suspenders

  const db = await getDb();
  const rows = await db
    .select({
      id: schema.media.id,
      talentId: schema.media.talentId,
      title: schema.media.title,
      status: schema.media.status,
    })
    .from(schema.media)
    .where(eq(schema.media.id, mediaId))
    .limit(1);
  if (!rows[0]) return;

  await db
    .update(schema.media)
    .set({ status: next })
    .where(eq(schema.media.id, mediaId));

  if (next === "approved" && rows[0].status !== "approved") {
    await notifyTalentMediaApproved(rows[0].talentId, rows[0].title);
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}

export async function approveMedia(formData: FormData) {
  await setMediaStatus(formData, "approved");
}

export async function flagMedia(formData: FormData) {
  await setMediaStatus(formData, "flagged");
}

export async function removeMedia(formData: FormData) {
  await setMediaStatus(formData, "removed");
}

/* ---- Certification: grant / revoke ------------------------------------- */

/*
 * Grant certification: writes a certifications row (grantedBy = the acting
 * admin, from the session — never from the form) and flips the talent's
 * certStatus to "certified". Idempotent-ish: re-granting an already-certified
 * talent just adds a fresh audit row, which is acceptable for the ledger.
 */
export async function grantCertification(formData: FormData) {
  const admin = await requireAdmin();
  const talentId = String(formData.get("talentId") ?? "").trim();
  if (!talentId) return;

  const db = await getDb();
  const rows = await db
    .select({ id: schema.talentProfiles.id })
    .from(schema.talentProfiles)
    .where(eq(schema.talentProfiles.id, talentId))
    .limit(1);
  if (!rows[0]) return;

  await db.insert(schema.certifications).values({
    id: newId("cert"),
    talentId,
    level: "certified", // placeholder level — criteria owed from HMNTY
    grantedBy: admin.id,
  });

  await db
    .update(schema.talentProfiles)
    .set({ certStatus: "certified" })
    .where(eq(schema.talentProfiles.id, talentId));

  revalidatePath("/admin/certification");
  revalidatePath("/admin");
}

/* Revoke: certStatus back to "none". The audit rows in certifications stay —
 * the ledger is append-only history, not the source of current status. */
export async function revokeCertification(formData: FormData) {
  await requireAdmin();
  const talentId = String(formData.get("talentId") ?? "").trim();
  if (!talentId) return;

  const db = await getDb();
  const rows = await db
    .select({ id: schema.talentProfiles.id })
    .from(schema.talentProfiles)
    .where(eq(schema.talentProfiles.id, talentId))
    .limit(1);
  if (!rows[0]) return;

  await db
    .update(schema.talentProfiles)
    .set({ certStatus: "none" })
    .where(eq(schema.talentProfiles.id, talentId));

  revalidatePath("/admin/certification");
  revalidatePath("/admin");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { requireOrgRole } from "@/lib/tenancy";
import { newId } from "@/lib/id";

/*
 * §5.2 seats & roles. Every action re-derives the caller from the session and
 * re-checks owner rank against the URL orgId through lib/tenancy — the client
 * never supplies its own authority. All three mutations fail closed:
 *   - add seat: owner only; new user gets role business + a membership.
 *   - change role: owner only; never demote the last owner.
 *   - remove: owner only; never remove yourself, never the last owner.
 * Roles offered for new/changed seats are manager | viewer only; ownership
 * transfer is out of scope for the pilot.
 */

const ASSIGNABLE = ["manager", "viewer"] as const;
type Assignable = (typeof ASSIGNABLE)[number];

function backToTeam(orgId: string, query = ""): never {
  redirect(`/business/${orgId}/team${query}`);
}

async function countOwners(orgId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.orgId, orgId),
        eq(schema.memberships.role, "owner"),
      ),
    );
  return rows.length;
}

/* Add a seat: create the user (role business) + a membership in this org. The
 * temp password is surfaced once to the owner via a redirect query param — it
 * is never stored in plaintext. */
export async function addSeat(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const user = await requireUser("business");
  await requireOrgRole(user.id, orgId, "owner");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const tempPassword = String(formData.get("tempPassword") ?? "");
  const roleRaw = String(formData.get("role") ?? "");
  const role: Assignable = ASSIGNABLE.includes(roleRaw as Assignable)
    ? (roleRaw as Assignable)
    : "viewer";

  if (!name || !email || !tempPassword) backToTeam(orgId, "?error=missing");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    backToTeam(orgId, "?error=email");
  if (tempPassword.length < 8) backToTeam(orgId, "?error=password");

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) backToTeam(orgId, "?error=dupe");

  const userId = newId("u");
  await db.insert(schema.users).values({
    id: userId,
    role: "business",
    email,
    name,
    passwordHash: hashPassword(tempPassword),
  });
  await db.insert(schema.memberships).values({
    id: newId("mem"),
    userId,
    orgId,
    role,
  });

  revalidatePath(`/business/${orgId}/team`);
  // Surface the temp password once, in the success state, so the owner can
  // share it privately. Password itself is not persisted in plaintext.
  backToTeam(
    orgId,
    `?added=${encodeURIComponent(email)}&temp=${encodeURIComponent(tempPassword)}`,
  );
}

/* Change a member's role. Never demote the last owner; only manager|viewer are
 * assignable targets (an owner can't be reassigned this way). */
export async function changeRole(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const user = await requireUser("business");
  await requireOrgRole(user.id, orgId, "owner");

  const membershipId = String(formData.get("membershipId") ?? "");
  const roleRaw = String(formData.get("role") ?? "");
  const role: Assignable = ASSIGNABLE.includes(roleRaw as Assignable)
    ? (roleRaw as Assignable)
    : "viewer";
  if (!membershipId) backToTeam(orgId, "?error=missing");

  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.id, membershipId),
        eq(schema.memberships.orgId, orgId),
      ),
    )
    .limit(1);
  const target = rows[0];
  // Membership must exist AND belong to THIS org — the orgId filter is the
  // isolation boundary against editing another org's seat by id.
  if (!target) backToTeam(orgId, "?error=notfound");

  // Demoting the last owner would strand the org with no owner.
  if (target.role === "owner" && (await countOwners(orgId)) <= 1) {
    backToTeam(orgId, "?error=lastowner");
  }

  await db
    .update(schema.memberships)
    .set({ role })
    .where(eq(schema.memberships.id, membershipId));

  revalidatePath(`/business/${orgId}/team`);
  backToTeam(orgId);
}

/* Remove a member. Never yourself; never the last owner. */
export async function removeSeat(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const user = await requireUser("business");
  await requireOrgRole(user.id, orgId, "owner");

  const membershipId = String(formData.get("membershipId") ?? "");
  if (!membershipId) backToTeam(orgId, "?error=missing");

  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.id, membershipId),
        eq(schema.memberships.orgId, orgId),
      ),
    )
    .limit(1);
  const target = rows[0];
  if (!target) backToTeam(orgId, "?error=notfound");

  if (target.userId === user.id) backToTeam(orgId, "?error=self");

  if (target.role === "owner" && (await countOwners(orgId)) <= 1) {
    backToTeam(orgId, "?error=lastowner");
  }

  // Reassign this member's own applications? None: seats don't own talent rows.
  // Remove the membership only — the user account stays (may hold other seats).
  await db
    .delete(schema.memberships)
    .where(
      and(
        eq(schema.memberships.id, membershipId),
        eq(schema.memberships.orgId, orgId),
        ne(schema.memberships.userId, user.id),
      ),
    );

  revalidatePath(`/business/${orgId}/team`);
  backToTeam(orgId);
}

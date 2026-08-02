import "server-only";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";

/*
 * Multi-tenant isolation, query-layer enforced.
 * Every org-scoped read/write goes through these helpers so a business
 * user can only ever touch rows carrying their own orgId.
 * Roles: owner > manager > viewer (spec §5.2).
 */

const ROLE_RANK: Record<string, number> = { viewer: 0, manager: 1, owner: 2 };

export type Membership = typeof schema.memberships.$inferSelect;

export async function getMembership(
  userId: string,
  orgId: string,
): Promise<Membership | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.userId, userId),
        eq(schema.memberships.orgId, orgId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listUserOrgs(userId: string) {
  const db = await getDb();
  return db
    .select({
      org: schema.orgs,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.orgs, eq(schema.memberships.orgId, schema.orgs.id))
    .where(eq(schema.memberships.userId, userId));
}

/* Redirect (not throw): unauthenticated flows land on login, wrong-org
 * flows land on the org switcher. Fail closed — no membership, no access. */
export async function requireOrgRole(
  userId: string,
  orgId: string,
  minRole: "viewer" | "manager" | "owner",
): Promise<Membership> {
  const m = await getMembership(userId, orgId);
  if (!m || ROLE_RANK[m.role] < ROLE_RANK[minRole]) redirect("/business");
  return m;
}

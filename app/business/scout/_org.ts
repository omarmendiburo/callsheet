import "server-only";
import { redirect } from "next/navigation";
import { listUserOrgs, getMembership } from "@/lib/tenancy";
import { schema } from "@/lib/db";

/*
 * Resolve which org a business user is scouting on behalf of (spec §5.4:
 * "membership in the org query param or their single org"). Fails closed:
 * - no memberships           -> back to /business (they need an org first)
 * - ?org=X and a member of X -> that org
 * - ?org=X but NOT a member  -> back to /business (never leak another org)
 * - no ?org, single org      -> that org
 * - no ?org, multiple orgs   -> caller decides (returns the list to switch)
 */

export type Org = typeof schema.orgs.$inferSelect;

export type OrgResolution =
  | { kind: "org"; org: Org; orgs: { org: Org; role: string }[] }
  | { kind: "choose"; orgs: { org: Org; role: string }[] };

export async function resolveScoutOrg(
  userId: string,
  orgParam?: string,
): Promise<OrgResolution> {
  const orgs = (await listUserOrgs(userId)) as { org: Org; role: string }[];
  if (orgs.length === 0) redirect("/business");

  if (orgParam) {
    const membership = await getMembership(userId, orgParam);
    if (!membership) redirect("/business");
    const match = orgs.find((o) => o.org.id === orgParam);
    // Membership exists but org row somehow missing — fail closed.
    if (!match) redirect("/business");
    return { kind: "org", org: match.org, orgs };
  }

  if (orgs.length === 1) {
    return { kind: "org", org: orgs[0].org, orgs };
  }

  return { kind: "choose", orgs };
}

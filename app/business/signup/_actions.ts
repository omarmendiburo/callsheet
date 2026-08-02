"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { newId } from "@/lib/id";
import { resolveLocation } from "@/lib/geo";
import { WORK_TYPES } from "@/lib/taxonomy";
import { notifyAdminsNewOrg, notifyBusinessWelcome } from "@/lib/notify";
import { recordAcceptance } from "@/lib/legal";

/*
 * §5.1 org signup. Creates, in one submission: the owner's user (role
 * business), the org, and an owner membership tying them together, then a
 * session and a redirect into /business. Everything below is validated
 * server-side; client values are never trusted. A real path — isPlaceholder
 * stays FALSE.
 *
 * Validation failures RETURN a state code instead of redirecting (owner's bug
 * report 2026-08-02: the ?error= redirect re-rendered the page and wiped every
 * field). With useActionState there is no navigation, so the filled form
 * survives its own errors.
 */

export type SignupState = { code: string | null };

/* Accept a bare domain and return a full https URL, or null if it is not even
 * a plausible domain. "harborlight.org" -> "https://harborlight.org". */
function normalizeWebsite(raw: string): string | null {
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    // host must have a dot and a letter TLD (rules out "foo", "http://x").
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const einRaw = String(formData.get("ein") ?? "").trim();
  const ein = einRaw.replace(/[\s-]/g, "");
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const websiteRaw = String(formData.get("website") ?? "").trim();

  // Work types arrive as repeated checkbox values; keep only real taxonomy
  // members so a forged value can't land in the jsonb column.
  const workTypes = formData
    .getAll("workType")
    .map((w) => String(w))
    .filter((w) => (WORK_TYPES as readonly string[]).includes(w));

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (formData.get("agree") !== "on") return { code: "agree" };
  if (!orgName || !name || !email || !password) return { code: "missing" };
  if (!/^\d{9}$/.test(ein)) return { code: "ein" };
  if (workTypes.length === 0) return { code: "worktypes" };
  if (!city) return { code: "city" };
  if (password.length < 8) return { code: "password" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { code: "email" };

  // Website is optional and forgiving (owner's ask 2026-08-02): people type
  // "harborlight.org", not "https://www.harborlight.org". Add the scheme
  // ourselves; only reject something that isn't a plausible domain at all.
  const website = normalizeWebsite(websiteRaw);
  if (websiteRaw && website === null) return { code: "website" };

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) return { code: "dupe" };

  const userId = newId("u");
  const orgId = newId("org");
  const loc = resolveLocation(city);
  const fullAddress = address ? `${address}, ${loc.city}` : loc.city;

  await db.insert(schema.users).values({
    id: userId,
    role: "business",
    email,
    phone: phone || null,
    name,
    passwordHash: hashPassword(password),
  });

  await db.insert(schema.orgs).values({
    id: orgId,
    name: orgName,
    ein,
    address: fullAddress,
    lat: loc.lat,
    lng: loc.lng,
    workTypes,
    website,
    verified: false,
    isPlaceholder: false,
  });

  await db.insert(schema.memberships).values({
    id: newId("mem"),
    userId,
    orgId,
    role: "owner",
  });

  await recordAcceptance(userId);
  await notifyBusinessWelcome(email, name.split(" ")[0] || name, orgName);
  await notifyAdminsNewOrg(orgName);

  await createSession(userId);
  redirect("/business");
}

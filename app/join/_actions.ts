"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { newId } from "@/lib/id";
import { geocodeCity } from "@/lib/geo";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";
import { notifyTalentWelcome } from "@/lib/notify";
import { recordAcceptance } from "@/lib/legal";
import type { JoinState } from "./messages";

const LEVEL_IDS = LEVELS.map((l) => l.id) as readonly string[];

/*
 * §4.1 talent signup — the conversational (typeform-style) intake posts here
 * once, at the very end. The client walks the questions one at a time, but the
 * only thing that matters for correctness is this action: every field is
 * re-validated server-side and the client's step state is never trusted. A
 * real signup path (isPlaceholder FALSE).
 *
 * On any validation problem we return { code } instead of redirecting, so the
 * client can drop the person back on the exact question that failed with a
 * plain friendly line and every earlier answer still in place. Success creates
 * the user, profile, and disciplines, opens a session, and redirects.
 */

export async function join(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Disciplines arrive as parallel values: a checked discipline name plus its
  // per-craft level (level_<discipline>). Only keep rows whose discipline is in
  // the taxonomy AND whose level is a real level — anything else is a forged
  // client value, dropped.
  const chosen = formData
    .getAll("discipline")
    .map((d) => String(d))
    .filter((d) => (DISCIPLINES as readonly string[]).includes(d));
  const disciplineRows = chosen
    .map((type) => {
      const level = String(formData.get(`level_${type}`) ?? "");
      return { type, level };
    })
    .filter((r) => LEVEL_IDS.includes(r.level));

  const travel = formData.get("travel") === "yes";
  const radiusRaw = String(formData.get("travelRadiusMiles") ?? "").trim();
  const radius = travel && radiusRaw ? Number.parseInt(radiusRaw, 10) : null;

  const fail = (code: string): JoinState => ({ code });

  if (formData.get("agree") !== "on") return fail("agree");
  if (!name || !email || !password) return fail("missing");
  if (password.length < 8) return fail("password");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("email");
  if (!city) return fail("city");
  if (disciplineRows.length === 0) return fail("disciplines");
  if (radius !== null && (!Number.isFinite(radius) || radius <= 0))
    return fail("radius");

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) return fail("dupe");

  const userId = newId("u");
  const talentId = newId("t");
  const geo = geocodeCity(city);

  await db.insert(schema.users).values({
    id: userId,
    role: "talent",
    email,
    phone: phone || null,
    name,
    passwordHash: hashPassword(password),
  });

  await db.insert(schema.talentProfiles).values({
    id: talentId,
    userId,
    displayName: name,
    city,
    lat: geo?.lat,
    lng: geo?.lng,
    willingToTravel: travel,
    travelRadiusMiles: radius,
    isPlaceholder: false,
  });

  await db.insert(schema.disciplines).values(
    disciplineRows.map((r) => ({
      id: newId("disc"),
      talentId,
      type: r.type,
      level: r.level as (typeof LEVEL_IDS)[number],
    })),
  );

  await recordAcceptance(userId);
  await notifyTalentWelcome(email, name.split(" ")[0] || name);

  await createSession(userId);
  redirect("/talent/onboarding");
}

"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { isRealMediaUrl, looksVertical } from "@/lib/media";
import { DISCIPLINES, LEVELS, PROFILE_PROMPTS } from "@/lib/taxonomy";
import { resolveLocation } from "@/lib/geo";
import { getProfileByUserId } from "./_data";

/*
 * Onboarding step mutations (spec §4.2). Every action re-derives the current
 * talent from the session — the client never supplies a talentId — and
 * validates each field server-side. Skippable: an empty submission is allowed
 * and simply saves nothing. Each step redirects to `next` on success.
 */

async function currentTalentId(): Promise<string> {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);
  // A talent user without a profile is a broken account; send them home rather
  // than let a mutation run against nothing.
  if (!profile) redirect("/talent");
  return profile.id;
}

const MEDIA_KINDS = ["reel", "shortform", "headshot", "still"] as const;
type WorkKind = (typeof MEDIA_KINDS)[number];

/* Step 1 — portfolio links (label + url pairs). */
export async function saveLinks(formData: FormData) {
  const talentId = await currentTalentId();
  const labels = formData.getAll("linkLabel").map((v) => String(v).trim());
  const urls = formData.getAll("linkUrl").map((v) => String(v).trim());

  const links: { label: string; url: string }[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const label = labels[i] ?? "";
    if (!url) continue;
    // Fail closed on anything that isn't an http(s) URL.
    if (!/^https?:\/\/\S+$/i.test(url)) continue;
    links.push({ label: label || url, url });
  }

  const db = await getDb();
  await db
    .update(schema.talentProfiles)
    .set({ links })
    .where(eq(schema.talentProfiles.id, talentId));

  redirect(String(formData.get("next") ?? "/talent/onboarding?step=2"));
}

/* Step 2 & 3 — register a work sample or a pitch as a titled media row.
 * No uploads tonight: a pasted YouTube / Vimeo / Instagram / web link becomes
 * the row's url and renders as a real embed once approved; without a link the
 * row keeps the "placeholder:user" scheme and renders as a letterbox. Either
 * way status starts "pending" — nothing goes public before moderation. */
export type AddMediaState = { code: string | null };

const DEFAULT_TITLES: Record<WorkKind | "pitch", string> = {
  reel: "Reel",
  shortform: "Shortform piece",
  headshot: "Headshot",
  still: "Still",
  pitch: "Ten-second pitch",
};

export async function addMedia(
  _prev: AddMediaState,
  formData: FormData,
): Promise<AddMediaState> {
  const talentId = await currentTalentId();
  const rawKind = String(formData.get("kind") ?? "");
  const isPitch = rawKind === "pitch";
  const kind: WorkKind | "pitch" = isPitch
    ? "pitch"
    : MEDIA_KINDS.includes(rawKind as WorkKind)
      ? (rawKind as WorkKind)
      : "reel";
  const rawTitle = String(formData.get("title") ?? "").trim();
  const vertical = formData.get("vertical") === "on";
  const next = String(formData.get("next") ?? "/talent/onboarding?step=2");

  const rawUrl = String(formData.get("url") ?? "").trim();
  // A wholly empty submission has nothing to add: say so instead of the old
  // silent bounce (owner's bug report 2026-08-02: "the videos aren't
  // working" was this exact no-op).
  if (!rawTitle && !rawUrl) return { code: "empty" };
  // A link that is present but malformed gets a visible error, never a
  // silently dead placeholder row.
  if (rawUrl && (rawUrl.length > 500 || !isRealMediaUrl(rawUrl)))
    return { code: "url" };

  // Title is optional: a URL-only add gets a sensible name for its kind.
  const title = rawTitle || DEFAULT_TITLES[kind];
  const url = rawUrl || "placeholder:user";

  const db = await getDb();
  await db.insert(schema.media).values({
    id: newId("m"),
    talentId,
    kind,
    url,
    title: title.slice(0, 120),
    // Shorts/reels links are vertical by nature; the checkbox still wins for
    // everything else. Pitches are always vertical (spec §4.2).
    vertical: isPitch ? true : vertical || looksVertical(url),
    status: "pending",
  });

  redirect(next);
}

export async function deleteMedia(formData: FormData) {
  const talentId = await currentTalentId();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "/talent/onboarding?step=2");
  if (id) {
    const db = await getDb();
    const rows = await db
      .select({ talentId: schema.media.talentId })
      .from(schema.media)
      .where(eq(schema.media.id, id))
      .limit(1);
    // Only ever delete your own row.
    if (rows[0]?.talentId === talentId) {
      await db.delete(schema.media).where(eq(schema.media.id, id));
    }
  }
  redirect(next);
}

/* Step 4 — up to three profile prompts. Only prompts from the taxonomy with a
 * non-empty answer are kept; a max of three. */
export async function savePrompts(formData: FormData) {
  const talentId = await currentTalentId();
  const kept: { prompt: string; answer: string }[] = [];
  for (const prompt of PROFILE_PROMPTS) {
    const answer = String(formData.get(`answer::${prompt}`) ?? "").trim();
    if (!answer) continue;
    kept.push({ prompt, answer: answer.slice(0, 400) });
    if (kept.length === 3) break;
  }

  const db = await getDb();
  await db
    .update(schema.talentProfiles)
    .set({ prompts: kept })
    .where(eq(schema.talentProfiles.id, talentId));

  redirect(String(formData.get("next") ?? "/talent/onboarding?step=5"));
}

/* Step 5 — rates & gear. */
export async function saveRates(formData: FormData) {
  const talentId = await currentTalentId();

  const parseRate = (name: string): number | null => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const dayRate = parseRate("dayRate");
  const postHourly = parseRate("postHourly");
  const byoGear = formData.get("byoGear") === "on";
  const gearNotes = String(formData.get("gearNotes") ?? "").trim().slice(0, 400);

  const db = await getDb();
  await db
    .update(schema.talentProfiles)
    .set({
      dayRate,
      postHourly,
      byoGear,
      gearNotes: gearNotes || null,
    })
    .where(eq(schema.talentProfiles.id, talentId));

  redirect(String(formData.get("next") ?? "/talent"));
}

/* Step 6 — basics: name, city, travel, availability, and the disciplines
 * editor (profile-edit epic, owner's go 2026-08-02). Same skippable idiom as
 * the other steps: only values that parse are applied, an empty field keeps
 * what was there. Disciplines reconcile insert/update/delete against the
 * taxonomy; an empty selection changes nothing (a profile never goes
 * craftless from here). */
export async function saveBasics(formData: FormData) {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/talent");
  const talentId = profile.id;
  const db = await getDb();

  const displayName = String(formData.get("displayName") ?? "")
    .trim()
    .slice(0, 80);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const willingToTravel = formData.get("willingToTravel") === "on";
  const radiusRaw = String(formData.get("travelRadiusMiles") ?? "").trim();
  const radiusN = Number.parseInt(radiusRaw, 10);
  const travelRadiusMiles =
    willingToTravel && Number.isFinite(radiusN) && radiusN > 0
      ? Math.min(radiusN, 3000)
      : null;

  const patch: Partial<typeof schema.talentProfiles.$inferInsert> = {
    willingToTravel,
    travelRadiusMiles,
  };
  if (displayName) patch.displayName = displayName;
  if (city && city !== profile.city) {
    const loc = resolveLocation(city);
    patch.city = loc.city;
    patch.lat = loc.lat;
    patch.lng = loc.lng;
  }

  // Availability: "now" and "unavailable" always apply; "from_date" only with
  // a parseable date (otherwise no change rather than a silent lie).
  const avail = String(formData.get("availability") ?? "");
  if (avail === "now" || avail === "unavailable") {
    patch.availability = avail;
    patch.availableFrom = null;
  } else if (avail === "from_date") {
    const from = new Date(String(formData.get("availableFrom") ?? ""));
    if (!Number.isNaN(from.getTime())) {
      patch.availability = "from_date";
      patch.availableFrom = from;
    }
  }

  await db
    .update(schema.talentProfiles)
    .set(patch)
    .where(eq(schema.talentProfiles.id, talentId));

  // Keep the account name in step with the profile name (shell greeting, CRM).
  if (displayName) {
    await db
      .update(schema.users)
      .set({ name: displayName })
      .where(eq(schema.users.id, user.id));
  }

  // Disciplines reconciliation. Form: checkbox disc=<type> + level::<type>.
  const LEVEL_IDS = LEVELS.map((l) => l.id) as readonly string[];
  const chosen = new Map<string, string>();
  for (const t of formData.getAll("disc").map(String)) {
    if (!(DISCIPLINES as readonly string[]).includes(t)) continue;
    const level = String(formData.get(`level::${t}`) ?? "");
    chosen.set(t, LEVEL_IDS.includes(level) ? level : "professional");
  }
  if (chosen.size > 0) {
    type DisciplineRow = typeof schema.disciplines.$inferSelect;
    const current: DisciplineRow[] = await db
      .select()
      .from(schema.disciplines)
      .where(eq(schema.disciplines.talentId, talentId));
    const currentByType = new Map(
      current.map((d: DisciplineRow) => [d.type, d]),
    );
    for (const d of current) {
      if (!chosen.has(d.type)) {
        await db
          .delete(schema.disciplines)
          .where(eq(schema.disciplines.id, d.id));
      }
    }
    for (const [type, level] of chosen) {
      const existing = currentByType.get(type);
      if (!existing) {
        await db.insert(schema.disciplines).values({
          id: newId("d"),
          talentId,
          type,
          level: level as (typeof LEVELS)[number]["id"],
        });
      } else if (existing.level !== level) {
        await db
          .update(schema.disciplines)
          .set({ level: level as (typeof LEVELS)[number]["id"] })
          .where(eq(schema.disciplines.id, existing.id));
      }
    }
  }

  redirect(String(formData.get("next") ?? "/talent/profile"));
}

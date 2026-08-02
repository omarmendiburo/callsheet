"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { isRealMediaUrl, looksVertical } from "@/lib/media";
import { PROFILE_PROMPTS } from "@/lib/taxonomy";
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
export async function addMedia(formData: FormData) {
  const talentId = await currentTalentId();
  const rawKind = String(formData.get("kind") ?? "");
  const isPitch = rawKind === "pitch";
  const kind: WorkKind | "pitch" = isPitch
    ? "pitch"
    : MEDIA_KINDS.includes(rawKind as WorkKind)
      ? (rawKind as WorkKind)
      : "reel";
  const title = String(formData.get("title") ?? "").trim();
  const vertical = formData.get("vertical") === "on";
  const next = String(formData.get("next") ?? "/talent/onboarding?step=2");

  // Nothing to register without a title — skippable, so just bounce back.
  if (!title) redirect(next);

  // Link is optional; only a well-formed http(s) URL is stored. Anything else
  // registers the piece as a plain frame (fail closed, keep the title).
  const rawUrl = String(formData.get("url") ?? "").trim();
  const url =
    rawUrl && rawUrl.length <= 500 && isRealMediaUrl(rawUrl)
      ? rawUrl
      : "placeholder:user";

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

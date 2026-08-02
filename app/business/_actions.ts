"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireOrgRole } from "@/lib/tenancy";
import { notifyTalentApplicationStatus } from "@/lib/notify";
import { newId } from "@/lib/id";
import { geocodeCity } from "@/lib/geo";
import { DISCIPLINES, LEVELS, PROJECT_TYPES } from "@/lib/taxonomy";

/*
 * §5.3 project creation and §5.1/§5.3 application transitions. Both actions
 * re-derive the caller from the session and re-check manager rank against the
 * URL orgId through lib/tenancy — a business user can never write to another
 * org's project. Every field is validated server-side; forged vocab values are
 * dropped, not trusted.
 */

const LEVEL_IDS = LEVELS.map((l) => l.id) as readonly string[];
const BYO = ["not_needed", "preferred", "required"] as const;
type Byo = (typeof BYO)[number];

const STATUSES = [
  "applied",
  "viewed",
  "shortlisted",
  "booked",
  "declined",
] as const;
type AppStatus = (typeof STATUSES)[number];

/* Allowed forward transitions plus "declined" from any non-terminal state.
 * Terminal states (booked, declined) can't be moved on from. */
const FORWARD: Record<AppStatus, AppStatus | null> = {
  applied: "viewed",
  viewed: "shortlisted",
  shortlisted: "booked",
  booked: null,
  declined: null,
};

function parseRate(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDate(formData: FormData, name: string): Date | null {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* §5.3 create a project (manager+). Status opens at "open". */
export async function createProject(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const user = await requireUser("business");
  await requireOrgRole(user.id, orgId, "manager");

  const err = (code: string): never =>
    redirect(`/business/${orgId}/projects/new?error=${code}`);

  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const type = (PROJECT_TYPES as readonly string[]).includes(typeRaw)
    ? typeRaw
    : "";
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  const start = parseDate(formData, "timelineStart");
  const end = parseDate(formData, "timelineEnd");

  /* Per-role terms (owner's call 2026-08-01): one JSON field from the
   * RolesEditor, re-validated row by row — forged disciplines, levels,
   * gear values, and absurd numbers are dropped or clamped, never trusted. */
  type RoleRow = {
    discipline: string;
    count: number;
    level?: string;
    dayRate?: number;
    hourlyPost?: number;
    byoGear?: Byo;
    remote?: boolean;
  };
  const rolesNeeded: RoleRow[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("rolesJson") ?? "[]"));
    if (Array.isArray(parsed)) {
      for (const raw of parsed.slice(0, 20)) {
        if (typeof raw !== "object" || raw === null) continue;
        const discipline = String(raw.discipline ?? "");
        if (!(DISCIPLINES as readonly string[]).includes(discipline)) continue;
        const count = Number.parseInt(String(raw.count ?? ""), 10);
        if (!Number.isFinite(count) || count < 1) continue;
        const row: RoleRow = { discipline, count: Math.min(count, 99) };
        const level = String(raw.level ?? "");
        if (LEVEL_IDS.includes(level)) row.level = level;
        const dayRate = Number.parseInt(String(raw.dayRate ?? ""), 10);
        if (Number.isFinite(dayRate) && dayRate > 0)
          row.dayRate = Math.min(dayRate, 100000);
        const hourlyPost = Number.parseInt(String(raw.hourlyPost ?? ""), 10);
        if (Number.isFinite(hourlyPost) && hourlyPost > 0)
          row.hourlyPost = Math.min(hourlyPost, 10000);
        if (BYO.includes(raw.byoGear as Byo)) row.byoGear = raw.byoGear as Byo;
        if (raw.remote === true) row.remote = true;
        rolesNeeded.push(row);
      }
    }
  } catch {
    // fall through — empty rolesNeeded fails validation below
  }
  const remoteOk = rolesNeeded.some((r) => r.remote === true);

  if (!title) err("title");
  if (!type) err("type");
  if (!location) err("location");
  if (rolesNeeded.length === 0) err("roles");
  if (start && end && end < start) err("timeline");

  const geo = geocodeCity(location);
  const projectId = newId("p");

  const db = await getDb();
  await db.insert(schema.projects).values({
    id: projectId,
    orgId,
    title: title.slice(0, 160),
    type,
    description: description ? description.slice(0, 4000) : null,
    timelineStart: start,
    timelineEnd: end,
    location,
    lat: geo?.lat,
    lng: geo?.lng,
    remoteOk,
    dayRateOnset: null,
    hourlyPostprod: null,
    byoGear: "not_needed",
    rolesNeeded,
    status: "open",
  });

  revalidatePath(`/business/${orgId}`);
  redirect(`/business/${orgId}/projects/${projectId}`);
}

/* §5 move an application's status (manager+). Only the allowed next step, or a
 * decline from any non-terminal state, is honoured — anything else is a no-op
 * redirect. The project's orgId is verified against the caller's membership,
 * and the application is verified to belong to that project. */
export async function transitionApplication(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const target = String(formData.get("target") ?? "") as AppStatus;

  const user = await requireUser("business");
  await requireOrgRole(user.id, orgId, "manager");

  const back = (): never =>
    redirect(`/business/${orgId}/projects/${projectId}`);

  if (!STATUSES.includes(target)) back();

  const db = await getDb();

  // The project must belong to THIS org — the orgId filter blocks moving an
  // application on a project the caller has no authority over.
  const projRows = await db
    .select({ id: schema.projects.id, title: schema.projects.title })
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)),
    )
    .limit(1);
  if (!projRows[0]) back();

  // The application must belong to THIS project.
  const appRows = await db
    .select()
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.id, applicationId),
        eq(schema.applications.projectId, projectId),
      ),
    )
    .limit(1);
  const app = appRows[0];
  if (!app) back();

  const current = app.status as AppStatus;
  const allowed = target === "declined" || FORWARD[current] === target;
  // "declined" is only reachable from a non-terminal state.
  const declinableFrom = current !== "booked" && current !== "declined";
  const ok = target === "declined" ? declinableFrom : allowed;
  if (!ok) back();

  await db
    .update(schema.applications)
    .set({ status: target, updatedAt: new Date() })
    .where(eq(schema.applications.id, applicationId));

  if (
    target === "shortlisted" ||
    target === "booked" ||
    target === "declined"
  ) {
    await notifyTalentApplicationStatus(app.talentId, projRows[0].title, target);
  }

  revalidatePath(`/business/${orgId}/projects/${projectId}`);
  back();
}

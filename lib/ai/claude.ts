import type {
  CandidateFacts,
  ProjectFacts,
  RecruiterFilters,
} from "./types";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";

/*
 * The Claude engine. Activates automatically when ANTHROPIC_API_KEY is set.
 * Direct fetch to the Messages API — no SDK, no new dependencies.
 *
 * Two entry points, both of which NEVER throw: on any error or malformed
 * response they log one server-side line and return null so the caller falls
 * back to the deterministic heuristic engine. The app must never 500 because
 * Claude hiccuped.
 *
 * PII DISCIPLINE: only the structured, PII-free CandidateFacts / ProjectFacts
 * shapes are ever serialized into a prompt. No emails, phones, or auth fields
 * are assembled here — the caller passes facts that already exclude them.
 *
 * NOTE (as of build): ANTHROPIC_API_KEY is not set in this environment, so
 * this path is real but UNEXERCISED tonight. It goes live the moment the key
 * lands, with no other code change.
 */

/* Model id lives in exactly one place. */
export const CLAUDE_MODEL = "claude-sonnet-5";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 1024; // modest — we ask for compact JSON only
const TIMEOUT_MS = 20_000;

/*
 * Daily call ceiling (audit 2026-08-02): a code-level backstop so a stuck
 * loop or a rapid-fire user cannot generate unbounded spend. Counter is
 * in-memory per server instance — it resets on cold start, so it bounds
 * runaway behavior rather than metering exact global spend. Omar + the
 * founders set the real budget number; AI_DAILY_CALL_CAP overrides the
 * default. Over the cap, every call quietly returns null and the product
 * falls back to the heuristic engine (its designed failure mode).
 */
const DEFAULT_DAILY_CAP = 200;
let capDay = "";
let callsToday = 0;

function dailyCap(): number {
  const raw = Number.parseInt(process.env.AI_DAILY_CALL_CAP ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_CAP;
}

function underDailyCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== capDay) {
    capDay = today;
    callsToday = 0;
  }
  if (callsToday >= dailyCap()) return false;
  callsToday += 1;
  return true;
}

/* Exposed for /api/ai/health and the admin overview. */
export function claudeUsageToday(): { calls: number; cap: number } {
  const today = new Date().toISOString().slice(0, 10);
  return { calls: today === capDay ? callsToday : 0, cap: dailyCap() };
}

/* One scored candidate as returned by Claude, before validation. */
export type ClaudeMatchRaw = {
  talentId: string;
  score: number;
  rationale: string;
};

/* Low-level call. Returns the assistant text, or null on any failure. */
async function callClaude(
  system: string,
  userContent: string,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!underDailyCap()) {
    console.error(
      `[ai/claude] daily call cap reached (${dailyCap()}); falling back to heuristic`,
    );
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) {
      console.error(
        `[ai/claude] non-OK response ${res.status}; falling back to heuristic`,
      );
      return null;
    }
    const data: unknown = await res.json();
    return extractText(data);
  } catch (err) {
    console.error(
      `[ai/claude] request failed (${errName(err)}); falling back to heuristic`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function errName(err: unknown): string {
  if (err && typeof err === "object" && "name" in err) {
    return String((err as { name: unknown }).name);
  }
  return "error";
}

/* Pull the text out of a Messages API response, defensively. */
function extractText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  const out: string[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "text" &&
      typeof (block as { text?: unknown }).text === "string"
    ) {
      out.push((block as { text: string }).text);
    }
  }
  return out.length > 0 ? out.join("") : null;
}

/* Strip ``` fences and parse JSON. Returns null on any parse failure. */
function parseJsonLoose(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();
  // If the model wrapped prose around the JSON, grab the first {...} or [...].
  if (!(t.startsWith("{") || t.startsWith("["))) {
    const obj = t.match(/[[{][\s\S]*[\]}]/);
    if (obj) t = obj[0];
  }
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

/*
 * Talent Match via Claude. Sends project facts + PII-free candidate facts,
 * asks for a strict JSON array [{talentId, score, rationale}]. Validates ids
 * against the candidate set and clamps scores. Returns null on any problem.
 */
export async function claudeRankMatch(
  project: ProjectFacts,
  candidates: CandidateFacts[],
): Promise<ClaudeMatchRaw[] | null> {
  if (candidates.length === 0) return [];

  const validIds = new Set(candidates.map((c) => c.talentId));
  const system =
    "You are a casting assistant for a creative-work network. You RANK and " +
    "EXPLAIN only. You never reject, hide, contact, or book anyone. Score " +
    "each candidate 0-100 for fit to the project and give a one-to-two " +
    "sentence rationale citing only the facts provided (shared disciplines, " +
    "level, distance, rates, availability). Never invent facts. Respond with " +
    "ONLY a JSON array, no prose, no code fences.";

  const payload = {
    project: {
      title: project.title,
      type: project.type,
      location: project.location,
      dayRateOnset: project.dayRateOnset,
      hourlyPostprod: project.hourlyPostprod,
      neededDisciplines: project.neededDisciplines,
      neededLevels: project.neededLevels,
    },
    candidates: candidates.map((c) => ({
      talentId: c.talentId,
      disciplines: c.disciplines,
      city: c.city,
      distanceMiles: c.distanceMiles,
      dayRate: c.dayRate,
      postHourly: c.postHourly,
      availability: c.availability,
    })),
  };

  const userContent =
    "Rank these candidates for the project. Return a JSON array where each " +
    'item is {"talentId": string, "score": number 0-100, "rationale": ' +
    'string}. Use only these talentIds.\n\n' +
    JSON.stringify(payload);

  const text = await callClaude(system, userContent);
  if (text == null) return null;

  const parsed = parseJsonLoose(text);
  if (!Array.isArray(parsed)) {
    console.error("[ai/claude] match response was not a JSON array");
    return null;
  }

  const out: ClaudeMatchRaw[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { talentId?: unknown }).talentId;
    const rationale = (item as { rationale?: unknown }).rationale;
    if (typeof id !== "string" || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      talentId: id,
      score: clampScore((item as { score?: unknown }).score),
      rationale:
        typeof rationale === "string" && rationale.trim().length > 0
          ? rationale.trim()
          : "Ranked by the Claude engine on the provided facts.",
    });
  }
  // If Claude returned nothing usable, treat as failure so we fall back.
  return out.length > 0 ? out : null;
}

/*
 * Creative Recruiter parsing via Claude. Turns a natural-language query into
 * the same RecruiterFilters shape the heuristic parser produces. Disciplines
 * are validated against the taxonomy. Returns null on any problem.
 */
export async function claudeParseQuery(
  query: string,
): Promise<RecruiterFilters | null> {
  const disciplineList = DISCIPLINES.join(", ");
  const levelList = LEVELS.map((l) => l.id).join(", ");
  const system =
    "You convert a plain-English hiring query into structured filters for a " +
    "creative-work network. Respond with ONLY a JSON object, no prose, no " +
    "code fences.";

  const userContent =
    `Valid disciplines: ${disciplineList}.\n` +
    `Valid levels: ${levelList}.\n` +
    'Return {"disciplines": string[] (from the valid list), "maxDayRate"?: ' +
    'number, "city"?: string, "radiusMiles"?: number, "levels"?: string[] ' +
    '(from the valid levels), "availableNow"?: boolean}. Omit fields you ' +
    "cannot infer.\n\nQuery: " +
    query;

  const text = await callClaude(system, userContent);
  if (text == null) return null;

  const parsed = parseJsonLoose(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error("[ai/claude] recruiter response was not a JSON object");
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  const validDisciplines = new Set<string>(DISCIPLINES);
  const validLevels = new Set<string>(LEVELS.map((l) => l.id));

  const disciplines = Array.isArray(obj.disciplines)
    ? obj.disciplines.filter(
        (d): d is string => typeof d === "string" && validDisciplines.has(d),
      )
    : [];

  const filters: RecruiterFilters = { disciplines };

  if (typeof obj.maxDayRate === "number" && obj.maxDayRate > 0) {
    filters.maxDayRate = Math.round(obj.maxDayRate);
  }
  if (typeof obj.city === "string" && obj.city.trim().length > 0) {
    filters.city = obj.city.trim();
  }
  if (typeof obj.radiusMiles === "number" && obj.radiusMiles > 0) {
    filters.radiusMiles = Math.round(obj.radiusMiles);
  }
  if (Array.isArray(obj.levels)) {
    const levels = obj.levels.filter(
      (l): l is string => typeof l === "string" && validLevels.has(l),
    );
    if (levels.length > 0) filters.levels = levels;
  }
  if (typeof obj.availableNow === "boolean") {
    filters.availableNow = obj.availableNow;
  }

  // A query that yields zero disciplines is not useful — let the heuristic
  // parser (which has synonym coverage) take over.
  return filters.disciplines.length > 0 ? filters : null;
}

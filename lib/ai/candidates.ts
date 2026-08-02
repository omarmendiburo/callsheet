import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { haversineMiles } from "@/lib/geo";
import { LEVELS } from "@/lib/taxonomy";
import type { CandidateFacts, Match, ProjectFacts } from "./types";

/*
 * Shared candidate pipeline for both AI capabilities (spec §8):
 *   1. SQL pre-filter: taxonomy + geo first. A candidate qualifies only if
 *      they share >= 1 needed discipline. This is a filter on RELEVANCE, not
 *      a rejection of people — everyone who shares a discipline is scored and
 *      ranked; low scores rank low, they do not disappear.
 *   2. Heuristic scoring over discipline overlap (weighted highest), level
 *      fit, distance, rate fit, availability. Score 0-100.
 *   3. A rationale built ONLY from real computed facts — never boilerplate,
 *      never invented.
 *
 * Nothing here writes to any people-owned table; reads only.
 */

/* Ordered so the strongest experience level ranks highest. */
const LEVEL_RANK: Record<string, number> = Object.fromEntries(
  LEVELS.map((l, i) => [l.id, i]),
);
const LEVEL_LABEL: Record<string, string> = Object.fromEntries(
  LEVELS.map((l) => [l.id, l.label]),
);

/* A candidate profile joined with its disciplines, ready to score. */
type LoadedCandidate = {
  facts: CandidateFacts;
  disciplineTypes: string[];
};

/*
 * SQL pre-filter, taxonomy + geo first. Given the set of needed disciplines
 * and an optional origin point (project or query location), returns every
 * candidate that shares at least one needed discipline, with distance
 * computed where both sides are geocoded (missing geo = null = neutral).
 */
export async function loadCandidates(
  neededDisciplines: string[],
  origin: { lat: number | null; lng: number | null } | null,
): Promise<LoadedCandidate[]> {
  const db = await getDb();
  const needed = new Set(neededDisciplines);
  if (needed.size === 0) return [];

  // Taxonomy pre-filter in SQL: only talent carrying a needed discipline.
  const disciplineRows = await db
    .select()
    .from(schema.disciplines)
    .where(inArray(schema.disciplines.type, [...needed]));

  const byTalent = new Map<
    string,
    { type: string; level: string }[]
  >();
  for (const d of disciplineRows) {
    const list = byTalent.get(d.talentId) ?? [];
    list.push({ type: d.type, level: d.level });
    byTalent.set(d.talentId, list);
  }
  const talentIds = [...byTalent.keys()];
  if (talentIds.length === 0) return [];

  // Load the full profile for every pre-filtered candidate, plus their
  // COMPLETE discipline set (not just the matched ones) for accurate facts.
  const profiles = await db
    .select()
    .from(schema.talentProfiles)
    .where(inArray(schema.talentProfiles.id, talentIds));

  const allDisciplineRows = await db
    .select()
    .from(schema.disciplines)
    .where(inArray(schema.disciplines.talentId, talentIds));

  const fullDisciplines = new Map<
    string,
    { type: string; level: string }[]
  >();
  for (const d of allDisciplineRows) {
    const list = fullDisciplines.get(d.talentId) ?? [];
    list.push({ type: d.type, level: d.level });
    fullDisciplines.set(d.talentId, list);
  }

  const out: LoadedCandidate[] = [];
  for (const p of profiles) {
    const disciplines = fullDisciplines.get(p.id) ?? [];
    let distanceMiles: number | null = null;
    if (
      origin &&
      origin.lat != null &&
      origin.lng != null &&
      p.lat != null &&
      p.lng != null
    ) {
      distanceMiles = haversineMiles(origin.lat, origin.lng, p.lat, p.lng);
    }
    out.push({
      facts: {
        talentId: p.id,
        displayName: p.displayName,
        city: p.city,
        disciplines: disciplines.map((d) => ({
          type: d.type,
          level: d.level,
        })),
        dayRate: p.dayRate ?? null,
        postHourly: p.postHourly ?? null,
        availability: p.availability,
        distanceMiles,
      },
      disciplineTypes: disciplines.map((d) => d.type),
    });
  }
  return out;
}

/* Scoring weights (sum of maxima = 100). Discipline overlap dominates. */
const W_DISCIPLINE = 50;
const W_LEVEL = 15;
const W_DISTANCE = 15;
const W_RATE = 12;
const W_AVAILABILITY = 8;

type ScoreInputs = {
  neededDisciplines: string[];
  neededLevels: (string | undefined)[]; // aligned to neededDisciplines by index
  dayRateTarget: number | null; // project day rate or query max
  availableNowWanted: boolean;
};

/* A structured breakdown so the rationale can cite exactly what scored. */
type Scored = {
  score: number;
  sharedDisciplines: string[];
  distanceMiles: number | null;
  dayRate: number | null;
  levelNote: string | null;
  availability: string;
};

export function scoreCandidate(
  cand: LoadedCandidate,
  inputs: ScoreInputs,
): Scored {
  const { facts, disciplineTypes } = cand;
  const neededSet = new Set(inputs.neededDisciplines);
  const shared = disciplineTypes.filter((t) => neededSet.has(t));

  // Discipline overlap — the dominant signal. Full credit for covering every
  // needed discipline; partial credit scaled by fraction covered.
  const coverage =
    neededSet.size > 0 ? shared.length / neededSet.size : 0;
  let score = W_DISCIPLINE * coverage;

  // Level fit vs the level asked for on the shared disciplines. A candidate
  // at or above the requested level scores full; below scales down.
  let levelNote: string | null = null;
  const levelTargets = inputs.neededDisciplines
    .map((disc, i) => ({ disc, level: inputs.neededLevels[i] }))
    .filter((x) => x.level && neededSet.has(x.disc));
  if (levelTargets.length > 0) {
    let levelSum = 0;
    let counted = 0;
    for (const { disc, level } of levelTargets) {
      const wanted = LEVEL_RANK[level as string];
      const has = facts.disciplines.find((d) => d.type === disc);
      if (has == null || wanted == null) continue;
      const got = LEVEL_RANK[has.level];
      counted += 1;
      levelSum += got >= wanted ? 1 : Math.max(0, 1 - (wanted - got) * 0.34);
    }
    if (counted > 0) score += W_LEVEL * (levelSum / counted);
  } else {
    // No level requested — reward experience mildly on the top shared match.
    const best = facts.disciplines
      .filter((d) => neededSet.has(d.type))
      .map((d) => LEVEL_RANK[d.level] ?? 0)
      .sort((a, b) => b - a)[0];
    if (best != null) {
      const maxRank = LEVELS.length - 1;
      score += W_LEVEL * (maxRank > 0 ? best / maxRank : 0);
    }
  }
  const topShared = facts.disciplines
    .filter((d) => neededSet.has(d.type))
    .sort((a, b) => (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0))[0];
  if (topShared) {
    levelNote = `${LEVEL_LABEL[topShared.level] ?? topShared.level} ${topShared.type}`;
  }

  // Distance — closer is better, within a reasonable regional radius. Missing
  // geo is NEUTRAL (half credit), never disqualifying, per the spec.
  if (facts.distanceMiles == null) {
    score += W_DISTANCE * 0.5;
  } else {
    const d = facts.distanceMiles;
    // Full credit within ~10mi, linear falloff to zero by ~120mi.
    const closeness =
      d <= 10 ? 1 : d >= 120 ? 0 : 1 - (d - 10) / 110;
    score += W_DISTANCE * closeness;
  }

  // Rate fit vs the project day rate (or query max). At or under budget is
  // full credit; over budget scales down. No rate on either side = neutral.
  if (inputs.dayRateTarget == null || facts.dayRate == null) {
    score += W_RATE * 0.5;
  } else if (facts.dayRate <= inputs.dayRateTarget) {
    score += W_RATE;
  } else {
    const over =
      (facts.dayRate - inputs.dayRateTarget) / inputs.dayRateTarget;
    score += W_RATE * Math.max(0, 1 - over);
  }

  // Availability.
  if (!inputs.availableNowWanted) {
    score += W_AVAILABILITY * (facts.availability === "now" ? 1 : 0.6);
  } else {
    score += W_AVAILABILITY * (facts.availability === "now" ? 1 : 0);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    sharedDisciplines: shared,
    distanceMiles: facts.distanceMiles,
    dayRate: facts.dayRate,
    levelNote,
    availability: facts.availability,
  };
}

/* Pick "A" / "An" for the leading capital of a role phrase. */
function article(role: string): string {
  return /^[aeiou]/i.test(role) ? "An" : "A";
}

/*
 * Build a 1-2 sentence rationale from REAL computed facts only. Every clause
 * is guarded by the data it cites — no invented facts, no template holes.
 */
export function buildRationale(
  displayName: string,
  s: Scored,
  dayRateTarget: number | null,
): string {
  let lead: string;
  if (s.sharedDisciplines.length === 1) {
    // levelNote already pairs the level with this discipline ("Professional
    // Colorist"); use it so we don't say the discipline twice.
    const role = s.levelNote ?? s.sharedDisciplines[0];
    lead = `${article(role)} ${role}`;
  } else if (s.sharedDisciplines.length > 1) {
    const list = s.sharedDisciplines.slice(0, 3);
    const tail = list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
    lead = `Covers ${tail}`;
    if (s.levelNote) lead += ` — a ${s.levelNote.toLowerCase()}`;
  } else {
    lead = "A relevant creative";
  }

  const clauses: string[] = [];
  if (s.distanceMiles != null) {
    const mi = Math.round(s.distanceMiles);
    clauses.push(mi <= 1 ? "right by the shoot" : `about ${mi} mi from the shoot`);
  }
  if (s.dayRate != null && dayRateTarget != null) {
    const cmp =
      s.dayRate <= dayRateTarget ? "within" : "above";
    clauses.push(
      `day rate $${s.dayRate} ${cmp} the project's $${dayRateTarget}`,
    );
  } else if (s.dayRate != null) {
    clauses.push(`day rate $${s.dayRate}`);
  }
  if (s.availability === "now") {
    clauses.push("available now");
  }

  let sentence = `${lead}.`;
  if (clauses.length > 0) {
    const detail =
      clauses.length === 1
        ? clauses[0]
        : clauses.slice(0, -1).join(", ") +
          ", and " +
          clauses[clauses.length - 1];
    sentence = `${lead}. ${detail.charAt(0).toUpperCase()}${detail.slice(1)}.`;
  }
  return sentence.replace(/\s+/g, " ").trim();
}

/*
 * Rank a set of pre-filtered candidates with the heuristic engine. Returns
 * Match[] sorted high-to-low. Shared by match.ts and recruiter.ts.
 */
export function rankHeuristic(
  candidates: LoadedCandidate[],
  inputs: ScoreInputs,
): Match[] {
  const matches: Match[] = candidates.map((c) => {
    const s = scoreCandidate(c, inputs);
    return {
      talentId: c.facts.talentId,
      displayName: c.facts.displayName,
      score: s.score,
      rationale: buildRationale(c.facts.displayName, s, inputs.dayRateTarget),
      engine: "heuristic" as const,
    };
  });
  return sortMatches(matches);
}

/* Stable ranked order: score desc, then name for determinism. */
export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName),
  );
}

/* Convert a project row into ProjectFacts + its needed disciplines/levels. */
export function projectToFacts(project: {
  id: string;
  title: string;
  type: string;
  location: string;
  dayRateOnset: number | null;
  hourlyPostprod: number | null;
  rolesNeeded: { discipline: string; count: number; level?: string }[];
}): ProjectFacts {
  return {
    id: project.id,
    title: project.title,
    type: project.type,
    location: project.location,
    dayRateOnset: project.dayRateOnset,
    hourlyPostprod: project.hourlyPostprod,
    neededDisciplines: project.rolesNeeded.map((r) => r.discipline),
    neededLevels: project.rolesNeeded.map((r) => r.level),
  };
}

/* Expose the loaded-candidate shape for callers that need PII-free facts. */
export type { LoadedCandidate, ScoreInputs };
export function candidateFacts(c: LoadedCandidate): CandidateFacts {
  return c.facts;
}

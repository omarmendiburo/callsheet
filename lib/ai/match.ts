import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { geocodeCity } from "@/lib/geo";
import { newId } from "@/lib/id";
import {
  buildRationale,
  candidateFacts,
  loadCandidates,
  projectToFacts,
  rankHeuristic,
  scoreCandidate,
  sortMatches,
} from "./candidates";
import { claudeRankMatch } from "./claude";
import { activeEngine, claudeKeyPresent } from "./types";
import type { Match } from "./types";

/*
 * Talent Match (spec §8.1): given a project, rank candidates 0-100 with a
 * written why. SQL pre-filter (taxonomy + geo first), then heuristic scoring
 * — or Claude scoring when the key is present, with a heuristic fallback.
 *
 * Persists the ranked rows to the matches table (stale rows for the project
 * are deleted first), tagged with the engine that produced them. AI ranks and
 * explains; it never rejects, contacts, or books — low scores rank low, they
 * do not disappear.
 */
export async function rankTalentForProject(
  projectId: string,
): Promise<Match[]> {
  const db = await getDb();

  const projectRows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  const project = projectRows[0];
  if (!project) return [];

  const facts = projectToFacts(project);

  // Geo origin: prefer the project's stored coords; fall back to geocoding its
  // location string. Missing geo just means distance is neutral downstream.
  let origin: { lat: number | null; lng: number | null } | null = null;
  if (project.lat != null && project.lng != null) {
    origin = { lat: project.lat, lng: project.lng };
  } else {
    const geo = geocodeCity(project.location);
    origin = geo ? { lat: geo.lat, lng: geo.lng } : null;
  }

  // SQL pre-filter: candidates sharing >= 1 needed discipline.
  const candidates = await loadCandidates(facts.neededDisciplines, origin);
  if (candidates.length === 0) {
    await persistMatches(projectId, []);
    return [];
  }

  /* Rates are per role now: the target is the highest per-role day rate,
   * falling back to the legacy project-level column for older rows. */
  const roleRates = ((project.rolesNeeded ?? []) as { dayRate?: number }[])
    .map((r) => r.dayRate)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const scoreInputs = {
    neededDisciplines: facts.neededDisciplines,
    neededLevels: facts.neededLevels,
    dayRateTarget:
      roleRates.length > 0 ? Math.max(...roleRates) : facts.dayRateOnset,
    availableNowWanted: false,
  };

  let matches: Match[] | null = null;

  // Claude engine when the key is present; heuristic otherwise or on failure.
  if (claudeKeyPresent()) {
    const claudeRaw = await claudeRankMatch(
      facts,
      candidates.map(candidateFacts),
    );
    if (claudeRaw) {
      const byId = new Map(candidates.map((c) => [c.facts.talentId, c]));
      matches = claudeRaw
        .filter((r) => byId.has(r.talentId))
        .map((r) => ({
          talentId: r.talentId,
          displayName: byId.get(r.talentId)!.facts.displayName,
          score: r.score,
          rationale: r.rationale,
          engine: "claude" as const,
        }));
      // Any pre-filtered candidate Claude omitted still deserves a row —
      // score it heuristically so nobody silently disappears.
      const covered = new Set(matches.map((m) => m.talentId));
      for (const c of candidates) {
        if (covered.has(c.facts.talentId)) continue;
        const s = scoreCandidate(c, scoreInputs);
        matches.push({
          talentId: c.facts.talentId,
          displayName: c.facts.displayName,
          score: s.score,
          rationale: buildRationale(
            c.facts.displayName,
            s,
            scoreInputs.dayRateTarget,
          ),
          engine: "heuristic" as const,
        });
      }
      matches = sortMatches(matches);
    }
  }

  if (matches == null) {
    matches = rankHeuristic(candidates, scoreInputs);
  }

  await persistMatches(projectId, matches);
  return matches;
}

/*
 * Replace the matches for a project. Deletes stale rows first, then inserts
 * the fresh ranking. Writes ONLY to the matches table — never to any
 * people-owned row.
 *
 * WRITE-ONLY today (audit 2026-08-02): nothing reads matches back yet; the
 * scout page uses the in-memory return value. The table is the audit trail
 * for a future admin "last ranking" surface — do not assume it caches.
 */
async function persistMatches(
  projectId: string,
  matches: Match[],
): Promise<void> {
  const db = await getDb();
  await db.delete(schema.matches).where(eq(schema.matches.projectId, projectId));
  if (matches.length === 0) return;
  await db.insert(schema.matches).values(
    matches.map((m) => ({
      id: newId("match"),
      projectId,
      talentId: m.talentId,
      score: m.score,
      rationale: m.rationale,
      engine: m.engine,
    })),
  );
}

/* Which engine this process will use for a fresh ranking. */
export { activeEngine };

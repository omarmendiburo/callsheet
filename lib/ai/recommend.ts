import { haversineMiles } from "@/lib/geo";
import { scoreCandidate } from "./candidates";
import type { CandidateFacts } from "./types";

/*
 * Talent-side recommendations (spec §4.3 "suggests, humans decide"): score
 * each open project FOR one talent by running the same heuristic the business
 * side uses, in reverse — the talent is the candidate, the project's needed
 * roles are the inputs. The score stays INTERNAL: the talent side never
 * renders a number, ever (owner's standing rule). Output is just an ordered
 * short list of projects worth a look.
 */

type TalentLike = {
  id: string;
  displayName: string;
  city: string;
  lat: number | null;
  lng: number | null;
  dayRate: number | null;
  postHourly: number | null;
  availability: string;
};

type ProjectLike = {
  id: string;
  lat: number | null;
  lng: number | null;
  dayRateOnset: number | null;
  rolesNeeded: {
    discipline: string;
    level?: string;
    dayRate?: number;
  }[];
};

const MIN_SCORE = 40;
const MAX_PICKS = 3;

export function recommendProjectIds(
  talent: TalentLike,
  disciplines: { type: string; level: string }[],
  projects: ProjectLike[],
): string[] {
  if (disciplines.length === 0) return [];

  const scored: { id: string; score: number; shared: number }[] = [];

  for (const project of projects) {
    if (project.rolesNeeded.length === 0) continue;

    const distanceMiles =
      talent.lat != null &&
      talent.lng != null &&
      project.lat != null &&
      project.lng != null
        ? haversineMiles(talent.lat, talent.lng, project.lat, project.lng)
        : null;

    const facts: CandidateFacts = {
      talentId: talent.id,
      displayName: talent.displayName,
      city: talent.city,
      disciplines: disciplines.map((d) => ({ type: d.type, level: d.level })),
      dayRate: talent.dayRate,
      postHourly: talent.postHourly,
      availability: talent.availability,
      distanceMiles,
    };

    // The project's best-paying relevant role sets the rate target; falling
    // back to the legacy project-level rate for old rows.
    const roleRates = project.rolesNeeded
      .map((r) => r.dayRate)
      .filter((r): r is number => r != null && r > 0);
    const dayRateTarget =
      roleRates.length > 0
        ? Math.max(...roleRates)
        : (project.dayRateOnset ?? null);

    const s = scoreCandidate(
      { facts, disciplineTypes: disciplines.map((d) => d.type) },
      {
        neededDisciplines: project.rolesNeeded.map((r) => r.discipline),
        neededLevels: project.rolesNeeded.map((r) => r.level),
        dayRateTarget,
        availableNowWanted: false,
      },
    );

    // Only ever recommend real craft overlap; low scores just rank low
    // elsewhere, but a recommendation band must earn its name.
    if (s.sharedDisciplines.length === 0 || s.score < MIN_SCORE) continue;
    scored.push({
      id: project.id,
      score: s.score,
      shared: s.sharedDisciplines.length,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || b.shared - a.shared)
    .slice(0, MAX_PICKS)
    .map((s) => s.id);
}

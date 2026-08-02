/*
 * Shared interface for the AI layer (spec §8).
 * Two capabilities — Talent Match and Creative Recruiter — behind one stable
 * surface, backed by two interchangeable engines: a deterministic heuristic
 * that works with no API key, and a Claude engine that activates when
 * ANTHROPIC_API_KEY is set. The engine field on every result says which
 * one produced it. AI ranks and explains; it never rejects, hides, contacts,
 * or books anyone.
 */

export type Engine = "heuristic" | "claude";

/* One ranked candidate for a project. Persisted to the matches table. */
export type Match = {
  talentId: string;
  displayName: string;
  score: number; // 0-100
  rationale: string; // 1-2 plain sentences citing real facts
  engine: Engine;
};

/* Structured filters parsed from a natural-language recruiter query.
 * The UI shows these back to the user as the AI's reasoning. */
export type RecruiterFilters = {
  disciplines: string[];
  maxDayRate?: number;
  city?: string;
  radiusMiles?: number;
  levels?: string[];
  availableNow?: boolean;
};

export type RecruiterResult = {
  filters: RecruiterFilters;
  results: Match[];
  engineUsed: Engine;
  explanation: string; // plain-English readback of what was understood
};

/* PII-free structured facts about one candidate. This is the ONLY shape
 * that ever leaves for the Claude API — no emails, phones, or auth fields. */
export type CandidateFacts = {
  talentId: string;
  displayName: string;
  city: string;
  disciplines: { type: string; level: string }[];
  dayRate: number | null;
  postHourly: number | null;
  availability: string;
  distanceMiles: number | null; // null when either side is not geocoded
};

/* Project facts fed to scoring and (PII-free) to the Claude API. */
export type ProjectFacts = {
  id: string;
  title: string;
  type: string;
  location: string;
  dayRateOnset: number | null;
  hourlyPostprod: number | null;
  neededDisciplines: string[];
  neededLevels: (string | undefined)[];
};

/* Whether the Claude engine is active for this process. */
export function claudeKeyPresent(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function activeEngine(): Engine {
  return claudeKeyPresent() ? "claude" : "heuristic";
}

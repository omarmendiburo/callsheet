import { geocodeCity } from "@/lib/geo";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";
import { loadCandidates, rankHeuristic } from "./candidates";
import { claudeParseQuery } from "./claude";
import { claudeKeyPresent } from "./types";
import type { Engine, Match, RecruiterFilters, RecruiterResult } from "./types";

/*
 * Creative Recruiter (spec §8.2): a plain-English hiring query becomes
 * structured filters + a ranked shortlist. Two parsers behind one interface:
 *   - heuristic: synonym-mapped keyword matching against the taxonomy, plus
 *     $-amount and level extraction. Works with no API key.
 *   - Claude: same RecruiterFilters shape, used when the key is present, with
 *     the heuristic parser as fallback on any failure.
 *
 * The parsed filters are returned so the UI can SHOW its reasoning
 * ("understood: Editor, under $500/day"). Scoring reuses the same heuristic
 * pipeline as Talent Match. Nobody is filtered out of existence — low scores
 * rank low.
 */

/* Synonym map: lowercase keyword/phrase -> canonical taxonomy discipline.
 * Longer phrases are matched before single words. */
const SYNONYMS: { terms: string[]; discipline: string }[] = [
  { terms: ["dp", "d.p.", "director of photography", "cinematographer", "shooter", "camera person", "camera operator"], discipline: "Cinematographer / DP" },
  { terms: ["camera op", "1st ac", "first ac", "2nd ac", "focus puller"], discipline: "Camera Op" },
  { terms: ["editor", "video editor", "cutter", "post editor"], discipline: "Editor" },
  { terms: ["colorist", "colourist", "color grade", "grading", "grader"], discipline: "Colorist" },
  { terms: ["motion designer", "motion graphics", "animator", "mograph", "2d animator", "3d animator"], discipline: "Motion / Animation" },
  { terms: ["vfx", "visual effects", "compositor", "roto"], discipline: "VFX" },
  { terms: ["photographer", "photog", "stills", "still photographer"], discipline: "Photographer" },
  { terms: ["retoucher", "retouch", "photo editor"], discipline: "Retoucher" },
  { terms: ["gaffer", "lighting", "lighting tech", "electrician", "best boy"], discipline: "Gaffer / Lighting" },
  { terms: ["grip", "key grip", "dolly grip"], discipline: "Grip" },
  { terms: ["sound", "sound mixer", "audio", "boom op", "recordist", "sound recordist"], discipline: "Sound" },
  { terms: ["director", "helmer"], discipline: "Director" },
  { terms: ["producer", "line producer", "ep", "executive producer"], discipline: "Producer" },
  { terms: ["production coordinator", "coordinator", "prod coord"], discipline: "Production coordinator" },
  { terms: ["pa", "production assistant", "runner"], discipline: "PA" },
  { terms: ["writer", "screenwriter", "scriptwriter", "copywriter"], discipline: "Writer" },
  { terms: ["designer", "graphic designer", "art director"], discipline: "Designer" },
  { terms: ["illustrator", "illustration"], discipline: "Illustrator" },
  { terms: ["shortform creator", "short form", "short-form", "shortform", "reels creator", "tiktok creator", "content creator", "ugc creator"], discipline: "Shortform creator" },
  { terms: ["hair", "makeup", "mua", "hmu", "hair and makeup", "hair/makeup"], discipline: "Hair / Makeup" },
  { terms: ["wardrobe", "stylist", "costume", "wardrobe stylist"], discipline: "Wardrobe / Stylist" },
  { terms: ["composer", "music", "sound designer", "score"], discipline: "Composer / Music" },
];

/* Level synonyms -> canonical level id. */
const LEVEL_SYNONYMS: { terms: string[]; level: string }[] = [
  { terms: ["apprentice", "trainee", "assistant level", "learning"], level: "apprentice" },
  { terms: ["emerging", "junior", "some credits", "up and coming"], level: "emerging" },
  { terms: ["professional", "pro", "experienced", "seasoned", "mid level", "mid-level"], level: "professional" },
  { terms: ["expert", "senior", "lead", "department head", "veteran"], level: "expert" },
];

const AVAILABILITY_TERMS = [
  "available now",
  "available immediately",
  "free now",
  "open now",
  "start now",
  "immediately available",
  "ready to go",
];

/*
 * Heuristic parser: keyword/synonym matching against the taxonomy, plus
 * $-amount, city, and level extraction. Deterministic, no API.
 */
export function parseQueryHeuristic(query: string): RecruiterFilters {
  const q = ` ${query.toLowerCase()} `;

  // Disciplines — match longest phrases first so "camera op" doesn't get
  // shadowed by a bare "camera".
  const disciplines = new Set<string>();
  const allTerms = SYNONYMS.flatMap((s) =>
    s.terms.map((t) => ({ term: t, discipline: s.discipline })),
  ).sort((a, b) => b.term.length - a.term.length);
  for (const { term, discipline } of allTerms) {
    if (q.includes(` ${term} `) || q.includes(` ${term}s `)) {
      disciplines.add(discipline);
    }
  }
  // Also catch exact canonical names typed directly.
  for (const d of DISCIPLINES) {
    if (q.includes(d.toLowerCase())) disciplines.add(d);
  }

  const filters: RecruiterFilters = { disciplines: [...disciplines] };

  // Max day rate — "under $500", "$500/day", "below 500", "less than $450".
  const rate = extractMaxRate(query);
  if (rate != null) filters.maxDayRate = rate;

  // Levels.
  const levels = new Set<string>();
  for (const { terms, level } of LEVEL_SYNONYMS) {
    for (const t of terms) {
      if (q.includes(` ${t} `) || q.includes(` ${t},`)) levels.add(level);
    }
  }
  // Canonical level ids/labels typed directly.
  for (const l of LEVELS) {
    if (q.includes(` ${l.id} `) || q.includes(` ${l.label.toLowerCase()} `)) {
      levels.add(l.id);
    }
  }
  if (levels.size > 0) filters.levels = [...levels];

  // Availability.
  if (AVAILABILITY_TERMS.some((t) => q.includes(t))) {
    filters.availableNow = true;
  }

  // City — match any known city name appearing in the query.
  const city = extractCity(query);
  if (city) filters.city = city;

  return filters;
}

/* Pull a max day-rate figure from phrasing like "under $500/day". */
function extractMaxRate(query: string): number | null {
  const q = query.toLowerCase();
  // Prefer an explicit ceiling word near the amount.
  const ceiling = q.match(
    /(?:under|below|less than|up to|max(?:imum)?|no more than|<=?)\s*\$?\s*(\d[\d,]*)/,
  );
  if (ceiling) return toInt(ceiling[1]);
  // "$500/day" or "500 per day" implies a target/ceiling too.
  const perDay = q.match(/\$?\s*(\d[\d,]*)\s*(?:\/|per\s+)?day/);
  if (perDay) return toInt(perDay[1]);
  // Bare "$500" as a last resort.
  const bare = q.match(/\$\s*(\d[\d,]*)/);
  if (bare) return toInt(bare[1]);
  return null;
}

function toInt(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10);
}

/* Known cities live in the geo table; match the longest name present. */
const KNOWN_CITIES = [
  "san diego",
  "chula vista",
  "oceanside",
  "carlsbad",
  "encinitas",
  "el cajon",
  "national city",
  "tijuana",
  "los angeles",
  "long beach",
  "irvine",
  "san francisco",
  "oakland",
  "boston",
];

function extractCity(query: string): string | undefined {
  const q = query.toLowerCase();
  const hit = [...KNOWN_CITIES]
    .sort((a, b) => b.length - a.length)
    .find((c) => q.includes(c));
  if (!hit) return undefined;
  // Title-case the matched city for display.
  return hit.replace(/\b\w/g, (m) => m.toUpperCase());
}

/* Human-readable readback of the parsed filters, for the UI. */
export function explainFilters(filters: RecruiterFilters): string {
  const parts: string[] = [];
  if (filters.disciplines.length > 0) {
    parts.push(filters.disciplines.join(", "));
  }
  if (filters.levels && filters.levels.length > 0) {
    const labels = filters.levels.map(
      (id) => LEVELS.find((l) => l.id === id)?.label ?? id,
    );
    parts.push(labels.join("/"));
  }
  if (filters.maxDayRate != null) parts.push(`under $${filters.maxDayRate}/day`);
  if (filters.city) {
    parts.push(
      filters.radiusMiles
        ? `within ${filters.radiusMiles} mi of ${filters.city}`
        : `near ${filters.city}`,
    );
  }
  if (filters.availableNow) parts.push("available now");
  return parts.length > 0
    ? `Understood: ${parts.join("; ")}.`
    : "No specific filters understood from the query.";
}

/*
 * Creative Recruiter search. Parses the query (Claude when available,
 * heuristic otherwise/on failure), filters + scores talent, and returns the
 * parsed filters so the UI can show its reasoning.
 */
export async function recruiterSearch(
  query: string,
): Promise<RecruiterResult> {
  let engineUsed: Engine = "heuristic";
  let filters: RecruiterFilters | null = null;

  if (claudeKeyPresent()) {
    const parsed = await claudeParseQuery(query);
    if (parsed) {
      filters = parsed;
      engineUsed = "claude";
    }
  }
  if (filters == null) {
    filters = parseQueryHeuristic(query);
    engineUsed = "heuristic";
  }

  const results = await rankForFilters(filters);

  return {
    filters,
    results,
    engineUsed,
    explanation: explainFilters(filters),
  };
}

/*
 * Filter + score talent for a set of parsed filters. Uses the same SQL
 * pre-filter (share >= 1 needed discipline) and heuristic scorer as match.ts.
 * If the query yields no disciplines, there is nothing to rank.
 */
async function rankForFilters(
  filters: RecruiterFilters,
): Promise<Match[]> {
  if (filters.disciplines.length === 0) return [];

  // Origin for distance: the query city, if any.
  let origin: { lat: number | null; lng: number | null } | null = null;
  if (filters.city) {
    const geo = geocodeCity(filters.city);
    origin = geo ? { lat: geo.lat, lng: geo.lng } : null;
  }

  const candidates = await loadCandidates(filters.disciplines, origin);

  // The rationale/scoring is heuristic regardless of who parsed the query, so
  // each row is labeled "heuristic" honestly; the query-parse engine is
  // reported separately as engineUsed on the RecruiterResult.
  return rankHeuristic(candidates, {
    neededDisciplines: filters.disciplines,
    neededLevels: filters.disciplines.map(() =>
      filters.levels && filters.levels.length > 0
        ? filters.levels[0]
        : undefined,
    ),
    dayRateTarget: filters.maxDayRate ?? null,
    availableNowWanted: filters.availableNow ?? false,
  });
}

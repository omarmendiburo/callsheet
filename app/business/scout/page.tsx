import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";
import { haversineMiles } from "@/lib/geo";
import { Rule } from "@/components/ui";
import { FilterRow } from "@/components/marketplace/FilterRow";
import { WorkCard } from "@/components/marketplace/WorkCard";
import {
  getBrowsePool,
  getOpenProjectsForOrg,
  type BrowseCreative,
} from "@/components/marketplace/_data";
import {
  one,
  toggleHref,
  RADIUS_OPTIONS,
  RATE_OPTIONS,
} from "@/components/marketplace/filters";
import { ChipLink } from "@/components/marketplace/FilterRow";
import { resolveScoutOrg } from "./_org";
import { rankTalentForProject } from "@/lib/ai/match";
import { recruiterSearch } from "@/lib/ai/recruiter";
import type { Match } from "@/lib/ai/types";

/*
 * §5.4 talent scouting. A masonry wall of creatives who have APPROVED work,
 * platform-wide (the pool is not org-scoped). Cards are work-first: NO names,
 * NO headshots. Two mono lines under each frame — disciplines left, CITY ·
 * AVAILABILITY · $RATE right. Click a card to reveal the person.
 *
 * Filters (chip rows): discipline, level, radius from a selected project's
 * location, max day rate, available-now, certified-only. The project select
 * is a chip row too — picking a project sets the origin for the radius filter.
 */

const BASE = "/business/scout";

export default async function ScoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("business");
  const params = await searchParams;
  const orgParam = one(params, "org");

  const resolution = await resolveScoutOrg(user.id, orgParam);

  // Multiple orgs and none chosen — a plain org switcher (org is a query param).
  if (resolution.kind === "choose") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <p className="fact-secondary">scout · pick an org</p>
        <h1 className="headline mt-4 text-4xl sm:text-5xl">Which org?</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed">
          You scout on behalf of an organisation. Pick which one.
        </p>
        <ul className="mt-8 flex flex-col divide-y divide-rule border-t border-b border-rule">
          {resolution.orgs.map(({ org, role }) => (
            <li key={org.id} className="flex items-center justify-between py-4">
              <span className="text-[15px]">{org.name}</span>
              <Link
                className="fact underline underline-offset-4"
                href={`${BASE}?org=${org.id}`}
              >
                scout as {role}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const org = resolution.org;

  const [pool, projects] = await Promise.all([
    getBrowsePool(),
    getOpenProjectsForOrg(org.id),
  ]);

  const fDiscipline = one(params, "discipline");
  const fLevel = one(params, "level");
  const fRadius = one(params, "radius");
  const fMaxRate = one(params, "maxRate");
  const fProject = one(params, "project");
  const fAvailNow = one(params, "availNow") === "1";
  const fCertified = one(params, "certified") === "1";

  const radiusMi = fRadius ? Number.parseInt(fRadius, 10) : null;
  const maxRate = fMaxRate ? Number.parseInt(fMaxRate, 10) : null;

  const selectedProject = fProject
    ? projects.find((p) => p.id === fProject)
    : undefined;
  const projectGeo =
    selectedProject?.lat != null && selectedProject?.lng != null
      ? { lat: selectedProject.lat, lng: selectedProject.lng }
      : null;
  const radiusActive = radiusMi != null && projectGeo != null;

  const filtered = pool.filter((c: BrowseCreative) => {
    if (fDiscipline && !c.disciplines.some((d) => d.type === fDiscipline))
      return false;
    if (fLevel && !c.disciplines.some((d) => d.level === fLevel)) return false;
    if (maxRate != null && (c.dayRate ?? Infinity) > maxRate) return false;
    if (fAvailNow && c.availability !== "now") return false;
    if (fCertified && !c.certified) return false;
    if (radiusActive) {
      if (c.lat == null || c.lng == null) return false;
      const d = haversineMiles(projectGeo!.lat, projectGeo!.lng, c.lat, c.lng);
      if (d > radiusMi!) return false;
    }
    return true;
  });

  // Prefer a reel/shortform card image; fall back to whatever approved media.
  const cardMedia = (c: BrowseCreative) =>
    c.media.find((m) => m.kind === "reel" || m.kind === "shortform") ??
    c.media[0];

  /*
   * AI layer (spec §8) — suggestion, never a verdict. A recruiter query (?q=)
   * or the "suggested order" toggle (?rank=1 with a project selected) ranks
   * the wall and annotates each card with a score + written why. Low scores
   * rank low; nobody disappears. The engine label is honest about which
   * engine produced the ordering.
   */
  const q = one(params, "q")?.trim() ?? "";
  const rankActive = one(params, "rank") === "1" && Boolean(selectedProject);

  // LAW GUARD: Match objects carry displayName for the reveal context. This
  // page is a name-blind browsing surface — render note.score/note.rationale
  // ONLY; note.displayName must never reach this page's JSX.
  let aiNotes: Map<string, Match> | null = null;
  let aiHeading: string | null = null;
  let aiEngine: string | null = null;

  if (q) {
    const rr = await recruiterSearch(q);
    aiNotes = new Map(rr.results.map((m) => [m.talentId, m]));
    aiHeading = rr.explanation;
    aiEngine = rr.engineUsed;
  } else if (rankActive && selectedProject) {
    const ranked = await rankTalentForProject(selectedProject.id);
    aiNotes = new Map(ranked.map((m) => [m.talentId, m]));
    aiHeading = `Suggested order for "${selectedProject.title}". You decide.`;
    // Honest batch label: Claude can rank most rows and heuristically
    // backfill the ones its response omitted, so the label reflects the
    // whole batch, not whichever row happened to sort first.
    const claudeRows = ranked.filter((m) => m.engine === "claude").length;
    aiEngine =
      claudeRows === 0
        ? "heuristic"
        : claudeRows === ranked.length
          ? "claude"
          : `claude · ${claudeRows} of ${ranked.length} rows (heuristic backfill for the rest)`;
  }

  const ordered = aiNotes
    ? [...filtered].sort(
        (a, b) =>
          (aiNotes.get(b.talentId)?.score ?? -1) -
          (aiNotes.get(a.talentId)?.score ?? -1),
      )
    : filtered;

  const anyFilter = Boolean(
    fDiscipline ||
      fLevel ||
      fRadius ||
      fMaxRate ||
      fProject ||
      fAvailNow ||
      fCertified,
  );

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <p className="fact-secondary">
        scout · {org.name}
        {selectedProject ? ` · for ${selectedProject.title}` : ""}
      </p>

      <h1 className="headline mt-4 text-4xl sm:text-5xl">Scout the wall.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        The work is the résumé. React to the reel first. Names, cities, and
        rates are here, but no headshots and no schools. Open a card to see who
        made it.
      </p>

      {/* View modes — the mockup's Reels / Gallery / CRM trio. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="fact-secondary">view</span>
        <span className="fact border border-ink bg-ink px-2 py-1.5 text-paper">
          gallery
        </span>
        <Link
          className="fact border border-rule px-2 py-1.5 text-secondary transition-opacity duration-150 hover:opacity-70"
          href={orgParam ? `/business/scout/reels?org=${org.id}` : "/business/scout/reels"}
        >
          reels
        </Link>
        <Link
          className="fact border border-rule px-2 py-1.5 text-secondary transition-opacity duration-150 hover:opacity-70"
          href={orgParam ? `/business/crm?org=${org.id}` : "/business/crm"}
        >
          crm
        </Link>
      </div>

      <div className="mt-8">
        <Rule />
      </div>

      {/* Creative Recruiter — plain-English search, reasoning shown back. */}
      <form action={BASE} method="get" className="mt-6 flex items-end gap-3">
        {orgParam ? <input type="hidden" name="org" value={org.id} /> : null}
        <label className="flex-1">
          <span className="fact-secondary mb-2 block">
            describe the hire in plain english
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="documentary dp in san diego under $700 a day"
            className="w-full border border-rule bg-transparent px-3 py-3 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none"
          />
        </label>
        <button type="submit" className="fact shrink-0 border border-ink px-4 py-3 transition-opacity duration-150 hover:opacity-70">
          ask
        </button>
      </form>

      <section className="mt-6 flex flex-col gap-4">
        <FilterRow
          label="discipline"
          base={BASE}
          params={params}
          paramKey="discipline"
          activeValue={fDiscipline}
          options={DISCIPLINES.map((d) => ({ value: d, label: d }))}
        />
        <FilterRow
          label="level"
          base={BASE}
          params={params}
          paramKey="level"
          activeValue={fLevel}
          options={LEVELS.map((l) => ({ value: l.id, label: l.label }))}
        />
        <FilterRow
          label="max day rate"
          base={BASE}
          params={params}
          paramKey="maxRate"
          activeValue={fMaxRate}
          options={RATE_OPTIONS.map((r) => ({
            value: String(r),
            label: `$${r}`,
          }))}
        />

        {/* Project select — sets the origin for the radius filter. */}
        {projects.length > 0 ? (
          <FilterRow
            label="near project"
            base={BASE}
            params={params}
            paramKey="project"
            activeValue={fProject}
            options={projects.map((p) => ({ value: p.id, label: p.title }))}
          />
        ) : null}
        <FilterRow
          label="within"
          base={BASE}
          params={params}
          paramKey="radius"
          activeValue={fRadius}
          options={RADIUS_OPTIONS.map((r) => ({
            value: String(r),
            label: `${r} mi`,
          }))}
        />
        {radiusMi != null && !projectGeo ? (
          <p className="fact-secondary">
            pick a project with a location to filter by distance
          </p>
        ) : null}

        {/* Toggle chips: available-now, certified-only. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
          <span className="fact-secondary shrink-0 pt-1.5 sm:w-28">also</span>
          <div className="flex flex-wrap gap-2">
            <ChipLink
              href={toggleHref(BASE, params, "availNow", "1", fAvailNow)}
              active={fAvailNow}
            >
              available now
            </ChipLink>
            <ChipLink
              href={toggleHref(BASE, params, "certified", "1", fCertified)}
              active={fCertified}
            >
              certified only
            </ChipLink>
            {selectedProject ? (
              <ChipLink
                href={toggleHref(BASE, params, "rank", "1", rankActive)}
                active={rankActive}
              >
                suggested order
              </ChipLink>
            ) : null}
          </div>
        </div>

        {anyFilter ? (
          <p>
            <Link
              className="fact-secondary underline underline-offset-4"
              href={orgParam ? `${BASE}?org=${org.id}` : BASE}
            >
              clear filters
            </Link>
          </p>
        ) : null}
      </section>

      <div className="mt-8">
        <Rule />
      </div>

      {aiHeading ? (
        <div className="mt-6 border-l border-ink pl-4">
          <p className="text-[15px] leading-relaxed">{aiHeading}</p>
          <p className="fact-secondary mt-1">
            engine: {aiEngine}
            {aiEngine === "heuristic"
              ? " · claude activates when the api key lands"
              : ""}
            {" · a suggestion, not a verdict"}
          </p>
        </div>
      ) : null}

      <p className="fact-secondary mt-6">
        {filtered.length} {filtered.length === 1 ? "creative" : "creatives"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-secondary">
          No creatives match these filters.{" "}
          <Link
            className="underline underline-offset-4"
            href={orgParam ? `${BASE}?org=${org.id}` : BASE}
          >
            clear them
          </Link>{" "}
          to see the whole wall.
        </p>
      ) : (
        <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4">
          {ordered.map((c) => {
            const note = aiNotes?.get(c.talentId);
            return (
              <div key={c.talentId} className="break-inside-avoid">
                <WorkCard
                  creative={c}
                  media={cardMedia(c)}
                  orgId={orgParam ? org.id : undefined}
                />
                {note ? (
                  <p className="mt-1 text-[13px] leading-snug text-secondary">
                    <span className="fact">[{note.score}]</span>{" "}
                    {note.rationale}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

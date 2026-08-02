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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-10">
        <p className="fact">
          <Link href="/business">Callsheet</Link>
        </p>
        <h1 className="headline mt-10 text-5xl">Which org?</h1>
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
      </main>
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
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-10 sm:px-10">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/business">Callsheet</Link>
        </p>
        <span className="fact-secondary">{org.name}</span>
      </header>

      <h1 className="headline mt-10 text-6xl">Scout the wall.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        The work is the résumé. React to the reel first — names, cities, and
        rates are here, but no headshots and no schools. Open a card to see who
        made it.
      </p>

      <div className="mt-8">
        <Rule />
      </div>

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
          {filtered.map((c) => (
            <WorkCard key={c.talentId} creative={c} media={cardMedia(c)} />
          ))}
        </div>
      )}
    </main>
  );
}

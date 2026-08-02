import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDisciplines, getProfileByUserId } from "@/app/talent/_data";
import { DISCIPLINES, PROJECT_TYPES } from "@/lib/taxonomy";
import { haversineMiles } from "@/lib/geo";
import { recommendProjectIds } from "@/lib/ai/recommend";
import { Rule } from "@/components/ui";
import { FilterRow } from "@/components/marketplace/FilterRow";
import { ProjectCard } from "@/components/marketplace/ProjectCard";
import {
  getApplicationMap,
  getOpenProjects,
  type ProjectWithOrg,
} from "@/components/marketplace/_data";
import { one, RADIUS_OPTIONS, RATE_OPTIONS } from "@/components/marketplace/filters";

/*
 * §4.3 job board. The shell (sidebar) owns all chrome. This page opens with the
 * uniform header (context line, Anton headline, one sub-line), then a filters
 * band and a results band — each a fact-secondary label under a Rule.
 *
 * Every open project, newest first, as cards. Filters are chip rows driven by
 * GET params: discipline, radius from the talent's own city (25/50/100 mi via
 * haversine when both ends are geocoded), min day rate, and project type. The
 * talent's own application status shows on each card.
 *
 * One primary button per screen: the "apply" button lives on cards (one per
 * un-applied card), and the page headline is Anton with no competing primary.
 */

const BASE = "/talent/jobs";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("talent");
  const params = await searchParams;

  const profile = await getProfileByUserId(user.id);
  const [projects, appMap, myDisciplines] = await Promise.all([
    getOpenProjects(),
    profile ? getApplicationMap(profile.id) : Promise.resolve(new Map()),
    profile ? getDisciplines(profile.id) : Promise.resolve([]),
  ]);

  const fDiscipline = one(params, "discipline");
  const fType = one(params, "type");
  const fRadius = one(params, "radius");
  const fMinRate = one(params, "minRate");

  const radiusMi = fRadius ? Number.parseInt(fRadius, 10) : null;
  const minRate = fMinRate ? Number.parseInt(fMinRate, 10) : null;

  // Radius filtering needs both the talent's coords and the project's coords.
  const talentGeo =
    profile?.lat != null && profile?.lng != null
      ? { lat: profile.lat, lng: profile.lng }
      : null;
  const radiusActive = radiusMi != null && talentGeo != null;

  const filtered = projects.filter(({ project }: ProjectWithOrg) => {
    if (
      fDiscipline &&
      !project.rolesNeeded.some((r) => r.discipline === fDiscipline)
    )
      return false;
    if (fType && project.type !== fType) return false;
    if (minRate != null && (project.dayRateOnset ?? 0) < minRate) return false;
    if (radiusActive) {
      if (project.lat == null || project.lng == null) return false;
      const d = haversineMiles(
        talentGeo!.lat,
        talentGeo!.lng,
        project.lat,
        project.lng,
      );
      if (d > radiusMi!) return false;
    }
    return true;
  });

  const anyFilter = Boolean(
    fDiscipline || fType || fRadius || fMinRate,
  );

  // Recommendations ride the unfiltered view only — once the talent filters,
  // they are driving. The heuristic's score stays server-side; the talent
  // side never shows a number (owner's standing rule).
  const recommendedIds =
    !anyFilter && profile && myDisciplines.length > 0
      ? recommendProjectIds(
          profile,
          myDisciplines.map((d) => ({ type: d.type, level: d.level })),
          projects.map(({ project }: ProjectWithOrg) => project),
        )
      : [];
  const recommended = recommendedIds
    .map((id) => projects.find((p: ProjectWithOrg) => p.project.id === id))
    .filter((p): p is ProjectWithOrg => p != null);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <p className="fact-secondary">talent · open work</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">Open work.</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed">
        Every open project on the network, newest first. Filter by craft,
        distance from your city, rate, and type. One tap to apply. A person
        reads every application.
      </p>

      {/* ---------- BAND — FILTERS ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">filter</h2>
        <div className="mt-4 flex flex-col gap-4">
          <FilterRow
            label="discipline"
            base={BASE}
            params={params}
            paramKey="discipline"
            activeValue={fDiscipline}
            options={DISCIPLINES.map((d) => ({ value: d, label: d }))}
          />
          <FilterRow
            label="type"
            base={BASE}
            params={params}
            paramKey="type"
            activeValue={fType}
            options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
          />
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
          <FilterRow
            label="min day rate"
            base={BASE}
            params={params}
            paramKey="minRate"
            activeValue={fMinRate}
            options={RATE_OPTIONS.map((r) => ({
              value: String(r),
              label: `$${r}+`,
            }))}
          />
          {radiusMi != null && !talentGeo ? (
            <p className="fact-secondary">
              {profile?.city
                ? `we cannot place "${profile.city}" on the map yet, so distance filters are off for now`
                : "add a city to your profile to filter by distance"}
            </p>
          ) : null}
          {anyFilter ? (
            <p>
              <Link
                className="fact-secondary underline underline-offset-4"
                href={BASE}
              >
                clear filters
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* ---------- BAND — RECOMMENDED (unfiltered view only) ---------- */}
      {recommended.length > 0 ? (
        <section className="mt-10">
          <Rule />
          <h2 className="fact-secondary mt-4">recommended for you</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-secondary">
            Picked against your crafts, level, distance, and rate. A person
            still reads every application.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((p) => (
              <ProjectCard
                key={p.project.id}
                data={p}
                application={appMap.get(p.project.id) ?? null}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- BAND — RESULTS ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">
          {filtered.length} {filtered.length === 1 ? "project" : "projects"}
        </h2>

        {filtered.length === 0 ? (
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-secondary">
            Nothing matches these filters yet.{" "}
            <Link className="underline underline-offset-4" href={BASE}>
              clear them
            </Link>{" "}
            to see all open work.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.project.id}
                data={p}
                application={appMap.get(p.project.id) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfileByUserId } from "@/app/talent/_data";
import { DISCIPLINES, PROJECT_TYPES } from "@/lib/taxonomy";
import { haversineMiles } from "@/lib/geo";
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
 * §4.3 job board. Every open project, newest first, as cards. Filters are chip
 * rows driven by GET params: discipline, radius from the talent's own city
 * (25/50/100 mi via haversine when both ends are geocoded), min day rate, and
 * project type. The talent's own application status shows on each card in mono.
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
  const [projects, appMap] = await Promise.all([
    getOpenProjects(),
    profile ? getApplicationMap(profile.id) : Promise.resolve(new Map()),
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

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-10 sm:px-10">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/talent">Callsheet</Link>
        </p>
        <Link className="fact-secondary" href="/talent">
          dashboard
        </Link>
      </header>

      <h1 className="headline mt-10 text-6xl">Open work.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        Every open project on the network, newest first. Filter by craft,
        distance from your city, rate, and type. One tap to apply — a person
        reads every application.
      </p>

      <div className="mt-8">
        <Rule />
      </div>

      {/* Filter chip rows — GET params, no search input. */}
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
            add a city to your profile to filter by distance
          </p>
        ) : null}
        {anyFilter ? (
          <p>
            <Link className="fact-secondary underline underline-offset-4" href={BASE}>
              clear filters
            </Link>
          </p>
        ) : null}
      </section>

      <div className="mt-8">
        <Rule />
      </div>

      <p className="fact-secondary mt-6">
        {filtered.length} {filtered.length === 1 ? "project" : "projects"}
      </p>

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
    </main>
  );
}

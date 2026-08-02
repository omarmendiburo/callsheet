import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";
import { DISCIPLINES } from "@/lib/taxonomy";
import { Rule } from "@/components/ui";
import { MediaFrame } from "@/components/media";
import { FilterRow } from "@/components/marketplace/FilterRow";
import {
  getBrowsePool,
  type BrowseCreative,
} from "@/components/marketplace/_data";
import { one } from "@/components/marketplace/filters";

/*
 * §4.4 Screen Tests — PUBLIC, no auth. A vertical-format feed of every
 * APPROVED ten-second pitch, one full-width 9:16 frame per creative in a
 * single scrollable column. Under each: disciplines + city in mono. NO names
 * anywhere — this is a browsing surface, and the wall never reveals identity.
 *
 * Talent never sees this page (owner's ruling 2026-08-02: creatives do not
 * browse each other's pitches) — logged-in talent redirects to /talent. The
 * reveal behind each card is a business surface; logged-out click-through
 * lands on login, which is correct.
 *
 * Filter chips: discipline, city. Cities are derived from the live pool.
 */

const BASE = "/screen-tests";

function disciplineLine(c: BrowseCreative): string {
  const names = c.disciplines.map((d) => d.type);
  if (names.length === 0) return "creative";
  return names.join(" · ");
}

export default async function ScreenTestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Owner's ruling 2026-08-02: talent does not browse other talents' pitches.
  // Logged-in creatives go home; the feed stays public for everyone else.
  const viewer = await getCurrentUser();
  if (viewer?.role === "talent") redirect("/talent");

  // Pitch media only. getBrowsePool returns approved media exclusively, so a
  // pending pitch (e.g. the seed's t11) can never appear here.
  const pool = await getBrowsePool(["pitch"]);

  const fDiscipline = one(params, "discipline");
  const fCity = one(params, "city");

  // City chip options from the live pool, sorted, de-duped.
  const cities = Array.from(new Set(pool.map((c) => c.city))).sort();

  const filtered = pool.filter((c) => {
    if (fDiscipline && !c.disciplines.some((d) => d.type === fDiscipline))
      return false;
    if (fCity && c.city !== fCity) return false;
    return true;
  });

  const anyFilter = Boolean(fDiscipline || fCity);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <h1 className="headline mt-6 text-6xl">Screen tests.</h1>
      <p className="mt-4 text-[15px] leading-relaxed">
        Ten seconds each. No names, no schools, just the pitch. Tap one to see
        who made it.
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
        {cities.length > 0 ? (
          <FilterRow
            label="city"
            base={BASE}
            params={params}
            paramKey="city"
            activeValue={fCity}
            options={cities.map((c) => ({ value: c, label: c }))}
          />
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
      </section>

      <div className="mt-8">
        <Rule />
      </div>

      <p className="fact-secondary mt-6">
        {filtered.length} {filtered.length === 1 ? "pitch" : "pitches"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 text-[15px] leading-relaxed text-secondary">
          No pitches match these filters.{" "}
          <Link className="underline underline-offset-4" href={BASE}>
            clear them
          </Link>{" "}
          to see every screen test.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-10">
          {filtered.map((c) => {
            const pitch = c.media[0];
            const body = (
              <>
                {/* Full-width 9:16 pitch frame — always vertical. */}
                <MediaFrame url={pitch?.url} vertical label="pitch" />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <span className="fact">{disciplineLine(c)}</span>
                  <span className="fact-secondary">{c.city}</span>
                </div>
              </>
            );
            return (
              <Link
                key={c.talentId}
                href={`/business/scout/${c.talentId}`}
                className="block transition-opacity duration-150 hover:opacity-90"
              >
                {body}
              </Link>
            );
          })}
        </div>
      )}
      </main>
    </>
  );
}

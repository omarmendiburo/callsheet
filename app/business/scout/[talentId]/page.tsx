import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { LEVELS } from "@/lib/taxonomy";
import { Rule, WorkFrame } from "@/components/ui";
import { ShortlistForm } from "@/components/marketplace/ShortlistForm";
import {
  getRevealCreative,
  getOpenProjectsForOrg,
  getOrgShortlistForTalent,
} from "@/components/marketplace/_data";
import { one } from "@/components/marketplace/filters";
import { resolveScoutOrg } from "../_org";

/*
 * §5.4 the reveal. The ONE surface in the product where a creative's name
 * appears. Full name headline (Anton), every APPROVED media frame in native
 * aspect, the full mono fact block, prompt answers in Inter, a certification
 * badge if any, and a shortlist action scoped to one open project of the
 * caller's org.
 *
 * We never expose the creative's email or phone: introductions happen off
 * platform for now, and one honest line says so. Only approved media renders —
 * a pending pitch does not show even here.
 */

const LEVEL_LABEL = new Map(LEVELS.map((l) => [l.id, l.label]));

const AVAILABILITY_LABEL: Record<string, string> = {
  now: "available now",
  from_date: "available from a date",
  unavailable: "unavailable",
};

export default async function RevealPage({
  params,
  searchParams,
}: {
  params: Promise<{ talentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("business");
  const { talentId } = await params;
  const sp = await searchParams;
  const orgParam = one(sp, "org");

  const resolution = await resolveScoutOrg(user.id, orgParam);
  // A multi-org user landing here without ?org is sent to pick one.
  if (resolution.kind === "choose") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <p className="fact-secondary">scout · pick an org</p>
        <p className="mt-3">
          <Link
            className="fact-secondary underline underline-offset-4"
            href="/business/scout"
          >
            back to scout
          </Link>
        </p>
        <h1 className="headline mt-4 text-4xl sm:text-5xl">Which org?</h1>
        <ul className="mt-8 flex flex-col divide-y divide-rule border-t border-b border-rule">
          {resolution.orgs.map(({ org }) => (
            <li key={org.id} className="flex items-center justify-between py-4">
              <span className="text-[15px]">{org.name}</span>
              <Link
                className="fact underline underline-offset-4"
                href={`/business/scout/${talentId}?org=${org.id}`}
              >
                view as {org.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const org = resolution.org;

  const [reveal, projects, shortlist] = await Promise.all([
    getRevealCreative(talentId),
    getOpenProjectsForOrg(org.id),
    getOrgShortlistForTalent(talentId, org.id),
  ]);

  // No approved media -> was never on the wall -> not viewable here.
  if (!reveal || reveal.media.length === 0) notFound();

  const { profile, disciplines, media, certLevel } = reveal;
  const prompts = (profile.prompts ?? []).slice(0, 3);
  const backHref = orgParam
    ? `/business/scout?org=${org.id}`
    : "/business/scout";

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <p className="fact-secondary">scout · {org.name} · reveal</p>
      <p className="mt-3">
        <Link
          className="fact-secondary underline underline-offset-4"
          href={backHref}
        >
          back to scout
        </Link>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: the work, stacked large in native aspect ratios. */}
        <div>
          <div className="columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
            {media.map((m) => (
              <figure key={m.id} className="break-inside-avoid">
                <WorkFrame vertical={m.vertical} label={m.kind} />
                {m.title ? (
                  <figcaption className="fact-secondary mt-2">
                    {m.title}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </div>

        {/* Right: the reveal — name, facts, prompts, shortlist. */}
        <div>
          {/* The name. This is the only surface it appears on. */}
          <h1 className="headline text-4xl sm:text-5xl">
            {profile.displayName}
          </h1>
          {profile.isPlaceholder ? (
            <p className="fact-secondary mt-3">placeholder profile · demo data</p>
          ) : null}
          {certLevel ? (
            <p className="fact mt-3 inline-block border border-ink px-2 py-1.5">
              certified · {certLevel}
            </p>
          ) : null}

          {profile.bio ? (
            <p className="mt-5 max-w-md text-[15px] leading-relaxed">
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-8">
            <Rule />
          </div>

          {/* Full mono fact block. */}
          <section className="mt-6 flex flex-col gap-2">
            <h2 className="fact-secondary">disciplines</h2>
            {disciplines.length === 0 ? (
              <p className="text-[15px] text-secondary">None listed.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {disciplines.map((d) => (
                  <li key={d.id} className="flex justify-between gap-4">
                    <span className="fact">{d.type}</span>
                    <span className="fact-secondary">
                      {LEVEL_LABEL.get(d.level) ?? d.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 flex flex-col gap-1.5">
            <div className="flex justify-between gap-4">
              <span className="fact-secondary">city</span>
              <span className="fact">{profile.city}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="fact-secondary">availability</span>
              <span className="fact">
                {AVAILABILITY_LABEL[profile.availability] ??
                  profile.availability}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="fact-secondary">day rate</span>
              <span className="fact">
                {profile.dayRate != null ? `$${profile.dayRate}` : "on request"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="fact-secondary">post hourly</span>
              <span className="fact">
                {profile.postHourly != null
                  ? `$${profile.postHourly}/hr`
                  : "on request"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="fact-secondary">own gear</span>
              <span className="fact">{profile.byoGear ? "yes" : "no"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="fact-secondary">travel</span>
              <span className="fact">
                {profile.willingToTravel
                  ? profile.travelRadiusMiles
                    ? `within ${profile.travelRadiusMiles} mi`
                    : "yes"
                  : "local only"}
              </span>
            </div>
          </section>

          {/* Prompt answers — Inter (sentences), never mono. */}
          {prompts.length > 0 ? (
            <>
              <div className="mt-6">
                <Rule />
              </div>
              <section className="mt-6 flex flex-col gap-5">
                {prompts.map((p, i) => (
                  <div key={i}>
                    <p className="fact-secondary">{p.prompt}</p>
                    <p className="mt-1.5 text-[18px] leading-relaxed">
                      {p.answer}
                    </p>
                  </div>
                ))}
              </section>
            </>
          ) : null}

          <div className="mt-8">
            <Rule />
          </div>

          {/* Shortlist — the one primary action on this screen. */}
          <section className="mt-6">
            <h2 className="fact-secondary">shortlist</h2>
            <ShortlistForm
              talentId={talentId}
              orgId={org.id}
              projects={projects.map((p) => ({ id: p.id, title: p.title }))}
              alreadyShortlisted={
                shortlist ? { projectTitle: shortlist.projectTitle } : null
              }
            />
            {/* The honest line: no contact details, intros happen off platform. */}
            <p className="mt-5 max-w-md text-[13px] leading-relaxed text-secondary">
              We do not show email or phone here. Shortlist a creative and
              HMNTY makes the introduction off platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

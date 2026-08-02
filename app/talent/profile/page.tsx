import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LEVELS } from "@/lib/taxonomy";
import { Rule, WorkFrame } from "@/components/ui";
import {
  getDisciplines,
  getMedia,
  getProfileByUserId,
} from "../_data";

/*
 * §4.4 profile as it reads after the reveal. The shell (sidebar) owns all
 * chrome. This page opens with the uniform header: a context line, then the
 * person's name as the Anton headline (the reveal), then one sub-line. Content
 * lays out as labeled bands — pitch, work, facts, rates, links, prompts —
 * each a fact-secondary label under a Rule. Every block links back to its
 * onboarding step to edit.
 */

const LEVEL_LABEL = new Map(LEVELS.map((l) => [l.id, l.label]));

const AVAILABILITY_LABEL: Record<string, string> = {
  now: "available now",
  from_date: "available from a date",
  unavailable: "unavailable",
};

function EditLink({ href }: { href: string }) {
  return (
    <Link className="fact-secondary underline underline-offset-4" href={href}>
      edit
    </Link>
  );
}

export default async function ProfilePage() {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <p className="fact-secondary">talent · my profile</p>
        <h1 className="headline mt-4 text-4xl sm:text-5xl">No profile yet.</h1>
        <p className="mt-6 text-[15px] leading-relaxed">
          Build one from the{" "}
          <Link className="underline underline-offset-2" href="/talent/onboarding">
            onboarding
          </Link>
          .
        </p>
      </div>
    );
  }

  const [disciplines, media] = await Promise.all([
    getDisciplines(profile.id),
    getMedia(profile.id),
  ]);
  const pitch = media.find((m) => m.kind === "pitch");
  const work = media.filter((m) => m.kind !== "pitch");
  const links = profile.links ?? [];
  const prompts = (profile.prompts ?? []).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="fact-secondary">talent · my profile</p>
      {/* Name — the reveal. Only appears on this page and the detail panel. */}
      <h1 className="headline mt-4 text-4xl sm:text-5xl">
        {profile.displayName}
      </h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        This is how employers see you after the reveal. Every block edits back
        to its onboarding step.
      </p>

      {/* ---------- BAND — PITCH ---------- */}
      <section className="mt-10">
        <Rule />
        <div className="mt-4 flex items-baseline justify-between">
          <h2 className="fact-secondary">ten-second pitch</h2>
          <EditLink href="/talent/onboarding?step=3" />
        </div>
        <div className="mt-4 max-w-64">
          {pitch ? (
            <WorkFrame vertical label="pitch" />
          ) : (
            <p className="text-[15px] text-secondary">
              No pitch registered yet.
            </p>
          )}
        </div>
      </section>

      {/* ---------- BAND — SELECTED WORK ---------- */}
      <section className="mt-10">
        <Rule />
        <div className="mt-4 flex items-baseline justify-between">
          <h2 className="fact-secondary">selected work</h2>
          <EditLink href="/talent/onboarding?step=2" />
        </div>
        {work.length === 0 ? (
          <p className="mt-4 text-[15px] text-secondary">
            No work registered yet.
          </p>
        ) : (
          <div className="mt-4 columns-1 gap-4 sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {work.map((m) => (
              <figure key={m.id}>
                <div className={m.vertical ? "mx-auto max-w-56" : ""}>
                  <WorkFrame vertical={m.vertical} label={m.kind} />
                </div>
                {m.title ? (
                  <figcaption className="mt-2 text-[15px]">
                    {m.title}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* ---------- BAND — FACTS (disciplines, location) ---------- */}
      <section className="mt-10">
        <Rule />
        <div className="mt-4 grid grid-cols-1 gap-10 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="fact-secondary">disciplines</h2>
              <EditLink href="/join" />
            </div>
            {disciplines.length === 0 ? (
              <p className="mt-4 text-[15px] text-secondary">None listed.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
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
          </div>

          <div>
            <h2 className="fact-secondary">location &amp; availability</h2>
            <ul className="mt-4 flex flex-col gap-2">
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">city</span>
                <span className="fact">{profile.city}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">status</span>
                <span className="fact">
                  {AVAILABILITY_LABEL[profile.availability] ??
                    profile.availability}
                </span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">travel</span>
                <span className="fact">
                  {profile.willingToTravel
                    ? profile.travelRadiusMiles
                      ? `within ${profile.travelRadiusMiles} mi`
                      : "yes"
                    : "local only"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- BAND — RATES & GEAR ---------- */}
      <section className="mt-10">
        <Rule />
        <div className="mt-4 flex items-baseline justify-between">
          <h2 className="fact-secondary">rates &amp; gear</h2>
          <EditLink href="/talent/onboarding?step=5" />
        </div>
        <ul className="mt-4 flex flex-col gap-2 sm:max-w-md">
          <li className="flex justify-between gap-4">
            <span className="fact-secondary">day rate</span>
            <span className="fact">
              {profile.dayRate != null ? `$${profile.dayRate}` : "on request"}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="fact-secondary">post hourly</span>
            <span className="fact">
              {profile.postHourly != null
                ? `$${profile.postHourly}/hr`
                : "on request"}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="fact-secondary">own gear</span>
            <span className="fact">{profile.byoGear ? "yes" : "no"}</span>
          </li>
        </ul>
        {profile.gearNotes ? (
          <p className="mt-4 text-[15px] leading-relaxed sm:max-w-md">
            {profile.gearNotes}
          </p>
        ) : null}
      </section>

      {/* ---------- BAND — LINKS ---------- */}
      {links.length > 0 ? (
        <section className="mt-10">
          <Rule />
          <div className="mt-4 flex items-baseline justify-between">
            <h2 className="fact-secondary">links</h2>
            <EditLink href="/talent/onboarding?step=1" />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {links.map((l, i) => (
              <li key={i}>
                <a
                  className="fact underline underline-offset-4"
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------- BAND — PROMPTS (Inter sentences, never fact) ---------- */}
      {prompts.length > 0 ? (
        <section className="mt-10">
          <Rule />
          <div className="mt-4 flex items-baseline justify-between">
            <h2 className="fact-secondary">in their words</h2>
            <EditLink href="/talent/onboarding?step=4" />
          </div>
          <div className="mt-6 flex flex-col gap-8">
            {prompts.map((p, i) => (
              <div key={i}>
                <p className="fact-secondary">{p.prompt}</p>
                <p className="mt-2 max-w-xl text-[18px] leading-relaxed">
                  {p.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

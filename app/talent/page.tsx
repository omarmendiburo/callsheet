import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import {
  completeness,
  getApplications,
  getMedia,
  getProfileByUserId,
} from "./_data";
import { withdrawApplication } from "./_actions";
import { getProfileOpenStats } from "@/lib/views";

/*
 * §4.2/§4.4 dashboard home. The shell (sidebar) owns all chrome — logo, nav,
 * user block, log out. This page opens with the uniform header (context line,
 * Anton headline, one sub-line) and lays its content out as labeled bands:
 * profile completeness, applications, quick actions — each a fact-secondary
 * label under a Rule, mt-10 between bands.
 */
export default async function TalentHome() {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <p className="fact-secondary">talent · dashboard</p>
        <h1 className="headline mt-4 text-4xl sm:text-5xl">No profile yet.</h1>
        <p className="mt-6 text-[15px] leading-relaxed">
          Your account exists but has no talent profile. Start over from the{" "}
          <Link className="underline underline-offset-2" href="/join">
            join screen
          </Link>
          .
        </p>
      </div>
    );
  }

  const media = await getMedia(profile.id);
  const applications = await getApplications(profile.id);
  const opens = await getProfileOpenStats(profile.id);
  const steps = completeness(profile, media);
  const empty = steps.filter((s) => !s.done);
  const doneCount = steps.length - empty.length;

  const firstName = profile.displayName.split(" ")[0] || profile.displayName;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="fact-secondary">talent · dashboard</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">Hi, {firstName}.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        This is your side of the callsheet. Employers see your reel first and
        your name last. Keep the work up front.
      </p>

      {/* ---------- BAND — PROFILE OPENS ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">profile opens</h2>
        {opens.total === 0 ? (
          <p className="mt-4 text-[15px] leading-relaxed text-secondary">
            No employer has opened your full profile yet. They browse the wall
            name-blind first; opens land here the moment they happen.
          </p>
        ) : (
          <p className="mt-4 text-[15px] leading-relaxed">
            Employers opened your full profile{" "}
            <span className="fact">{opens.total}</span>{" "}
            {opens.total === 1 ? "time" : "times"}
            {opens.lastOpenedAt
              ? `, most recently ${opens.lastOpenedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : ""}
            . Who stays private, on both sides, until they reach out.
          </p>
        )}
      </section>

      {/* ---------- BAND — PROFILE COMPLETENESS ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">
          profile · {doneCount} of {steps.length} sections filled
        </h2>
        {empty.length > 0 ? (
          <p className="mt-4 text-[15px] leading-relaxed">
            Still empty:{" "}
            {empty.map((s, i) => (
              <span key={s.key}>
                {i > 0 ? ", " : ""}
                {s.label}
              </span>
            ))}
            .{" "}
            <Link
              className="underline underline-offset-2"
              href="/talent/onboarding"
            >
              finish your profile
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-[15px] leading-relaxed">
            Every section is filled.{" "}
            <Link
              className="underline underline-offset-2"
              href="/talent/profile"
            >
              see how it reads
            </Link>
          </p>
        )}
      </section>

      {/* ---------- BAND — APPLICATIONS ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">your applications</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-[15px] leading-relaxed">
            No applications yet. Matched work shows up on{" "}
            <Link className="underline underline-offset-2" href="/talent/jobs">
              the jobs wall
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
            {applications.map(({ application, projectTitle }) => (
              <li key={application.id} className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[15px]">{projectTitle}</span>
                  <span className="fact border border-rule px-2 py-1.5">
                    {application.status}
                  </span>
                </div>
                {/* Terminal states get one honest closing line each. */}
                {application.status === "booked" ? (
                  <p className="text-[13px] leading-relaxed text-secondary">
                    You are on the callsheet. HMNTY reaches out to make the
                    introduction.
                  </p>
                ) : application.status === "declined" ? (
                  <p className="text-[13px] leading-relaxed text-secondary">
                    Not a fit for this one. New work posts on the jobs wall all
                    the time.
                  </p>
                ) : (
                  <form action={withdrawApplication}>
                    <input
                      type="hidden"
                      name="applicationId"
                      value={application.id}
                    />
                    <button
                      type="submit"
                      className="fact-secondary underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                    >
                      withdraw application
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- BAND — QUICK ACTIONS ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">quick actions</h2>
        <nav className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <Link
            className="fact underline underline-offset-4"
            href="/talent/onboarding"
          >
            edit profile
          </Link>
          <Link
            className="fact underline underline-offset-4"
            href="/talent/profile"
          >
            view public profile
          </Link>
          <Link
            className="fact underline underline-offset-4"
            href="/talent/jobs"
          >
            browse jobs
          </Link>
        </nav>
      </section>
    </div>
  );
}

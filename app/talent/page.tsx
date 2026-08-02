import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import {
  completeness,
  getApplications,
  getMedia,
  getProfileByUserId,
} from "./_data";

/*
 * §4.2/§4.4 dashboard home. Greeting, what's still empty in the profile,
 * application rows in mono status chips, and the mono links out to the
 * onboarding, profile, and jobs surfaces.
 */
export default async function TalentHome() {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="fact">
          <Link href="/">Callsheet</Link>
        </p>
        <h1 className="headline mt-10 text-4xl">No profile yet.</h1>
        <p className="mt-6 text-[15px] leading-relaxed">
          Your account exists but has no talent profile. Start over from the{" "}
          <Link className="underline underline-offset-2" href="/join">
            join screen
          </Link>
          .
        </p>
      </main>
    );
  }

  const media = await getMedia(profile.id);
  const applications = await getApplications(profile.id);
  const steps = completeness(profile, media);
  const empty = steps.filter((s) => !s.done);
  const doneCount = steps.length - empty.length;

  const firstName = profile.displayName.split(" ")[0] || profile.displayName;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/">Callsheet</Link>
        </p>
        <form action="/logout" method="post">
          <button className="fact-secondary" type="submit">
            log out
          </button>
        </form>
      </header>

      <h1 className="headline mt-12 text-5xl">Hi, {firstName}.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        This is your side of the callsheet. Employers see your reel first and
        your name last. Keep the work up front.
      </p>

      <p className="fact-secondary mt-8">
        profile · {doneCount} of {steps.length} sections filled
      </p>
      {empty.length > 0 ? (
        <p className="mt-3 text-[15px] leading-relaxed">
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
        <p className="mt-3 text-[15px] leading-relaxed">
          Every section is filled.{" "}
          <Link className="underline underline-offset-2" href="/talent/profile">
            see how it reads
          </Link>
        </p>
      )}

      <div className="mt-10">
        <Rule />
      </div>

      <section className="mt-10">
        <h2 className="fact-secondary">your applications</h2>
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
              <li
                key={application.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <span className="text-[15px]">{projectTitle}</span>
                <span className="fact border border-rule px-2 py-1.5">
                  {application.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <Rule />
      </div>

      <nav className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
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
        <Link className="fact underline underline-offset-4" href="/talent/jobs">
          browse jobs
        </Link>
      </nav>
    </main>
  );
}

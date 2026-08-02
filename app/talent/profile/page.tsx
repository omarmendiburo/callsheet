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
 * §4.4 profile as it reads after the reveal. Pitch frame up top, work frames,
 * disciplines + levels as mono facts, rates, city/availability, prompt answers
 * in Inter. The wall never shows a name; this page — the person's own — does.
 * Every block links back to its onboarding step to edit.
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="fact">
          <Link href="/talent">Callsheet</Link>
        </p>
        <h1 className="headline mt-10 text-4xl">No profile yet.</h1>
        <p className="mt-6 text-[15px] leading-relaxed">
          Build one from the{" "}
          <Link className="underline underline-offset-2" href="/talent/onboarding">
            onboarding
          </Link>
          .
        </p>
      </main>
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/talent">Callsheet</Link>
        </p>
        <Link className="fact-secondary" href="/talent/onboarding">
          edit profile
        </Link>
      </header>

      <p className="fact-secondary mt-10">preview · how employers see you</p>

      {/* Name — the reveal. Only appears on this page and the detail panel. */}
      <h1 className="headline mt-4 text-5xl">{profile.displayName}</h1>

      {/* Pitch frame up top. */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="fact-secondary">ten-second pitch</h2>
          <EditLink href="/talent/onboarding?step=3" />
        </div>
        <div className="mt-3 max-w-64">
          {pitch ? (
            <WorkFrame vertical label="pitch" />
          ) : (
            <p className="text-[15px] text-secondary">
              No pitch registered yet.
            </p>
          )}
        </div>
      </section>

      <div className="mt-10">
        <Rule />
      </div>

      {/* Work frames — native aspect ratios, mixed portrait/landscape. */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
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

      <div className="mt-10">
        <Rule />
      </div>

      {/* Facts — disciplines + levels, city, availability, rates: all mono. */}
      <section className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="fact-secondary">disciplines</h2>
            <EditLink href="/join" />
          </div>
          {disciplines.length === 0 ? (
            <p className="mt-3 text-[15px] text-secondary">None listed.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
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
          <ul className="mt-3 flex flex-col gap-2">
            <li className="flex justify-between gap-4">
              <span className="fact-secondary">city</span>
              <span className="fact">{profile.city}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="fact-secondary">status</span>
              <span className="fact">
                {AVAILABILITY_LABEL[profile.availability] ?? profile.availability}
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
      </section>

      <div className="mt-10">
        <Rule />
      </div>

      {/* Rates & gear. */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="fact-secondary">rates &amp; gear</h2>
          <EditLink href="/talent/onboarding?step=5" />
        </div>
        <ul className="mt-3 flex flex-col gap-2 sm:max-w-md">
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
          <p className="mt-3 text-[15px] leading-relaxed sm:max-w-md">
            {profile.gearNotes}
          </p>
        ) : null}
      </section>

      {/* Portfolio links. */}
      {links.length > 0 ? (
        <>
          <div className="mt-10">
            <Rule />
          </div>
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="fact-secondary">links</h2>
              <EditLink href="/talent/onboarding?step=1" />
            </div>
            <ul className="mt-3 flex flex-col gap-2">
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
        </>
      ) : null}

      {/* Prompt answers — Inter (sentences), never mono. Max three. */}
      {prompts.length > 0 ? (
        <>
          <div className="mt-10">
            <Rule />
          </div>
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="fact-secondary">in their words</h2>
              <EditLink href="/talent/onboarding?step=4" />
            </div>
            <div className="mt-5 flex flex-col gap-8">
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
        </>
      ) : null}

      <div className="mt-12">
        <Rule />
      </div>
      <p className="mt-6">
        <Link className="fact underline underline-offset-4" href="/talent">
          back to dashboard
        </Link>
      </p>
    </main>
  );
}

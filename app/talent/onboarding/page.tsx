import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PROFILE_PROMPTS } from "@/lib/taxonomy";
import {
  Field,
  PrimaryButton,
  Rule,
  TextArea,
  TextInput,
  WorkFrame,
} from "@/components/ui";
import { getMedia, getProfileByUserId } from "../_data";
import {
  addMedia,
  deleteMedia,
  saveLinks,
  savePrompts,
  saveRates,
} from "../_actions";

/*
 * §4.2 guided, skippable onboarding. One page, five steps driven by ?step=.
 * Each step is its own form + server action; every step can be skipped with
 * nothing saved. One black primary button per screen (DESIGN law); "skip"
 * and step navigation are mono text links.
 */

const STEPS = [
  { n: 1, key: "links", label: "links" },
  { n: 2, key: "media", label: "work" },
  { n: 3, key: "pitch", label: "pitch" },
  { n: 4, key: "prompts", label: "prompts" },
  { n: 5, key: "rates", label: "rates" },
] as const;

const WORK_KINDS = [
  { id: "reel", label: "Reel" },
  { id: "shortform", label: "Shortform" },
  { id: "headshot", label: "Headshot" },
  { id: "still", label: "Still" },
] as const;

function stepHref(n: number) {
  return `/talent/onboarding?step=${n}`;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await requireUser("talent");
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="fact">
          <Link href="/">Callsheet</Link>
        </p>
        <h1 className="headline mt-10 text-4xl">No profile yet.</h1>
        <p className="mt-6 text-[15px] leading-relaxed">
          Start from the{" "}
          <Link className="underline underline-offset-2" href="/join">
            join screen
          </Link>
          .
        </p>
      </main>
    );
  }

  const { step: stepRaw } = await searchParams;
  const step = Math.min(Math.max(Number.parseInt(stepRaw ?? "1", 10) || 1, 1), 5);
  const nextStepHref = step < 5 ? stepHref(step + 1) : "/talent";

  const media = await getMedia(profile.id);
  const work = media.filter((m) => m.kind !== "pitch");
  const pitches = media.filter((m) => m.kind === "pitch");
  const links = profile.links ?? [];
  const prompts = profile.prompts ?? [];
  const promptAnswers = new Map(prompts.map((p) => [p.prompt, p.answer]));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/talent">Callsheet</Link>
        </p>
        <p className="fact-secondary">step {step} of 5</p>
      </header>

      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {STEPS.map((s) => (
          <Link
            key={s.key}
            href={stepHref(s.n)}
            className={`fact underline-offset-4 ${
              s.n === step ? "underline" : "text-secondary"
            }`}
          >
            {s.n}. {s.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <Rule />
      </div>

      {/* ---------- STEP 1 — LINKS ---------- */}
      {step === 1 ? (
        <section className="mt-10">
          <h1 className="headline text-4xl">Where does your work live?</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed">
            Add the links a producer would actually open. Website, Vimeo, a
            reel, an IG. You can add three now and more later.
          </p>
          <form action={saveLinks} className="mt-8 flex flex-col gap-6">
            <input type="hidden" name="next" value={nextStepHref} />
            {[0, 1, 2].map((i) => {
              const existing = links[i];
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]"
                >
                  <Field label={`link ${i + 1} label`}>
                    <TextInput
                      name="linkLabel"
                      placeholder="e.g. reel"
                      defaultValue={existing?.label ?? ""}
                    />
                  </Field>
                  <Field label="url">
                    <TextInput
                      name="linkUrl"
                      type="url"
                      placeholder="https://"
                      defaultValue={existing?.url ?? ""}
                    />
                  </Field>
                </div>
              );
            })}
            <PrimaryButton type="submit">SAVE &amp; CONTINUE</PrimaryButton>
          </form>
        </section>
      ) : null}

      {/* ---------- STEP 2 — WORK ---------- */}
      {step === 2 ? (
        <section className="mt-10">
          <h1 className="headline text-4xl">Register your work.</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed">
            No uploads tonight. Title each piece and mark its shape. It shows on
            your profile as a frame until real files land.
          </p>

          {work.length > 0 ? (
            <ul className="mt-8 flex flex-col gap-6">
              {work.map((m) => (
                <li key={m.id}>
                  <div className={m.vertical ? "max-w-56" : ""}>
                    <WorkFrame
                      vertical={m.vertical}
                      label={`${m.kind} · ${m.status}`}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <span className="text-[15px]">{m.title}</span>
                    <form action={deleteMedia}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="next" value={stepHref(2)} />
                      <button className="fact-secondary underline underline-offset-4">
                        remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <form action={addMedia} className="mt-8 flex flex-col gap-6">
            <input type="hidden" name="next" value={stepHref(2)} />
            <Field label="title">
              <TextInput name="title" placeholder="e.g. costera spring spot" />
            </Field>
            <Field label="kind">
              <select
                name="kind"
                defaultValue="reel"
                className="fact-secondary w-full border border-rule bg-transparent px-3 py-3 focus:border-ink focus:outline-none"
              >
                {WORK_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="vertical"
                className="h-4 w-4 accent-ink"
              />
              <span className="text-[15px]">This piece is vertical (9:16).</span>
            </label>
            <PrimaryButton type="submit">ADD THIS PIECE</PrimaryButton>
          </form>

          <p className="mt-8">
            <Link
              className="fact underline underline-offset-4"
              href={nextStepHref}
            >
              done adding work, continue
            </Link>
          </p>
        </section>
      ) : null}

      {/* ---------- STEP 3 — PITCH ---------- */}
      {step === 3 ? (
        <section className="mt-10">
          <h1 className="headline text-4xl">Your ten-second pitch.</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed">
            One vertical clip, ten seconds, you talking. Register it now with a
            title; the file comes later. This is the first thing a curator plays.
          </p>

          {pitches.length > 0 ? (
            <ul className="mt-8 flex flex-col gap-6">
              {pitches.map((m) => (
                <li key={m.id}>
                  <div className="max-w-56">
                    <WorkFrame vertical label={`pitch · ${m.status}`} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <span className="text-[15px]">{m.title}</span>
                    <form action={deleteMedia}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="next" value={stepHref(3)} />
                      <button className="fact-secondary underline underline-offset-4">
                        remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <form action={addMedia} className="mt-8 flex flex-col gap-6">
            <input type="hidden" name="next" value={stepHref(3)} />
            <input type="hidden" name="kind" value="pitch" />
            <Field label="title">
              <TextInput name="title" placeholder="e.g. who i am in 10 seconds" />
            </Field>
            <PrimaryButton type="submit">REGISTER PITCH</PrimaryButton>
          </form>

          <p className="mt-8">
            <Link
              className="fact underline underline-offset-4"
              href={nextStepHref}
            >
              continue
            </Link>
          </p>
        </section>
      ) : null}

      {/* ---------- STEP 4 — PROMPTS ---------- */}
      {step === 4 ? (
        <section className="mt-10">
          <h1 className="headline text-4xl">Say something true.</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed">
            Answer up to three. Short and specific beats polished. These appear
            only after someone opens your profile, never on the wall.
          </p>
          <form action={savePrompts} className="mt-8 flex flex-col gap-8">
            <input type="hidden" name="next" value={nextStepHref} />
            {PROFILE_PROMPTS.map((p) => (
              <Field key={p} label={p}>
                <TextArea
                  name={`answer::${p}`}
                  placeholder="your answer"
                  defaultValue={promptAnswers.get(p) ?? ""}
                />
              </Field>
            ))}
            <p className="text-[13px] text-secondary">
              The first three you answer are saved.
            </p>
            <PrimaryButton type="submit">SAVE &amp; CONTINUE</PrimaryButton>
          </form>
        </section>
      ) : null}

      {/* ---------- STEP 5 — RATES ---------- */}
      {step === 5 ? (
        <section className="mt-10">
          <h1 className="headline text-4xl">Rates &amp; gear.</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed">
            Optional, but a rate up front saves everyone a round of email. Leave
            anything blank you&apos;d rather discuss.
          </p>
          <form action={saveRates} className="mt-8 flex flex-col gap-6">
            <input type="hidden" name="next" value="/talent" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field label="day rate (usd)" hint="on-set day">
                <TextInput
                  name="dayRate"
                  type="number"
                  min={0}
                  placeholder="e.g. 600"
                  defaultValue={profile.dayRate ?? ""}
                />
              </Field>
              <Field label="post hourly (usd)" hint="edit / grade">
                <TextInput
                  name="postHourly"
                  type="number"
                  min={0}
                  placeholder="e.g. 55"
                  defaultValue={profile.postHourly ?? ""}
                />
              </Field>
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="byoGear"
                defaultChecked={profile.byoGear}
                className="h-4 w-4 accent-ink"
              />
              <span className="text-[15px]">I bring my own gear.</span>
            </label>
            <Field label="gear notes" hint="optional">
              <TextArea
                name="gearNotes"
                placeholder="e.g. fx3 + prime set, own lights"
                defaultValue={profile.gearNotes ?? ""}
              />
            </Field>
            <PrimaryButton type="submit">FINISH</PrimaryButton>
          </form>
        </section>
      ) : null}

      <div className="mt-12">
        <Rule />
      </div>
      <div className="mt-6 flex items-baseline justify-between">
        <Link className="fact-secondary underline underline-offset-4" href="/talent">
          save for later, back to dashboard
        </Link>
        {step < 5 ? (
          <Link
            className="fact-secondary underline underline-offset-4"
            href={nextStepHref}
          >
            skip this step
          </Link>
        ) : null}
      </div>
    </main>
  );
}

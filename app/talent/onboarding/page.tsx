import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DISCIPLINES, LEVELS, PROFILE_PROMPTS } from "@/lib/taxonomy";
import {
  Field,
  PrimaryButton,
  Rule,
  TextArea,
  TextInput,
} from "@/components/ui";
import { MediaFrame } from "@/components/media";
import { getDisciplines, getMedia, getProfileByUserId } from "../_data";
import {
  addMedia,
  deleteMedia,
  saveBasics,
  saveLinks,
  savePrompts,
  saveRates,
} from "../_actions";

/*
 * §4.2 guided, skippable onboarding. The shell (sidebar) owns all chrome. This
 * page adopts the uniform header — a context line naming the step, the step's
 * statement as the Anton headline, one sub-line — then a step-navigation band
 * and the step's form. Five steps driven by ?step=; each is its own form +
 * server action; every step can be skipped with nothing saved. One black
 * primary button per screen (DESIGN law); "skip" and step nav are text links.
 */

const STEPS = [
  {
    n: 1,
    key: "links",
    label: "links",
    title: "Where does your work live?",
    sub: "Add the links a producer would actually open. Website, Vimeo, a reel, an IG. You can add three now and more later.",
  },
  {
    n: 2,
    key: "media",
    label: "work",
    title: "Register your work.",
    sub: "Paste a link to each piece: YouTube, Vimeo, or Instagram. It plays right on your profile once approved. No link yet? Title it now and add the link later.",
  },
  {
    n: 3,
    key: "pitch",
    label: "pitch",
    title: "Your ten-second pitch.",
    sub: "One vertical clip, ten seconds, you talking. Paste a link to it and it plays here once approved. This is the first thing a curator plays.",
  },
  {
    n: 4,
    key: "prompts",
    label: "prompts",
    title: "Say something true.",
    sub: "Answer up to three. Short and specific beats polished. These appear only after someone opens your profile, never on the wall.",
  },
  {
    n: 5,
    key: "rates",
    label: "rates",
    title: "Rates & gear.",
    sub: "Optional, but a rate up front saves everyone a round of email. Leave anything blank you'd rather discuss.",
  },
  {
    n: 6,
    key: "basics",
    label: "you",
    title: "Your basics.",
    sub: "Name, city, travel, availability, and your crafts. Ranking and search read these, so keep them current.",
  },
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
      <div className="mx-auto w-full max-w-2xl">
        <p className="fact-secondary">talent · onboarding</p>
        <h1 className="headline mt-4 text-4xl sm:text-5xl">No profile yet.</h1>
        <p className="mt-6 text-[15px] leading-relaxed">
          Start from the{" "}
          <Link className="underline underline-offset-2" href="/join">
            join screen
          </Link>
          .
        </p>
      </div>
    );
  }

  const { step: stepRaw } = await searchParams;
  const step = Math.min(Math.max(Number.parseInt(stepRaw ?? "1", 10) || 1, 1), STEPS.length);
  const nextStepHref = step < STEPS.length ? stepHref(step + 1) : "/talent";
  const current = STEPS[step - 1];

  const media = await getMedia(profile.id);
  const myDisciplines = step === 6 ? await getDisciplines(profile.id) : [];
  const levelByType = new Map(myDisciplines.map((d) => [d.type, d.level]));
  const work = media.filter((m) => m.kind !== "pitch");
  const pitches = media.filter((m) => m.kind === "pitch");
  const links = profile.links ?? [];
  const prompts = profile.prompts ?? [];
  const promptAnswers = new Map(prompts.map((p) => [p.prompt, p.answer]));

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="fact-secondary">
        talent · onboarding · step {step} of {STEPS.length}
      </p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">{current.title}</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">{current.sub}</p>

      {/* ---------- BAND — STEP NAVIGATION ---------- */}
      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">steps</h2>
        <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
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
      </section>

      {/* ---------- STEP 1 — LINKS ---------- */}
      {step === 1 ? (
        <section className="mt-10">
          <Rule />
          <h2 className="fact-secondary mt-4">your links</h2>
          <form action={saveLinks} className="mt-6 flex flex-col gap-6">
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
          <Rule />
          <h2 className="fact-secondary mt-4">your work</h2>

          {work.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-6">
              {work.map((m) => (
                <li key={m.id}>
                  <div className={m.vertical ? "max-w-56" : ""}>
                    <MediaFrame
                      url={m.url}
                      vertical={m.vertical}
                      label={`${m.kind} · ${m.status}`}
                      interactive
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

          <form action={addMedia} className="mt-6 flex flex-col gap-6">
            <input type="hidden" name="next" value={stepHref(2)} />
            <Field label="title">
              <TextInput name="title" placeholder="e.g. costera spring spot" />
            </Field>
            <Field label="link (youtube / vimeo / instagram)" hint="optional">
              <TextInput
                name="url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
              />
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

          <p className="mt-6">
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
          <Rule />
          <h2 className="fact-secondary mt-4">your pitch</h2>

          {pitches.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-6">
              {pitches.map((m) => (
                <li key={m.id}>
                  <div className="max-w-56">
                    <MediaFrame
                      url={m.url}
                      vertical
                      label={`pitch · ${m.status}`}
                      interactive
                    />
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

          <form action={addMedia} className="mt-6 flex flex-col gap-6">
            <input type="hidden" name="next" value={stepHref(3)} />
            <input type="hidden" name="kind" value="pitch" />
            <Field label="title">
              <TextInput name="title" placeholder="e.g. who i am in 10 seconds" />
            </Field>
            <Field label="link to the clip" hint="optional">
              <TextInput
                name="url"
                type="url"
                placeholder="https://youtube.com/shorts/..."
              />
            </Field>
            <PrimaryButton type="submit">REGISTER PITCH</PrimaryButton>
          </form>

          <p className="mt-6">
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
          <Rule />
          <h2 className="fact-secondary mt-4">your answers</h2>
          <form action={savePrompts} className="mt-6 flex flex-col gap-8">
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
          <Rule />
          <h2 className="fact-secondary mt-4">your rates</h2>
          <form action={saveRates} className="mt-6 flex flex-col gap-6">
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

      {/* ---------- STEP 6 — BASICS ---------- */}
      {step === 6 ? (
        <section className="mt-10">
          <Rule />
          <h2 className="fact-secondary mt-4">your basics</h2>
          <form action={saveBasics} className="mt-6 flex flex-col gap-8">
            <input type="hidden" name="next" value="/talent/profile" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field label="name" hint="as employers see it after the reveal">
                <TextInput
                  name="displayName"
                  defaultValue={profile.displayName}
                />
              </Field>
              <Field label="city">
                <TextInput
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={profile.city}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field label="availability">
                <select
                  name="availability"
                  defaultValue={profile.availability}
                  className="fact-secondary w-full border border-rule bg-transparent px-3 py-3 focus:border-ink focus:outline-none"
                >
                  <option value="now">AVAILABLE NOW</option>
                  <option value="from_date">FROM A DATE</option>
                  <option value="unavailable">NOT AVAILABLE</option>
                </select>
              </Field>
              <Field
                label="available from"
                hint="only read when set to from a date"
              >
                <TextInput
                  name="availableFrom"
                  type="date"
                  defaultValue={
                    profile.availableFrom
                      ? profile.availableFrom.toISOString().slice(0, 10)
                      : ""
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className="flex items-center gap-3 sm:pt-8">
                <input
                  type="checkbox"
                  name="willingToTravel"
                  defaultChecked={profile.willingToTravel}
                  className="h-4 w-4 accent-ink"
                />
                <span className="text-[15px]">I travel for the right job.</span>
              </label>
              <Field label="travel radius (miles)" hint="optional">
                <TextInput
                  name="travelRadiusMiles"
                  type="number"
                  min={0}
                  placeholder="e.g. 100"
                  defaultValue={profile.travelRadiusMiles ?? ""}
                />
              </Field>
            </div>

            <fieldset>
              <legend className="fact-secondary mb-3">
                crafts · check what you work in, set the level that fits each
              </legend>
              <div className="flex flex-col divide-y divide-rule border-t border-b border-rule">
                {DISCIPLINES.map((d) => (
                  <div
                    key={d}
                    className="flex items-center justify-between gap-4 py-2"
                  >
                    <label className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        name="disc"
                        value={d}
                        defaultChecked={levelByType.has(d)}
                        className="h-4 w-4 shrink-0 accent-ink"
                      />
                      <span className="fact truncate">{d}</span>
                    </label>
                    <select
                      name={`level::${d}`}
                      defaultValue={levelByType.get(d) ?? "professional"}
                      className="fact-secondary border border-rule bg-transparent px-2 py-1.5 focus:border-ink focus:outline-none"
                    >
                      {LEVELS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-secondary">
                Unchecking everything keeps your current crafts; a profile
                never goes craftless from here.
              </p>
            </fieldset>

            <PrimaryButton type="submit">SAVE</PrimaryButton>
          </form>
        </section>
      ) : null}

      {/* Step skip — real step navigation, kept. */}
      {step < STEPS.length ? (
        <section className="mt-10">
          <Rule />
          <p className="mt-4">
            <Link
              className="fact-secondary underline underline-offset-4"
              href={nextStepHref}
            >
              skip this step
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}

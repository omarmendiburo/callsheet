import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { newId } from "@/lib/id";
import { geocodeCity } from "@/lib/geo";
import { DISCIPLINES, LEVELS } from "@/lib/taxonomy";
import {
  ErrorText,
  Field,
  PrimaryButton,
  TextInput,
} from "@/components/ui";

const LEVEL_IDS = LEVELS.map((l) => l.id) as readonly string[];

/*
 * §4.1 talent signup. Short first screen: identity + disciplines + travel.
 * A real signup path (isPlaceholder FALSE). Everything below is validated
 * server-side; client values are never trusted.
 */
async function join(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Disciplines arrive as parallel arrays: a checked discipline name plus its
  // per-row level. Only keep rows whose discipline is in the taxonomy AND whose
  // level is a real level — anything else is a forged client value, dropped.
  const chosen = formData
    .getAll("discipline")
    .map((d) => String(d))
    .filter((d) => (DISCIPLINES as readonly string[]).includes(d));
  const disciplineRows = chosen
    .map((type) => {
      const level = String(formData.get(`level_${type}`) ?? "");
      return { type, level };
    })
    .filter((r) => LEVEL_IDS.includes(r.level));

  const travel = formData.get("travel") === "on";
  const radiusRaw = String(formData.get("travelRadiusMiles") ?? "").trim();
  const radius = travel && radiusRaw ? Number.parseInt(radiusRaw, 10) : null;

  const err = (code: string) => redirect(`/join?error=${code}`);

  if (!name || !email || !password) err("missing");
  if (password.length < 8) err("password");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err("email");
  if (!city) err("city");
  if (disciplineRows.length === 0) err("disciplines");
  if (radius !== null && (!Number.isFinite(radius) || radius <= 0)) err("radius");

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) err("dupe");

  const userId = newId("u");
  const talentId = newId("t");
  const geo = geocodeCity(city);

  await db.insert(schema.users).values({
    id: userId,
    role: "talent",
    email,
    phone: phone || null,
    name,
    passwordHash: hashPassword(password),
  });

  await db.insert(schema.talentProfiles).values({
    id: talentId,
    userId,
    displayName: name,
    city,
    lat: geo?.lat,
    lng: geo?.lng,
    willingToTravel: travel,
    travelRadiusMiles: radius,
    isPlaceholder: false,
  });

  await db.insert(schema.disciplines).values(
    disciplineRows.map((r) => ({
      id: newId("disc"),
      talentId,
      type: r.type,
      level: r.level as (typeof LEVEL_IDS)[number],
    })),
  );

  await createSession(userId);
  redirect("/talent/onboarding");
}

const ERRORS: Record<string, string> = {
  missing: "name, email, and a password are all required.",
  password: "password must be at least 8 characters.",
  email: "that email address doesn't look right.",
  city: "which city do you work out of?",
  disciplines: "pick at least one discipline and a level for it.",
  radius: "travel radius must be a positive number of miles.",
  dupe: "an account with that email already exists.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="fact">
        <Link href="/">Callsheet</Link>
      </p>
      <h1 className="headline mt-10 text-5xl">Get on the callsheet.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        The reel is the résumé. Start with the basics, then build your profile.
        Employers react to the work before they read a name.
      </p>

      <form action={join} className="mt-12 flex flex-col gap-8">
        <Field label="full name">
          <TextInput
            name="name"
            autoComplete="name"
            placeholder="your name"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="email">
            <TextInput
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field label="phone" hint="optional">
            <TextInput
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="619 555 0100"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="city">
            <TextInput
              name="city"
              autoComplete="address-level2"
              placeholder="san diego"
              required
            />
          </Field>
          <Field label="password" hint="8 characters or more">
            <TextInput
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="set a password"
              required
            />
          </Field>
        </div>

        <fieldset>
          <legend className="fact-secondary mb-3">
            disciplines · pick your crafts and a level for each
          </legend>
          <div className="flex flex-col divide-y divide-rule border-t border-b border-rule">
            {DISCIPLINES.map((d) => (
              <label
                key={d}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="discipline"
                    value={d}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className="text-[15px]">{d}</span>
                </span>
                <select
                  name={`level_${d}`}
                  defaultValue="professional"
                  className="fact-secondary w-full border border-rule bg-transparent px-2 py-2 focus:border-ink focus:outline-none sm:w-52"
                >
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-secondary">
            Only the disciplines you check are saved. Level defaults to
            professional.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="travel"
              className="h-4 w-4 accent-ink"
            />
            <span className="text-[15px]">
              I&apos;m willing to travel for work.
            </span>
          </label>
          <Field label="travel radius (miles)" hint="optional">
            <TextInput
              name="travelRadiusMiles"
              type="number"
              min={1}
              placeholder="e.g. 50"
            />
          </Field>
        </fieldset>

        {error ? <ErrorText>{ERRORS[error] ?? "something went wrong."}</ErrorText> : null}

        <PrimaryButton type="submit">CREATE MY PROFILE</PrimaryButton>
      </form>

      <p className="mt-8 text-[13px] text-secondary">
        Already have an account?{" "}
        <Link className="underline underline-offset-2" href="/login">
          log in
        </Link>
        .
      </p>
    </main>
  );
}

import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { newId } from "@/lib/id";
import { geocodeCity } from "@/lib/geo";
import { WORK_TYPES } from "@/lib/taxonomy";
import { ErrorText, Field, PrimaryButton, TextInput } from "@/components/ui";

/*
 * §5.1 org signup. Creates, in one submission: the owner's user (role
 * business), the org, and an owner membership tying them together, then a
 * session and a redirect into /business. Everything below is validated
 * server-side; client values are never trusted. A real path — isPlaceholder
 * stays FALSE.
 */
async function signup(formData: FormData) {
  "use server";

  const orgName = String(formData.get("orgName") ?? "").trim();
  const einRaw = String(formData.get("ein") ?? "").trim();
  const ein = einRaw.replace(/[\s-]/g, "");
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const websiteRaw = String(formData.get("website") ?? "").trim();

  // Work types arrive as repeated checkbox values; keep only real taxonomy
  // members so a forged value can't land in the jsonb column.
  const workTypes = formData
    .getAll("workType")
    .map((w) => String(w))
    .filter((w) => (WORK_TYPES as readonly string[]).includes(w));

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const err = (code: string) => redirect(`/business/signup?error=${code}`);

  if (!orgName || !name || !email || !password) err("missing");
  if (!/^\d{9}$/.test(ein)) err("ein");
  if (workTypes.length === 0) err("worktypes");
  if (!city) err("city");
  if (password.length < 8) err("password");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err("email");

  // Website is optional but if given must be a real http(s) URL.
  let website: string | null = null;
  if (websiteRaw) {
    if (!/^https?:\/\/\S+$/i.test(websiteRaw)) err("website");
    website = websiteRaw;
  }

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing.length > 0) err("dupe");

  const userId = newId("u");
  const orgId = newId("org");
  const geo = geocodeCity(city);
  const fullAddress = address ? `${address}, ${city}` : city;

  await db.insert(schema.users).values({
    id: userId,
    role: "business",
    email,
    phone: phone || null,
    name,
    passwordHash: hashPassword(password),
  });

  await db.insert(schema.orgs).values({
    id: orgId,
    name: orgName,
    ein,
    address: fullAddress,
    lat: geo?.lat,
    lng: geo?.lng,
    workTypes,
    website,
    verified: false,
    isPlaceholder: false,
  });

  await db.insert(schema.memberships).values({
    id: newId("mem"),
    userId,
    orgId,
    role: "owner",
  });

  await createSession(userId);
  redirect("/business");
}

const ERRORS: Record<string, string> = {
  missing: "business name, your name, email, and a password are all required.",
  ein: "the ein must be nine digits (with or without a dash).",
  worktypes: "pick at least one type of work.",
  city: "which city does the organization work out of?",
  password: "password must be at least 8 characters.",
  email: "that email address doesn't look right.",
  website: "the website must start with http:// or https://.",
  dupe: "an account with that email already exists.",
};

export default async function BusinessSignupPage({
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
      <h1 className="headline mt-10 text-5xl">Bring your organization.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        Set up the org, add your seats later, and post projects. You describe
        the work. A ranked, human-reviewed team comes back.
      </p>

      <form action={signup} className="mt-12 flex flex-col gap-8">
        <fieldset className="flex flex-col gap-8">
          <legend className="fact-secondary mb-1">the organization</legend>

          <Field label="business name">
            <TextInput
              name="orgName"
              placeholder="e.g. harbor light fund"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Field label="ein" hint="nine digits, dash optional">
              <TextInput name="ein" placeholder="12-3456789" required />
            </Field>
            <Field label="website" hint="optional">
              <TextInput
                name="website"
                type="url"
                placeholder="https://"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="fact-secondary mb-3">
              types of work · pick everything that fits
            </legend>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map((w) => (
                <label key={w} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="workType"
                    value={w}
                    className="peer sr-only"
                  />
                  <span className="fact block border border-rule bg-paper px-2 py-1.5 text-secondary transition-opacity duration-150 hover:opacity-80 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                    {w}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Field label="street address" hint="optional">
              <TextInput
                name="address"
                autoComplete="street-address"
                placeholder="e.g. 100 harbor dr"
              />
            </Field>
            <Field label="city">
              <TextInput
                name="city"
                autoComplete="address-level2"
                placeholder="san diego"
                required
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-8">
          <legend className="fact-secondary mb-1">your account · the owner</legend>

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

          <Field label="password" hint="8 characters or more">
            <PasswordInput
              name="password"
              autoComplete="new-password"
              placeholder="set a password"
              required
            />
          </Field>
        </fieldset>

        {error ? (
          <ErrorText>{ERRORS[error] ?? "something went wrong."}</ErrorText>
        ) : null}

        <PrimaryButton type="submit">CREATE THE ORGANIZATION</PrimaryButton>
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

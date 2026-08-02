import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { ErrorText, Field, PrimaryButton, TextInput } from "@/components/ui";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");

  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  const user = rows[0];
  if (!user || user.suspended || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=bad");
  }
  await createSession(user.id);
  redirect(`/${user.role}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <h1 className="headline mt-6 text-5xl">Log in.</h1>
      <form action={login} className="mt-10 flex flex-col gap-6">
        <Field label="email">
          <TextInput
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="password">
          <TextInput
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="your password"
            required
          />
        </Field>
        {error ? (
          <ErrorText>
            {error === "missing"
              ? "email and password are both required."
              : "that email and password don't match."}
          </ErrorText>
        ) : null}
        <PrimaryButton type="submit">LOG IN</PrimaryButton>
      </form>
      <p className="mt-8 text-[13px] text-secondary">
        No account yet? Join as a{" "}
        <Link className="underline underline-offset-2" href="/join">
          creative
        </Link>{" "}
        or bring your{" "}
        <Link className="underline underline-offset-2" href="/business/signup">
          organization
        </Link>
        .
      </p>
      </main>
    </>
  );
}

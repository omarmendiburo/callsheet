import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  hashPassword,
  verifyPasswordResetToken,
} from "@/lib/auth";
import { Nav } from "@/components/nav";
import { ErrorText, Field, PrimaryButton } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

/* Set a new password from a valid reset link. The token is re-verified inside
 * the action — the form is never trusted. */

async function resetPassword(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyPasswordResetToken(token);
  if (!user) redirect("/reset?error=expired");
  if (password.length < 8)
    redirect(`/reset?token=${encodeURIComponent(token)}&error=short`);
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(schema.users.id, user.id));
  redirect("/login?reset=1");
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const user = token ? await verifyPasswordResetToken(token) : null;

  return (
    <>
      <Nav primary={false} />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <h1 className="headline mt-6 text-5xl">New password.</h1>
        {!user ? (
          <div className="mt-8">
            <p className="text-[15px] leading-relaxed">
              This reset link is invalid, expired, or was already used.
            </p>
            <p className="mt-4">
              <Link
                className="fact underline underline-offset-4"
                href="/forgot"
              >
                request a fresh one
              </Link>
            </p>
          </div>
        ) : (
          <form action={resetPassword} className="mt-8 flex flex-col gap-6">
            <p className="text-[15px] text-secondary">
              Setting a new password for {user.email}.
            </p>
            <input type="hidden" name="token" value={token} />
            <Field label="new password" hint="at least 8 characters">
              <PasswordInput
                name="password"
                autoComplete="new-password"
                placeholder="pick something strong"
                required
                minLength={8}
              />
            </Field>
            {error === "short" ? (
              <ErrorText>at least 8 characters, please.</ErrorText>
            ) : null}
            <PrimaryButton type="submit">SET PASSWORD</PrimaryButton>
          </form>
        )}
      </main>
    </>
  );
}

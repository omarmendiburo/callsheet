import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { Nav } from "@/components/nav";
import { Field, PrimaryButton, TextInput } from "@/components/ui";

/*
 * Forgot password. Response is identical whether or not the email exists —
 * no account enumeration. With RESEND_API_KEY set, the reset link is emailed
 * to the user; without it (local pilot), the link is logged server-side and
 * HMNTY staff can generate one from the admin back office instead.
 */

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email) {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    const user = rows[0];
    if (user && !user.suspended) {
      const h = await headers();
      const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
      const link = `${origin}/reset?token=${createPasswordResetToken(user)}`;
      const delivered = await sendEmail(
        user.email,
        "Reset your Callsheet password",
        `Someone asked to reset the password for this account. If that was you, use this link within 30 minutes:\n\n${link}\n\nIf it was not you, ignore this email. Nothing changes until the link is used.`,
      );
      if (!delivered) {
        console.log(`[reset] not delivered; link for ${user.email}: ${link}`);
      }
    }
  }
  redirect("/forgot?sent=1");
}

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);
  return (
    <>
      <Nav primary={false} />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <h1 className="headline mt-6 text-5xl">Reset it.</h1>
        {sent ? (
          <div className="mt-8 border-l border-ink pl-4">
            <p className="text-[15px] leading-relaxed">
              If that email has an account, a reset link is on its way. It
              works for 30 minutes.
            </p>
            {!emailConfigured ? (
              <p className="mt-2 text-[13px] text-secondary">
                Email is not wired up in the pilot yet. HMNTY staff can hand
                you a reset link directly.
              </p>
            ) : null}
          </div>
        ) : (
          <form action={requestReset} className="mt-8 flex flex-col gap-6">
            <Field label="the email on your account">
              <TextInput
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </Field>
            <PrimaryButton type="submit">SEND RESET LINK</PrimaryButton>
          </form>
        )}
      </main>
    </>
  );
}

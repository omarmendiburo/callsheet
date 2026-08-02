import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Rule, TextInput, PrimaryButton, ErrorText } from "@/components/ui";
import { deleteOwnAccount } from "../_actions";

/*
 * Talent settings — currently one thing: leaving (owner's ask 2026-08-02).
 * Deletion is irreversible and wipes the profile, work, and applications, so
 * it is gated behind typing DELETE. Not a one-click button.
 */
export const dynamic = "force-dynamic";

export default async function TalentSettings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser("talent");
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="fact-secondary">talent · settings</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">Settings.</h1>

      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">leave callsheet</h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed">
          Deleting your account removes your profile, your work, and every
          application, everywhere, for good. There is no undo. If you just want
          a break, log out instead.
        </p>
        <form action={deleteOwnAccount} className="mt-6 flex flex-col gap-4">
          <label className="block max-w-xs">
            <span className="fact-secondary mb-2 block">
              type DELETE to confirm
            </span>
            <TextInput name="confirm" placeholder="DELETE" autoComplete="off" />
          </label>
          {error === "confirm" ? (
            <ErrorText>type DELETE exactly to confirm.</ErrorText>
          ) : null}
          <div className="max-w-xs">
            <PrimaryButton type="submit">DELETE MY ACCOUNT</PrimaryButton>
          </div>
        </form>
        <p className="mt-6 text-[13px] text-secondary">
          Changed your mind?{" "}
          <Link className="underline underline-offset-4" href="/talent">
            back to your dashboard
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

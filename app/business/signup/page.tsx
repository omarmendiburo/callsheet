import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { SignupForm } from "./SignupForm";

/*
 * §5.1 org signup shell. The form and its mutation live in SignupForm /
 * _actions.ts — client-side action state so validation errors never wipe the
 * filled form (owner's bug report 2026-08-02).
 *
 * One account is either a creative or an organization (role-per-user). A
 * signed-in creative gets an honest block instead of quietly making a second
 * account (owner's report 2026-08-02); a signed-in business owner goes home.
 */
export const dynamic = "force-dynamic";

export default async function BusinessSignupPage() {
  const user = await getCurrentUser();
  if (user?.role === "business") redirect("/business");
  if (user?.role === "admin") redirect("/admin");

  if (user?.role === "talent") {
    return (
      <>
        <Nav primary={false} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
          <p className="fact-secondary">signup</p>
          <h1 className="headline mt-3 text-5xl">Oops.</h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed">
            You&rsquo;re already registered as a creative. One account is either
            a creative or an organization, not both. To bring an organization
            onto Callsheet, log out and sign up with a separate account.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              className="fact bg-ink px-5 py-3 text-paper transition-opacity duration-150 hover:opacity-80"
              href="/talent"
            >
              back to my dashboard
            </Link>
            <a
              className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
              href="/logout"
            >
              log out to register an organization
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav primary={false} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="headline text-5xl">Bring your organization.</h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
          Set up the org, add your seats later, and post projects. You describe
          the work. A ranked, human-reviewed team comes back.
        </p>

        <SignupForm />

        <p className="mt-8 text-[13px] text-secondary">
          Already have an account?{" "}
          <Link className="underline underline-offset-2" href="/login">
            log in
          </Link>
          .
        </p>
      </main>
    </>
  );
}

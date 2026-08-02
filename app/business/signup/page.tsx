import Link from "next/link";
import { Nav } from "@/components/nav";
import { SignupForm } from "./SignupForm";

/*
 * §5.1 org signup shell. The form and its mutation live in SignupForm /
 * _actions.ts — client-side action state so validation errors never wipe the
 * filled form (owner's bug report 2026-08-02).
 */
export default function BusinessSignupPage() {
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

import Link from "next/link";
import { Nav } from "@/components/nav";

const DOORS = [
  {
    href: "/join",
    title: "Create.",
    line: "Build one profile that carries your reel, your rates, and your availability. Matched work finds you.",
    cta: "JOIN AS A CREATIVE",
  },
  {
    href: "/business/signup",
    title: "We hire crews.",
    line: "Describe the project. Get a ranked, human-reviewed team of local creatives ready to work.",
    cta: "BRING YOUR ORGANIZATION",
  },
] as const;

export default function SignupPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <h1 className="headline text-6xl sm:text-8xl">
          Get on the <span className="text-accent">callsheet.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-secondary">
          Two doors, one network. Pick yours.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden border border-rule sm:mt-20 sm:grid-cols-2">
          {DOORS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex min-h-[44vh] flex-col justify-between gap-8 bg-paper p-10 transition-colors duration-150 hover:bg-sunken sm:p-14"
            >
              <span className="headline text-5xl sm:text-6xl">{d.title}</span>
              <div className="flex flex-col gap-6">
                <span className="max-w-sm text-[17px] leading-relaxed">
                  {d.line}
                </span>
                <span className="fact text-accent underline underline-offset-4">
                  {d.cta} &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-[15px] text-secondary">
          Already have an account?{" "}
          <Link className="text-accent underline underline-offset-4" href="/login">
            Log in
          </Link>
          .
        </p>
      </main>
    </>
  );
}

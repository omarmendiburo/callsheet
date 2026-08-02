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
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:px-10">
        <h1 className="headline text-6xl sm:text-7xl">Get on the callsheet.</h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed">
          Two doors, one network. Pick yours.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
          {DOORS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex flex-col gap-4 border-t border-ink pt-6 transition-opacity duration-150 hover:opacity-70"
            >
              <span className="headline text-4xl">{d.title}</span>
              <span className="text-[16px] leading-relaxed">{d.line}</span>
              <span className="fact mt-2 underline underline-offset-4">
                {d.cta}
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-14 text-[15px] text-secondary">
          Already have an account?{" "}
          <Link className="underline underline-offset-4" href="/login">
            Log in
          </Link>
          .
        </p>
      </main>
    </>
  );
}

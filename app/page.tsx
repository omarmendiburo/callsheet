import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Rule } from "@/components/ui";

const DOORS = [
  {
    href: "/talent",
    role: "Talent",
    line: "One profile, your reel up front. Matched work finds you.",
    cta: "GET ON THE CALLSHEET",
  },
  {
    href: "/business",
    role: "Business",
    line: "Describe the project. Get a ranked, human-reviewed team.",
    cta: "BUILD A TEAM",
  },
  {
    href: "/admin",
    role: "Admin",
    line: "Keep the ecosystem healthy. Measure the impact.",
    cta: "RUN THE ECOSYSTEM",
  },
] as const;

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto w-full max-w-350 flex-1 px-6 py-10 sm:px-10">
      <header className="flex items-baseline justify-between">
        <p className="fact">Callsheet</p>
        <p className="fact-secondary">
          {user ? (
            <Link href={`/${user.role}`}>{user.name}</Link>
          ) : (
            <Link href="/login">log in</Link>
          )}
        </p>
      </header>

      <section className="py-20 sm:py-28">
        <h1 className="headline text-[17vw] leading-none sm:text-[9rem]">
          The creative
          <br />
          workforce OS.
        </h1>
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed">
          Creatives find and land paid work. Businesses build project teams.
          AI sits in the middle, matching people to opportunity instead of
          making them search. A person approves every booking.
        </p>
      </section>

      <Rule />

      <section className="grid grid-cols-1 sm:grid-cols-3">
        {DOORS.map((d, i) => (
          <Link
            key={d.href}
            href={d.href}
            className={`group flex flex-col gap-4 py-10 transition-opacity duration-150 hover:opacity-80 sm:px-8 ${
              i > 0 ? "border-t border-rule sm:border-t-0" : ""
            }`}
          >
            <span className="fact-secondary">{`0${i + 1}`}</span>
            <span className="headline text-4xl">{d.role}</span>
            <span className="text-[15px] leading-relaxed">{d.line}</span>
            <span className="fact mt-auto underline underline-offset-4">
              {d.cta}
            </span>
          </Link>
        ))}
      </section>

      <Rule />

      <footer className="flex items-baseline justify-between py-6">
        <p className="fact-secondary">San Diego · pilot</p>
        <p className="fact-secondary">Built at the Future of Work Hack-AI-thon</p>
      </footer>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Rule } from "@/components/ui";

const DOORS = [
  {
    href: "/join",
    role: "Talent",
    line: "One profile, your reel up front. Matched work finds you.",
    cta: "GET ON THE CALLSHEET",
  },
  {
    href: "/business/signup",
    role: "Business",
    line: "Describe the project. Get a ranked, human-reviewed team.",
    cta: "BUILD A TEAM",
  },
  {
    href: "/screen-tests",
    role: "Screen Tests",
    line: "Ten-second pitches from local creatives. No names, just the work.",
    cta: "WATCH THE FEED",
  },
] as const;

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-350 flex-1 px-6 pb-10 sm:px-10">
        <section className="grid grid-cols-1 items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <h1 className="headline text-6xl sm:text-8xl">
              The creative
              <br />
              workforce OS.
            </h1>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed">
              Creatives find and land paid work. Businesses build project
              teams. AI sits in the middle, matching people to opportunity
              instead of making them search. A person approves every booking.
            </p>
            <div className="mt-8 flex items-center gap-6">
              <Link
                href="/signup"
                className="fact bg-ink px-5 py-4 text-paper transition-opacity duration-150 hover:opacity-80"
              >
                SIGN UP
              </Link>
              <Link
                href="/about"
                className="fact-secondary underline underline-offset-4"
              >
                why we built this
              </Link>
            </div>
          </div>
          <figure className="border border-ink">
            <Image
              src="/dashboard-talent.png"
              alt="The dashboard a creative sees: matched jobs, profile, applications"
              width={1280}
              height={860}
              priority
              className="w-full"
            />
            <figcaption className="fact-secondary border-t border-rule px-4 py-3">
              the real dashboard a creative sees
            </figcaption>
          </figure>
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

        <footer className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="fact-secondary">San Diego · pilot</p>
          <p className="fact-secondary">
            Built with{" "}
            <a
              className="underline underline-offset-2"
              href="https://www.hmntystudios.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              HMNTY Studios
            </a>{" "}
            at the Future of Work Hack-AI-thon
          </p>
        </footer>
      </main>
    </>
  );
}

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Rule } from "@/components/ui";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:px-10">
        <h1 className="headline text-6xl sm:text-7xl">
          Talent is everywhere.
          <br />
          Opportunity is not.
        </h1>

        <div className="mt-10 flex flex-col gap-6 text-[17px] leading-relaxed">
          <p>
            Callsheet is built by{" "}
            <a
              className="underline underline-offset-4"
              href="https://www.hmntystudios.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              HMNTY Studios
            </a>
            , a nonprofit social enterprise film studio. Every HMNTY production
            doubles as a training ground: apprentices earn real credits and real
            pay working alongside professional crew. Two years of that work
            taught us something simple. The biggest barrier creatives face is
            not talent and it is not training. It is finding meaningful paid
            work.
          </p>
          <p>
            Too often, a career in film and media depends on who you know,
            where you live, or whether you can afford to work for free. Jobs
            hide in group chats, referrals, and spreadsheets. Creatives spend
            their hours searching instead of creating, and employers spend
            weeks finding people who were nearby the whole time.
          </p>
          <p>
            Callsheet is the engine we are building to change that: one
            intelligent profile that represents your work, employers who
            describe a project and get a credible team, and new kinds of
            flexible work that let a production employ a hundred contributors
            instead of ten.
          </p>
        </div>

        <div className="my-10">
          <Rule />
        </div>

        <h2 className="headline text-4xl">Where AI stands with us.</h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed">
          AI here expands access to opportunity. It reads portfolios, ranks
          candidates, and always shows its reasoning. It never rejects a
          person, never contacts anyone on its own, and never makes a booking.
          People decide. Success is measured in paid jobs created, wages
          earned, and careers started, not in clicks.
        </p>

        <div className="my-10">
          <Rule />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-[17px]">Ready to get on the callsheet?</p>
          <p className="flex gap-6">
            <Link className="fact underline underline-offset-4" href="/join">
              join as a creative
            </Link>
            <Link
              className="fact underline underline-offset-4"
              href="/business/signup"
            >
              bring your organization
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

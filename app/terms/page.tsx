import Link from "next/link";
import { Nav } from "@/components/nav";
import { Rule } from "@/components/ui";

/*
 * Interim terms of use (audit H-7, owner's go 2026-08-02). House rules in
 * plain English, split by role, written from what the product actually does.
 * Not legal drafting: HMNTY's counsel replaces this text; the acceptance
 * version in lib/legal.ts bumps when they do. Keep every claim true of the
 * code or change the code.
 */

const CREATIVE_RULES = [
  "Your profile is yours and must be true: your own name, your own work, links you have the right to share. Placeholder or impersonated profiles are removed.",
  "Approved work displays on Callsheet's browsing surfaces without your name; your name shows when an organization opens your full profile. Joining means you are fine with both.",
  "Every piece you register is reviewed by a person before it becomes visible, and can be flagged or removed after review too.",
  "Callsheet suggests and introduces; it does not employ you, book you, or guarantee work. Rates, terms, and the job itself are between you and the organization.",
  "Accounts that harass people, misrepresent work, or game rankings get suspended. Suspension takes your profile off every surface immediately.",
];

const BUSINESS_RULES = [
  "Your organization's account speaks for the organization: seats you add act in its name, and owners are responsible for their team's conduct.",
  "Verification is required before your projects reach creatives; what you post is reviewed the same way creatives' work is.",
  "Creatives' names, rates, and contact details are for hiring on real projects, not for scraping, reselling, or contacting people outside that purpose.",
  "The AI ranks and explains; it never decides. Treat suggestions as suggestions, and treat every creative as a person you may work with again.",
  "Bookings, payment, and working terms happen between you and the creative. Callsheet introduces; it is not a party to the engagement.",
];

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="fact-secondary">callsheet · terms of use</p>
        <h1 className="headline mt-6 text-6xl">House rules.</h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed">
          These are the pilot's working terms, in plain English, split by how
          you use Callsheet. Formal terms are being prepared with counsel and
          will replace this page; you will be asked to accept them when they
          arrive. By joining, you agree to the rules below and to{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href="/privacy"
          >
            how we handle your data
          </Link>
          .
        </p>

        <div className="mt-10">
          <Rule />
        </div>

        <section className="mt-8">
          <h2 className="fact-secondary">if you are a creative</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {CREATIVE_RULES.map((r) => (
              <li key={r} className="max-w-xl text-[15px] leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          <Rule />
        </div>

        <section className="mt-8">
          <h2 className="fact-secondary">if you are an organization</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {BUSINESS_RULES.map((r) => (
              <li key={r} className="max-w-xl text-[15px] leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12">
          <Rule />
        </div>
        <p className="mt-6 max-w-xl text-[13px] leading-relaxed text-secondary">
          Interim terms, last updated August 2, 2026. Questions: tell the HMNTY
          team. Leaving is always available; ask and your account and data are
          removed.
        </p>
      </main>
    </>
  );
}

import { Nav } from "@/components/nav";
import { Rule } from "@/components/ui";

/*
 * Interim plain-English data notice (audit H-7, shipped on owner's go
 * 2026-08-02). This is truthful product copy, not legal drafting: the real
 * Terms of Use and Privacy Policy are being prepared with HMNTY's counsel
 * and will replace this page with a per-role acceptance step. Every claim
 * below is checked against the code before it ships; if the product changes,
 * this page changes in the same commit.
 */

const SECTIONS: { label: string; body: string[] }[] = [
  {
    label: "what we collect",
    body: [
      "Creatives: your name, email, phone if you give it, city, travel preference, crafts and levels, rates, links to work you already published elsewhere, and your profile answers.",
      "Businesses: organization name, EIN, website, address if given, city, and the account holder's name, email, and phone.",
    ],
  },
  {
    label: "where your name shows",
    body: [
      "Browsing surfaces never show your name. The wall, reels, and screen tests show your work, craft, city, rates, and availability with no name attached.",
      "Your name appears only when a business opens your full profile, and inside that business's own pipeline after they save or contact you.",
    ],
  },
  {
    label: "a person approves everything",
    body: [
      "Nothing you submit is visible to anyone until a person on the HMNTY team approves it. Removed or flagged work never shows.",
    ],
  },
  {
    label: "what the AI sees",
    body: [
      "We use AI to rank and suggest matches. It reads work facts only: craft, level, rates, distance, and availability. It never sees your name, and it never decides anything. People decide.",
    ],
  },
  {
    label: "cookies and email",
    body: [
      "One cookie keeps you signed in. No ad trackers.",
      "We use your email to run your account, like password resets. No marketing lists.",
    ],
  },
  {
    label: "leaving",
    body: [
      "Ask any HMNTY team member and we remove your profile and your data.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="fact-secondary">callsheet · data notice</p>
        <h1 className="headline mt-6 text-6xl">Your data, plainly.</h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed">
          This is the pilot's plain-English notice: what we collect, where it
          shows, and who decides. Full terms of use and a formal privacy
          policy are being prepared with counsel; when they are ready, you
          will be asked to read and accept them.
        </p>

        <div className="mt-10">
          <Rule />
        </div>

        <div className="mt-8 flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.label}>
              <h2 className="fact-secondary">{s.label}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-3 max-w-xl text-[15px] leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12">
          <Rule />
        </div>
        <p className="mt-6 max-w-xl text-[13px] leading-relaxed text-secondary">
          Interim notice, last updated August 2, 2026. Questions or removal
          requests: tell the HMNTY team and it gets handled.
        </p>
      </main>
    </>
  );
}

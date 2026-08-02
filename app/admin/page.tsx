import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { AdminShell } from "./_shell";
import { getOverview, usd } from "./_data";

/*
 * Admin overview (spec §6). One labeled grid of live counts, then applications
 * by status, then estimated wages. Every stat uses the same number treatment
 * (text-3xl tabular sans) so the eye can scan a column. "Estimated wages
 * booked" is labeled an estimate — it is the sum of dayRateOnset across booked
 * applications and assumes one on-set day per booking.
 */

// Always render fresh — these are live operational counts, never cached.
export const dynamic = "force-dynamic";

function Stat({
  value,
  label,
  href,
}: {
  value: string | number;
  label: string;
  href?: string;
}) {
  const body = (
    <div className="border border-rule p-5">
      <div className="text-3xl leading-none tracking-tight tabular-nums">
        {value}
      </div>
      <div className="fact-secondary mt-3">{label}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-opacity duration-150 hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

const APP_STATUSES = [
  "applied",
  "viewed",
  "shortlisted",
  "booked",
  "declined",
] as const;

export default async function AdminOverview() {
  await requireUser("admin");
  const o = await getOverview();

  return (
    <AdminShell active="/admin">
      <p className="fact-secondary">back office · overview</p>
      <h1 className="headline mt-3 text-4xl sm:text-5xl">HMNTY back office.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        Live counts from the database. Every figure is exactly what its label
        says. Tap a number to open its section.
      </p>

      <section className="mt-10">
        <h2 className="fact-secondary">platform counts</h2>
        <div className="mt-4">
          <Rule />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat value={o.talentCount} label="talent profiles" href="/admin/certification" />
          <Stat
            value={o.orgCount}
            label={`businesses / orgs (${o.orgsVerified} verified)`}
            href="/admin/users"
          />
          <Stat value={o.openProjects} label="open projects" href="/admin/metrics" />
          <Stat value={o.bookedPlacements} label="booked placements" href="/admin/metrics" />
          <Stat value={o.pendingMedia} label="media pending review" href="/admin/moderation" />
          <Stat value={o.flaggedMedia} label="media flagged" href="/admin/moderation" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="fact-secondary">applications by status</h2>
        <div className="mt-4">
          <Rule />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {APP_STATUSES.map((s) => (
            <div key={s} className="border border-rule p-5">
              <div className="text-3xl leading-none tracking-tight tabular-nums">
                {o.applicationsByStatus[s] ?? 0}
              </div>
              <div className="fact-secondary mt-3">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="fact-secondary">estimated wages booked</h2>
        <div className="mt-4">
          <Rule />
        </div>
        <div className="mt-4 text-3xl leading-none tracking-tight tabular-nums">
          {usd(o.estimatedWagesBooked)}
        </div>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-secondary">
          Estimate only. Sum of each booked application&rsquo;s project on-set
          day rate (dayRateOnset). Assumes one on-set day per booking; excludes
          post-production hourly and multi-day shoots. Not billed, not settled.
        </p>
      </section>
    </AdminShell>
  );
}

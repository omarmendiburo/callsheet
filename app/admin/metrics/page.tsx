import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { AdminShell } from "../_shell";
import { getMetrics, usd } from "../_data";

/*
 * Impact scoreboard (spec §11), computed honestly from the DB. No charts — mono
 * numbers and rules only. Every figure carries a one-line definition of exactly
 * what it counts and, where it is an estimate, that it is one.
 */

export const dynamic = "force-dynamic";

function MetricRow({
  value,
  label,
  note,
}: {
  value: string | number;
  label: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-rule py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <div className="max-w-md">
        <div className="text-[15px]">{label}</div>
        <div className="fact-secondary mt-1 normal-case tracking-normal">
          {note}
        </div>
      </div>
      <div className="font-serif text-3xl leading-none tabular-nums shrink-0">
        {value}
      </div>
    </div>
  );
}

export default async function AdminMetrics() {
  await requireUser("admin");
  const m = await getMetrics();

  const avgApps =
    m.avgApplicationsPerProject == null
      ? "—"
      : m.avgApplicationsPerProject.toFixed(1);

  return (
    <AdminShell active="/admin/metrics">
      <h1 className="headline mt-10 text-4xl">Impact.</h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed">
        The scoreboard, computed live from the database. Every number is labeled
        with exactly what it counts. Nothing here is projected or padded.
      </p>

      <section className="mt-10">
        <h2 className="fact-secondary">workforce</h2>
        <div className="mt-2 border-t border-rule">
          <MetricRow
            value={m.bookedPlacements}
            label="booked placements"
            note="count of applications currently in status booked"
          />
          <MetricRow
            value={usd(m.estimatedWagesBooked)}
            label="estimated wages booked"
            note="estimate: sum of dayRateOnset across booked applications; one on-set day assumed per booking, post-production hourly excluded"
          />
          <MetricRow
            value={m.firstTimePlacements}
            label="first-time placements"
            note="talent with exactly one booked application to date"
          />
        </div>
      </section>

      <div className="mt-10">
        <Rule />
      </div>

      <section className="mt-8">
        <h2 className="fact-secondary">employer</h2>
        <div className="mt-2 border-t border-rule">
          <MetricRow
            value={`${m.projectsWithBooking} / ${m.totalProjects}`}
            label="projects with at least one booking"
            note="distinct projects that have one or more booked applications, over all projects"
          />
          <MetricRow
            value={avgApps}
            label="avg applications per project"
            note="total applications divided by total projects (all statuses)"
          />
        </div>
      </section>

      <div className="mt-10">
        <Rule />
      </div>

      <section className="mt-8">
        <h2 className="fact-secondary">platform</h2>
        <div className="mt-2 border-t border-rule">
          <MetricRow
            value={`${m.activeTalent} / ${m.totalTalent}`}
            label="active talent"
            note="talent with at least one approved media item, over all talent profiles"
          />
          <MetricRow
            value={`${m.activeOrgs} / ${m.totalOrgs}`}
            label="active orgs"
            note="orgs that have posted at least one project, over all orgs"
          />
          <MetricRow
            value={`${m.openProjects} open / ${m.closedProjects} closed`}
            label="projects by status"
            note="draft projects excluded from this line"
          />
        </div>
      </section>
    </AdminShell>
  );
}

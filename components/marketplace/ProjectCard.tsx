import { Rule } from "@/components/ui";
import type { Application, ProjectWithOrg } from "./_data";
import { ApplyForm } from "./ApplyForm";

/*
 * A job-board card (spec §4.3). Title is a BOLD INTER heading, not Anton —
 * Anton below 32px is a bug, and card titles are card-sized. Anton is saved
 * for the page headline. Org name in Inter, then every job fact in mono:
 * roles needed, location + remote-ok, rates, timeline, BYO gear.
 *
 * If the talent has already applied, the apply affordance is replaced by their
 * current application status in mono. Otherwise the ApplyForm renders.
 */

const BYO_GEAR_LABEL: Record<string, string> = {
  not_needed: "gear provided",
  preferred: "own gear preferred",
  required: "own gear required",
};

function fmtDate(d: Date | string | null): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function timelineLine(
  start: Date | string | null,
  end: Date | string | null,
): string {
  const s = fmtDate(start);
  const e = fmtDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `from ${s}`;
  if (e) return `by ${e}`;
  return "timeline tbd";
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="fact-secondary shrink-0">{label}</span>
      <span className="fact text-right">{value}</span>
    </div>
  );
}

export function ProjectCard({
  data,
  application,
}: {
  data: ProjectWithOrg;
  application: Application | null;
}) {
  const { project, orgName } = data;

  /* Per-role terms (rate, gear, remote live on each role now). Legacy
   * projects without per-role data fall back to the project-level columns. */
  const roleLine = (r: (typeof project.rolesNeeded)[number]): string => {
    const parts: string[] = [];
    if (r.dayRate != null) parts.push(`$${r.dayRate}/day`);
    if (r.hourlyPost != null) parts.push(`$${r.hourlyPost}/hr post`);
    if (parts.length === 0) {
      if (project.dayRateOnset != null)
        parts.push(`$${project.dayRateOnset}/day`);
      else parts.push("rate on request");
    }
    const gear = r.byoGear ?? project.byoGear;
    if (gear && gear !== "not_needed")
      parts.push(BYO_GEAR_LABEL[gear] ?? gear);
    if (r.remote ?? project.remoteOk) parts.push("remote ok");
    return parts.join(" · ");
  };

  return (
    <article className="border border-rule p-6">
      <p className="fact-secondary">{project.type}</p>
      <h2 className="mt-2 text-[19px] font-semibold leading-tight">
        {project.title}
      </h2>
      <p className="mt-1 text-[15px] text-secondary">{orgName}</p>

      <div className="mt-4">
        <Rule />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {project.rolesNeeded.length > 0 ? (
          project.rolesNeeded.map((r, i) => (
            <Fact
              key={i}
              label={r.count > 1 ? `${r.discipline} ×${r.count}` : r.discipline}
              value={roleLine(r)}
            />
          ))
        ) : (
          <Fact label="roles" value="roles tbd" />
        )}
        <Fact label="where" value={project.location} />
        <Fact
          label="timeline"
          value={timelineLine(project.timelineStart, project.timelineEnd)}
        />
      </div>

      {application ? (
        <>
          <p className="fact mt-5 border border-ink px-3 py-2 text-center">
            applied · {application.status}
          </p>
          {application.status === "booked" ? (
            <p className="mt-2 text-center text-[13px] leading-relaxed text-secondary">
              you are on the callsheet. HMNTY makes the introduction.
            </p>
          ) : application.status === "declined" ? (
            <p className="mt-2 text-center text-[13px] leading-relaxed text-secondary">
              not a fit for this one. new work posts all the time.
            </p>
          ) : null}
        </>
      ) : (
        <ApplyForm projectId={project.id} />
      )}
    </article>
  );
}

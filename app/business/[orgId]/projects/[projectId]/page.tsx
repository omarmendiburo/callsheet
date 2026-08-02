import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import {
  getOrgForUser,
  getOrgProject,
  getProjectApplications,
  type ApplicationRow,
} from "../../../_data";
import { transitionApplication } from "../../../_actions";

/*
 * §5.3 project detail. getOrgForUser + getOrgProject(orgId, …) are the two
 * isolation gates — a non-member gets notFound(), and a project id that
 * belongs to another org resolves to null, also notFound(). Status transitions
 * are manager+ only; viewers see the applications read-only.
 */

const FORWARD_LABEL: Record<string, { target: string; label: string } | null> =
  {
    applied: { target: "viewed", label: "mark viewed" },
    viewed: { target: "shortlisted", label: "shortlist" },
    shortlisted: { target: "booked", label: "book" },
    booked: null,
    declined: null,
  };

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  const user = await requireUser("business");
  const active = await getOrgForUser(user.id, orgId);
  if (!active) notFound();

  const { org, role } = active;
  const project = await getOrgProject(org.id, projectId);
  if (!project) notFound();

  const canManage = role === "owner" || role === "manager";
  const applications = await getProjectApplications(project.id);
  const booked = applications.filter((a) => a.status === "booked");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="fact-secondary">
        business · {org.name} · {project.type} · {project.status}
      </p>
      <p className="mt-3">
        <Link
          className="fact-secondary underline underline-offset-4"
          href={`/business/${org.id}`}
        >
          all projects
        </Link>
      </p>

      <h1 className="headline mt-4 text-4xl sm:text-5xl">{project.title}</h1>

      {/* Booked is the celebration state — plain, per DESIGN voice. */}
      {booked.length > 0 ? (
        <p className="fact mt-6 border border-ink px-3 py-3">
          booked. the callsheet has a name on it. HMNTY reaches out to
          coordinate the introduction.
        </p>
      ) : null}

      <section className="mt-10">
        <p className="fact-secondary">the facts</p>
        <div className="mt-4">
          <Rule />
        </div>
        <dl className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
        <Fact label="location">{project.location}</Fact>
        <Fact label="timeline">
          {fmtDate(project.timelineStart)} → {fmtDate(project.timelineEnd)}
        </Fact>
        </dl>
      </section>

      {/* Per-role terms: each role carries its own rate, gear, and remote. */}
      <section className="mt-10">
        <p className="fact-secondary">the roles</p>
        <div className="mt-4">
          <Rule />
        </div>
        <dl className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
          {(project.rolesNeeded ?? []).length > 0 ? (
            (project.rolesNeeded ?? []).map((r, i) => {
              const parts: string[] = [];
              if (r.level) parts.push(r.level);
              if (r.dayRate != null) parts.push(`$${r.dayRate}/day on set`);
              else if (project.dayRateOnset != null)
                parts.push(`$${project.dayRateOnset}/day on set`);
              if (r.hourlyPost != null) parts.push(`$${r.hourlyPost}/hr post`);
              else if (project.hourlyPostprod != null)
                parts.push(`$${project.hourlyPostprod}/hr post`);
              const gear = r.byoGear ?? project.byoGear;
              parts.push(
                gear === "not_needed"
                  ? "gear provided"
                  : gear === "preferred"
                    ? "own gear preferred"
                    : "own gear required",
              );
              parts.push(r.remote ?? project.remoteOk ? "remote ok" : "on set");
              return (
                <Fact
                  key={i}
                  label={r.count > 1 ? `${r.discipline} ×${r.count}` : r.discipline}
                >
                  {parts.join(" · ")}
                </Fact>
              );
            })
          ) : (
            <Fact label="roles">—</Fact>
          )}
        </dl>
      </section>

      {project.description ? (
        <section className="mt-10">
          <p className="fact-secondary">brief</p>
          <div className="mt-4">
            <Rule />
          </div>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line">
            {project.description}
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <p className="fact-secondary">applications · {applications.length}</p>
          {/* Entry point into the AI ranking, pre-scoped to this project —
              the ranking itself lives on the scout wall (suggested order). */}
          <Link
            className="fact-secondary underline underline-offset-4"
            href={`/business/scout?org=${org.id}&project=${project.id}&rank=1`}
          >
            see suggested creatives
          </Link>
        </div>
        <div className="mt-4">
          <Rule />
        </div>
        {applications.length === 0 ? (
          <p className="mt-4 text-[15px] leading-relaxed">
            No applications yet.{" "}
            <Link
              className="underline underline-offset-2"
              href={`/business/scout?org=${org.id}&project=${project.id}&rank=1`}
            >
              scout talent
            </Link>{" "}
            to find people for this project.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
            {applications.map((a) => (
              <ApplicationItem
                key={a.applicationId}
                app={a}
                orgId={org.id}
                projectId={project.id}
                canManage={canManage}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="fact-secondary">{label}</dt>
      <dd className="fact text-right">{children}</dd>
    </div>
  );
}

function ApplicationItem({
  app,
  orgId,
  projectId,
  canManage,
}: {
  app: ApplicationRow;
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const forward = FORWARD_LABEL[app.status];
  const canDecline = app.status !== "booked" && app.status !== "declined";

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px]">{app.displayName}</span>
        <span className="fact-secondary">{app.status}</span>
      </div>
      <p className="fact-secondary">
        {app.disciplines.length > 0 ? app.disciplines.join(" · ") : "—"}
        {app.dayRate != null ? ` · $${app.dayRate}/day` : ""}
      </p>
      {app.note ? (
        <p className="max-w-2xl text-[15px] leading-relaxed">{app.note}</p>
      ) : null}

      {canManage && (forward || canDecline) ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
          {forward ? (
            <form action={transitionApplication}>
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                type="hidden"
                name="applicationId"
                value={app.applicationId}
              />
              <input type="hidden" name="target" value={forward.target} />
              <button
                type="submit"
                className="fact underline underline-offset-4"
              >
                {forward.label}
              </button>
            </form>
          ) : null}
          {canDecline ? (
            <form action={transitionApplication}>
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                type="hidden"
                name="applicationId"
                value={app.applicationId}
              />
              <input type="hidden" name="target" value="declined" />
              <button
                type="submit"
                className="fact-secondary underline underline-offset-4"
              >
                decline
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

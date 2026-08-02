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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href={`/business/${org.id}`}>{org.name}</Link>
        </p>
        <Link
          className="fact-secondary underline underline-offset-4"
          href={`/business/${org.id}`}
        >
          back to org
        </Link>
      </header>

      <p className="fact-secondary mt-12">
        {project.type} · {project.status}
      </p>
      <h1 className="headline mt-3 text-5xl">{project.title}</h1>

      {/* Booked is the celebration state — plain, per DESIGN voice. */}
      {booked.length > 0 ? (
        <p className="fact mt-6 border border-ink px-3 py-3">
          booked. the callsheet has a name on it.
        </p>
      ) : null}

      <dl className="mt-8 flex flex-col divide-y divide-rule border-t border-b border-rule">
        <Fact label="location">
          {project.location}
          {project.remoteOk ? " · remote ok" : ""}
        </Fact>
        <Fact label="timeline">
          {fmtDate(project.timelineStart)} → {fmtDate(project.timelineEnd)}
        </Fact>
        <Fact label="day rate on-set">
          {project.dayRateOnset != null ? `$${project.dayRateOnset}` : "—"}
        </Fact>
        <Fact label="hourly post">
          {project.hourlyPostprod != null ? `$${project.hourlyPostprod}` : "—"}
        </Fact>
        <Fact label="byo gear">{project.byoGear.replace("_", " ")}</Fact>
        <Fact label="roles needed">
          {(project.rolesNeeded ?? []).length > 0
            ? (project.rolesNeeded ?? [])
                .map(
                  (r) =>
                    `${r.count}× ${r.discipline}${r.level ? ` (${r.level})` : ""}`,
                )
                .join(" · ")
            : "—"}
        </Fact>
      </dl>

      {project.description ? (
        <>
          <div className="mt-10">
            <Rule />
          </div>
          <section className="mt-8">
            <h2 className="fact-secondary">brief</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          </section>
        </>
      ) : null}

      <div className="mt-10">
        <Rule />
      </div>

      <section className="mt-8">
        <h2 className="fact-secondary">applications · {applications.length}</h2>
        {applications.length === 0 ? (
          <p className="mt-4 text-[15px] leading-relaxed">
            No applications yet.{" "}
            <Link className="underline underline-offset-2" href="/business/scout">
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

      <div className="mt-10">
        <Rule />
      </div>

      <nav className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        <Link className="fact underline underline-offset-4" href="/business/scout">
          find more talent
        </Link>
        <Link
          className="fact underline underline-offset-4"
          href={`/business/${org.id}`}
        >
          back to projects
        </Link>
      </nav>
    </main>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { getOrgForUser, getOrgProjects } from "../_data";

/*
 * §5 org home, addressed by orgId (arrived at from the switcher). getOrgForUser
 * re-checks membership through lib/tenancy — a business user who is not a member
 * of this org gets notFound(), never another org's rows.
 */
export default async function OrgHome({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const user = await requireUser("business");
  const active = await getOrgForUser(user.id, orgId);
  if (!active) notFound();

  const { org, role } = active;
  const projects = await getOrgProjects(org.id);
  const canPost = role === "owner" || role === "manager";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/business">Callsheet</Link>
        </p>
        <form action="/logout" method="post">
          <button className="fact-secondary" type="submit">
            log out
          </button>
        </form>
      </header>

      <h1 className="headline mt-12 text-5xl">{org.name}</h1>

      <dl className="mt-8 flex flex-col divide-y divide-rule border-t border-b border-rule">
        <div className="flex items-baseline justify-between gap-6 py-3">
          <dt className="fact-secondary">verification</dt>
          <dd className="fact">{org.verified ? "verified" : "unverified"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 py-3">
          <dt className="fact-secondary">your seat</dt>
          <dd className="fact">{role}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 py-3">
          <dt className="fact-secondary">work types</dt>
          <dd className="fact text-right">
            {(org.workTypes ?? []).length > 0
              ? (org.workTypes ?? []).join(" · ")
              : "none set"}
          </dd>
        </div>
      </dl>

      <div className="mt-10">
        <Rule />
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="fact-secondary">projects</h2>
          {canPost ? (
            <Link
              className="fact underline underline-offset-4"
              href={`/business/${org.id}/projects/new`}
            >
              new project
            </Link>
          ) : null}
        </div>
        {projects.length === 0 ? (
          <p className="mt-4 text-[15px] leading-relaxed">
            No projects yet.{" "}
            {canPost ? (
              <Link
                className="underline underline-offset-2"
                href={`/business/${org.id}/projects/new`}
              >
                post the first one
              </Link>
            ) : (
              "an owner or manager posts the first one."
            )}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
            {projects.map(({ project, applicationCount }) => (
              <li key={project.id}>
                <Link
                  href={`/business/${org.id}/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 py-4 transition-opacity duration-150 hover:opacity-80"
                >
                  <span className="text-[15px]">{project.title}</span>
                  <span className="fact-secondary">
                    {project.status} · {applicationCount}{" "}
                    {applicationCount === 1 ? "application" : "applications"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <Rule />
      </div>

      <nav className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        <Link
          className="fact underline underline-offset-4"
          href={`/business/${org.id}/team`}
        >
          team &amp; seats
        </Link>
        {canPost ? (
          <Link
            className="fact underline underline-offset-4"
            href={`/business/${org.id}/projects/new`}
          >
            new project
          </Link>
        ) : null}
        <Link className="fact underline underline-offset-4" href="/business/scout">
          scout talent
        </Link>
      </nav>
    </main>
  );
}

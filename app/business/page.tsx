import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listUserOrgs } from "@/lib/tenancy";
import { Rule } from "@/components/ui";
import { getOrgProjects, type Org } from "./_data";

/*
 * §5 business home. Resolves the caller's orgs through lib/tenancy. Zero orgs
 * → an invite to sign one up. Several → a switcher list. Exactly one → the org
 * shown directly (its facts, projects with counts, links out to team / new
 * project / scout). Every read below is scoped to an org the caller belongs to.
 */
export default async function BusinessHome() {
  const user = await requireUser("business");
  const orgs = await listUserOrgs(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href="/">Callsheet</Link>
        </p>
        <form action="/logout" method="post">
          <button className="fact-secondary" type="submit">
            log out
          </button>
        </form>
      </header>

      {orgs.length === 0 ? (
        <>
          <h1 className="headline mt-12 text-5xl">No organization yet.</h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
            Your account exists but isn&apos;t tied to an org. Set one up to
            post projects and build teams.
          </p>
          <p className="mt-8">
            <Link
              className="fact underline underline-offset-4"
              href="/business/signup"
            >
              set up an organization
            </Link>
          </p>
        </>
      ) : orgs.length > 1 ? (
        <>
          <h1 className="headline mt-12 text-5xl">Your organizations.</h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
            You hold a seat in more than one org. Pick which one to work in.
          </p>
          <ul className="mt-10 flex flex-col divide-y divide-rule border-t border-b border-rule">
            {orgs.map(({ org, role }: { org: Org; role: string }) => (
              <li key={org.id}>
                <Link
                  href={`/business/${org.id}`}
                  className="flex items-center justify-between gap-4 py-5 transition-opacity duration-150 hover:opacity-80"
                >
                  <span className="text-[17px]">{org.name}</span>
                  <span className="fact-secondary">{role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <SingleOrg org={orgs[0].org} role={orgs[0].role} />
      )}
    </main>
  );
}

/* One-org fast path: render its home inline rather than bounce to /[orgId]. */
async function SingleOrg({ org, role }: { org: Org; role: string }) {
  const projects = await getOrgProjects(org.id);
  const canPost = role === "owner" || role === "manager";

  return (
    <>
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
    </>
  );
}

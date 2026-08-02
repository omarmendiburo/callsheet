import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { getOpenProjects } from "@/components/marketplace/_data";

/*
 * Admin preview: the job board exactly as talent sees it (owner's ask
 * 2026-08-02). Same reader, same verified-orgs-only gate, read-only — no
 * apply actions here. Admin surface: plain and fast.
 */
export default async function AdminBoardPreview() {
  await requireUser("admin");
  const projects = await getOpenProjects();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="fact-secondary">back office · preview</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">
        The board, as talent sees it.
      </h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        Every open project from verified organizations, newest first — the
        exact list a creative gets on their open-work page. Read-only here.
      </p>

      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">
          open projects · {projects.length}
        </h2>
        {projects.length === 0 ? (
          <p className="mt-4 text-[15px] text-secondary">
            Nothing on the board. Verify an org or wait for a post.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
            {projects.map(({ project, orgName }) => (
              <li key={project.id} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[16px]">{project.title}</span>
                  <span className="fact-secondary">{project.type}</span>
                </div>
                <p className="fact-secondary mt-1">
                  {orgName} · {project.location}
                  {project.dayRateOnset != null
                    ? ` · $${project.dayRateOnset}/day`
                    : ""}
                </p>
                {project.description ? (
                  <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-secondary">
                    {project.description.slice(0, 200)}
                    {project.description.length > 200 ? "…" : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

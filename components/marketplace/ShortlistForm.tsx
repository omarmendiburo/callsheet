"use client";

import { useState } from "react";
import { TextArea } from "@/components/ui";
import { shortlistTalent } from "@/app/business/scout/_actions";

/*
 * Shortlist a creative for one open project of the caller's org (spec §5.4).
 * The project is chosen from a mono chip row (the org's open projects); an
 * optional one-line note rides along. Server action creates or updates the
 * application to "shortlisted", org-scoped and fail-closed.
 *
 * DESIGN: one primary button per screen — this is it on the reveal page. The
 * project chips are selection controls, and "clear" is a mono text link.
 */
export function ShortlistForm({
  talentId,
  orgId,
  projects,
  alreadyShortlisted,
}: {
  talentId: string;
  orgId: string;
  projects: { id: string; title: string }[];
  alreadyShortlisted: { projectTitle: string } | null;
}) {
  const [selected, setSelected] = useState<string>(projects[0]?.id ?? "");

  if (projects.length === 0) {
    return (
      <p className="mt-4 text-[15px] leading-relaxed text-secondary">
        Your org has no open projects to shortlist for yet. Post one first, then
        come back and add this creative to it.
      </p>
    );
  }

  return (
    <form action={shortlistTalent} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="talentId" value={talentId} />
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="projectId" value={selected} />

      {alreadyShortlisted ? (
        <p className="fact border border-ink px-3 py-2">
          shortlisted · {alreadyShortlisted.projectTitle}
        </p>
      ) : null}

      <div>
        <span className="fact-secondary mb-2 block">for which project</span>
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => {
            const active = selected === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`fact border px-2 py-1.5 transition-opacity duration-150 ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper text-secondary hover:opacity-80"
                }`}
              >
                {p.title}
              </button>
            );
          })}
        </div>
      </div>

      <TextArea
        name="note"
        maxLength={200}
        placeholder="one line for your team on why (optional)"
      />

      <button
        type="submit"
        className="fact w-full bg-ink px-4 py-4 text-paper transition-opacity duration-150 hover:opacity-80"
      >
        shortlist for this project
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { TextArea } from "@/components/ui";
import { applyToProject } from "@/app/talent/jobs/_actions";

/*
 * One-tap apply with an optional note (spec §4.3). The note is a disclosure:
 * the primary button applies immediately; "add a note" reveals a textarea
 * first. Server action creates the application at status "applied", unique per
 * talent+project — a re-apply is a no-op the server enforces, and the card
 * re-renders in its "applied" state instead of showing this form.
 *
 * DESIGN: the apply button here is the ONE primary button on a job card; the
 * page headline carries no competing primary, and "add a note" is a mono text
 * link, not a second button.
 */
export function ApplyForm({ projectId }: { projectId: string }) {
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <form action={applyToProject} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      {noteOpen ? (
        <TextArea
          name="note"
          maxLength={400}
          placeholder="add a short note to your application (optional)"
        />
      ) : null}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="fact bg-ink px-4 py-3 text-paper transition-opacity duration-150 hover:opacity-80"
        >
          apply
        </button>
        {!noteOpen ? (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="fact-secondary underline underline-offset-4"
          >
            add a note
          </button>
        ) : null}
      </div>
    </form>
  );
}

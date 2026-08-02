"use client";

import { useActionState } from "react";
import { Field, PrimaryButton, TextInput, ErrorText } from "@/components/ui";
import { addMedia, type AddMediaState } from "../_actions";

/*
 * Client form for registering work / a pitch (owner's bug report 2026-08-02:
 * the server-form version silently no-opped without a title and the redirect
 * wiped the pasted link). Action state: errors show inline with every field
 * kept; success navigates and the fresh piece appears in the list above.
 */

const WORK_KINDS = [
  { id: "reel", label: "Reel" },
  { id: "shortform", label: "Shortform" },
  { id: "headshot", label: "Headshot" },
  { id: "still", label: "Still" },
] as const;

const ERRORS: Record<string, string> = {
  empty: "paste a link or give it a title first. either one is enough.",
  url: "that link doesn't look right. paste the full address (youtube, vimeo, or instagram), or leave it empty and add it later.",
};

export function AddPieceForm({
  mode,
  next,
}: {
  mode: "work" | "pitch";
  next: string;
}) {
  const [state, formAction, pending] = useActionState<AddMediaState, FormData>(
    addMedia,
    { code: null },
  );
  const isPitch = mode === "pitch";

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      {isPitch ? <input type="hidden" name="kind" value="pitch" /> : null}

      <Field
        label={isPitch ? "link to the clip" : "link (youtube / vimeo / instagram)"}
        hint="paste it and go. title is optional"
      >
        <TextInput
          name="url"
          type="url"
          placeholder={
            isPitch
              ? "https://youtube.com/shorts/..."
              : "https://youtube.com/watch?v=..."
          }
        />
      </Field>

      <Field label="title" hint="optional">
        <TextInput
          name="title"
          placeholder={
            isPitch ? "e.g. who i am in 10 seconds" : "e.g. costera spring spot"
          }
        />
      </Field>

      {isPitch ? null : (
        <>
          <Field label="kind">
            <select
              name="kind"
              defaultValue="reel"
              className="fact-secondary w-full border border-rule bg-transparent px-3 py-3 focus:border-ink focus:outline-none"
            >
              {WORK_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="vertical"
              className="h-4 w-4 accent-ink"
            />
            <span className="text-[15px]">This piece is vertical (9:16).</span>
          </label>
        </>
      )}

      {state.code ? (
        <ErrorText>{ERRORS[state.code] ?? "something went wrong."}</ErrorText>
      ) : null}

      <PrimaryButton type="submit" disabled={pending}>
        {pending
          ? "ADDING..."
          : isPitch
            ? "REGISTER PITCH"
            : "ADD THIS PIECE"}
      </PrimaryButton>
    </form>
  );
}

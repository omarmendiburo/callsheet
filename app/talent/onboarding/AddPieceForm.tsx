"use client";

import { useRef, useState, startTransition, useActionState } from "react";
import { upload } from "@vercel/blob/client";
import { Field, PrimaryButton, TextInput, ErrorText } from "@/components/ui";
import {
  addMedia,
  registerUploadedMedia,
  type AddMediaState,
} from "../_actions";

/*
 * Registering work / a pitch, two doors (owner's asks 2026-08-02):
 *
 *  1. UPLOAD — the primary path for the pitch: pick the clip straight off
 *     the phone/laptop. The file goes browser-to-Blob with a token from
 *     /api/pitch-upload (auth-gated, video-only, 200MB cap), then the row
 *     registers through a server action into the same pending-first
 *     moderation path as everything else.
 *  2. LINK — paste YouTube / Vimeo / Instagram; title optional.
 *
 * All errors show inline with fields kept; both paths show in-flight state.
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
  upload: "that upload didn't register. try again; if it keeps failing, paste a link instead.",
};

const MAX_BYTES = 200 * 1024 * 1024;

export function AddPieceForm({
  mode,
  next,
}: {
  mode: "work" | "pitch";
  next: string;
}) {
  const isPitch = mode === "pitch";
  const [linkState, linkAction, linkPending] = useActionState<
    AddMediaState,
    FormData
  >(addMedia, { code: null });
  const [regState, regAction, regPending] = useActionState<
    AddMediaState,
    FormData
  >(registerUploadedMedia, { code: null });

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("video/")) {
      setUploadError("that file isn't a video. mp4, mov, or webm work.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("that file is over 200MB. trim or compress the clip.");
      return;
    }
    try {
      setUploadPct(0);
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/pitch-upload",
        onUploadProgress: ({ percentage }) =>
          setUploadPct(Math.round(percentage)),
      });
      const fd = new FormData();
      fd.set("url", blob.url);
      fd.set("kind", isPitch ? "pitch" : "reel");
      fd.set("next", next);
      startTransition(() => regAction(fd));
    } catch {
      setUploadError(
        "the upload didn't go through. check your connection and try again, or paste a link below.",
      );
    } finally {
      setUploadPct(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const uploading = uploadPct !== null || regPending;

  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* ---- door 1: upload ---- */}
      <div>
        <p className="fact-secondary">
          {isPitch ? "upload the clip" : "upload a video"}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
          className="hidden"
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />
        <PrimaryButton
          type="button"
          className="mt-3"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploadPct !== null
            ? `UPLOADING… ${uploadPct}%`
            : regPending
              ? "SAVING…"
              : isPitch
                ? "UPLOAD YOUR 10-SECOND PITCH"
                : "UPLOAD A VIDEO FILE"}
        </PrimaryButton>
        <p className="mt-2 text-[13px] leading-relaxed text-secondary">
          Straight from your phone or laptop. mp4, mov, or webm, up to 200MB.
          {isPitch ? " Vertical, ten seconds, you talking." : ""}
        </p>
        {uploadError ? <ErrorText>{uploadError}</ErrorText> : null}
        {regState.code ? (
          <ErrorText>
            {ERRORS[regState.code] ?? "something went wrong."}
          </ErrorText>
        ) : null}
      </div>

      {/* ---- door 2: link ---- */}
      <form action={linkAction} className="flex flex-col gap-6">
        <p className="fact-secondary">or paste a link</p>
        <input type="hidden" name="next" value={next} />
        {isPitch ? <input type="hidden" name="kind" value="pitch" /> : null}

        <Field
          label={
            isPitch
              ? "link to the clip"
              : "link (youtube / vimeo / instagram)"
          }
          hint="title is optional"
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
              isPitch
                ? "e.g. who i am in 10 seconds"
                : "e.g. costera spring spot"
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
              <span className="text-[15px]">
                This piece is vertical (9:16).
              </span>
            </label>
          </>
        )}

        {linkState.code ? (
          <ErrorText>
            {ERRORS[linkState.code] ?? "something went wrong."}
          </ErrorText>
        ) : null}

        <button
          type="submit"
          disabled={linkPending}
          className="fact w-full border border-ink px-4 py-4 transition-opacity duration-150 hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {linkPending
            ? "ADDING..."
            : isPitch
              ? "REGISTER THE LINK"
              : "ADD THIS PIECE"}
        </button>
      </form>
    </div>
  );
}

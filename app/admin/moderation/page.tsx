import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { MediaFrame } from "@/components/media";
import { isRealMediaUrl } from "@/lib/media";
import { AdminShell } from "../_shell";
import { listFlaggedMedia, listPendingMedia, type MediaRow } from "../_data";
import { approveMedia, flagMedia, removeMedia } from "../_actions";

/*
 * Media moderation queue (spec §6). Nothing a creative uploads goes public
 * before an admin approves it. Two sections: everything pending review, then
 * everything already flagged. Each item shows the letterbox WorkFrame, kind,
 * title, the talent's displayName, and the submitted date — with approve /
 * flag / remove per row.
 */

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function MediaCard({ row }: { row: MediaRow }) {
  const { media, displayName } = row;
  return (
    <li className="border border-rule p-4">
      <div className="max-w-[260px]">
        {/* The admin reviews the actual linked media in place. */}
        <MediaFrame
          url={media.url}
          vertical={media.vertical}
          label={media.kind}
          interactive
        />
      </div>
      <div className="mt-3">
        <div className="text-[15px]">{media.title ?? "Untitled"}</div>
        <div className="fact-secondary mt-2">
          {media.kind} · {displayName}
        </div>
        <div className="fact-secondary mt-1">
          submitted {fmtDate(media.createdAt)} · {media.status}
        </div>
        {isRealMediaUrl(media.url) ? (
          <div className="mt-1 text-[13px] break-all">
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary underline underline-offset-4"
            >
              {media.url}
            </a>
          </div>
        ) : (
          <div className="fact-secondary mt-1">no link · frame only</div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <form action={approveMedia}>
          <input type="hidden" name="mediaId" value={media.id} />
          <button
            type="submit"
            className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
          >
            approve
          </button>
        </form>
        <form action={flagMedia}>
          <input type="hidden" name="mediaId" value={media.id} />
          <button
            type="submit"
            className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
          >
            flag
          </button>
        </form>
        <form action={removeMedia}>
          <input type="hidden" name="mediaId" value={media.id} />
          <button
            type="submit"
            className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
          >
            remove
          </button>
        </form>
      </div>
    </li>
  );
}

export default async function AdminModeration() {
  await requireUser("admin");
  const [pending, flagged] = await Promise.all([
    listPendingMedia(),
    listFlaggedMedia(),
  ]);

  return (
    <AdminShell active="/admin/moderation">
      <p className="fact-secondary">back office · moderation</p>
      <h1 className="headline mt-3 text-4xl sm:text-5xl">Moderation.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        Nothing goes public before approval. Uploads sit here as pending until
        an admin approves them; approve publishes, flag holds for review, remove
        takes it down.
      </p>

      <section className="mt-10">
        <h2 className="fact-secondary">pending review · {pending.length}</h2>
        <div className="mt-4">
          <Rule />
        </div>
        {pending.length === 0 ? (
          <p className="mt-4 text-[15px] text-secondary">
            Nothing pending. The queue is clear.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((row) => (
              <MediaCard key={row.media.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="fact-secondary">flagged · {flagged.length}</h2>
        <div className="mt-4">
          <Rule />
        </div>
        {flagged.length === 0 ? (
          <p className="mt-4 text-[15px] text-secondary">Nothing flagged.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flagged.map((row) => (
              <MediaCard key={row.media.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

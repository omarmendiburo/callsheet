import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { MediaFrame } from "@/components/media";
import { getBrowsePool } from "@/components/marketplace/_data";

/*
 * Admin preview: the scout wall exactly as a business sees it (owner's ask
 * 2026-08-02). Same browse pool, same name-blind shape (the reader cannot
 * even return names), read-only — no save/track actions. Admin surface:
 * plain and fast.
 */
export default async function AdminWallPreview() {
  await requireUser("admin");
  const pool = await getBrowsePool();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="fact-secondary">back office · preview</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">
        The wall, as businesses see it.
      </h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        The full name-blind browse pool: approved work only, facts under each
        frame, no names by construction. Read-only here — names live in
        accounts and moderation.
      </p>

      <section className="mt-10">
        <Rule />
        <h2 className="fact-secondary mt-4">creatives · {pool.length}</h2>
        {pool.length === 0 ? (
          <p className="mt-4 text-[15px] text-secondary">
            Nobody on the wall yet. Approve some work in moderation first.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {pool.map((c) => {
              const lead = c.media[0];
              return (
                <figure key={c.talentId}>
                  {lead ? (
                    <MediaFrame
                      url={lead.url}
                      vertical={lead.vertical}
                      label={lead.kind}
                    />
                  ) : null}
                  <figcaption className="mt-2">
                    <p className="fact">
                      {c.disciplines.map((d) => d.type).join(" · ") ||
                        "creative"}
                    </p>
                    <p className="fact-secondary mt-1">
                      {c.city}
                      {c.dayRate != null ? ` · $${c.dayRate}` : ""}
                      {c.availability === "now" ? " · available now" : ""}
                      {c.certified ? " · certified" : ""}
                    </p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

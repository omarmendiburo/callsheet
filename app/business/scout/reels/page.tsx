import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DISCIPLINES } from "@/lib/taxonomy";
import { Rule } from "@/components/ui";
import { MediaFrame } from "@/components/media";
import { FilterRow } from "@/components/marketplace/FilterRow";
import {
  getBrowsePool,
  getOrgTrackForTalent,
  type BrowseCreative,
} from "@/components/marketplace/_data";
import { one } from "@/components/marketplace/filters";
import { trackTalent } from "../_actions";
import { resolveScoutOrg } from "../_org";
import { ReelKeys } from "./ReelKeys";

/*
 * The REELS mode of scout (from the original mockup's Reels / Gallery / CRM
 * trio): one creative per screen, the work as large as the viewport allows.
 * Work-first law holds — no names here; the reveal is one click away.
 * Navigation is server-rendered (?i=) with wrap-around; ReelKeys adds
 * arrow-key movement on top.
 */

const BASE = "/business/scout/reels";

function withParams(
  base: string,
  params: Record<string, string | undefined>,
): string {
  const q = Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return q ? `${base}?${q}` : base;
}

export default async function ReelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("business");
  const params = await searchParams;
  const orgParam = one(params, "org");

  const resolution = await resolveScoutOrg(user.id, orgParam);
  if (resolution.kind === "choose") redirect("/business/scout");
  const org = resolution.org;
  // Viewers browse; managers act (server actions re-check the same rank).
  const canManage = resolution.orgs.some(
    (o) => o.org.id === org.id && (o.role === "owner" || o.role === "manager"),
  );

  const fDiscipline = one(params, "discipline");
  const pool = (await getBrowsePool()).filter(
    (c: BrowseCreative) =>
      !fDiscipline || c.disciplines.some((d) => d.type === fDiscipline),
  );

  const total = pool.length;
  const rawI = Number.parseInt(one(params, "i") ?? "0", 10);
  const i = total > 0 ? ((Number.isFinite(rawI) ? rawI : 0) + total) % total : 0;
  const creative = pool[i];

  const frame =
    creative?.media.find((m) => m.kind === "reel" || m.kind === "shortform") ??
    creative?.media[0];

  // Scouting-tracker state for the creative on screen (name-blind: the state
  // never introduces a name; it just says whether eyes are already on them).
  const track = creative
    ? await getOrgTrackForTalent(org.id, creative.talentId)
    : null;

  const common = { org: orgParam ? org.id : undefined, discipline: fDiscipline };
  const prevHref = withParams(BASE, { ...common, i: String(i - 1) });
  const nextHref = withParams(BASE, { ...common, i: String(i + 1) });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="fact-secondary">
        scout · reels{total > 0 ? ` · ${i + 1} of ${total}` : ""}
      </p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">The reel view.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        One creative at a time, work first. Arrow keys move you through the
        pool.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="fact-secondary">view</span>
        <Link
          className="fact border border-rule px-2 py-1.5 text-secondary transition-opacity duration-150 hover:opacity-70"
          href={withParams("/business/scout", { org: common.org })}
        >
          gallery
        </Link>
        <span className="fact border border-ink bg-ink px-2 py-1.5 text-paper">
          reels
        </span>
        <Link
          className="fact border border-rule px-2 py-1.5 text-secondary transition-opacity duration-150 hover:opacity-70"
          href={withParams("/business/crm", { org: common.org })}
        >
          crm
        </Link>
      </div>

      <div className="mt-6">
        <FilterRow
          label="discipline"
          base={BASE}
          params={{ org: common.org }}
          paramKey="discipline"
          activeValue={fDiscipline}
          options={DISCIPLINES.map((d) => ({ value: d, label: d }))}
        />
      </div>

      <div className="mt-8">
        <Rule />
      </div>

      {creative == null ? (
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-secondary">
          No creatives match this filter.{" "}
          <Link
            className="underline underline-offset-4"
            href={withParams(BASE, { org: common.org })}
          >
            clear it
          </Link>{" "}
          to see the whole pool.
        </p>
      ) : (
        <section className="mt-8">
          <ReelKeys prevHref={prevHref} nextHref={nextHref} />

          <div
            className={
              frame?.vertical
                ? "mx-auto w-full max-w-sm"
                : "mx-auto w-full max-w-3xl"
            }
          >
            <MediaFrame
              url={frame?.url}
              vertical={frame?.vertical}
              label={frame?.title ?? "reel"}
              interactive
            />
          </div>

          <div className="mx-auto mt-4 flex w-full max-w-3xl items-start justify-between gap-4">
            <span className="fact">
              {creative.disciplines
                .map((d) => `${d.type} · ${d.level}`)
                .join("  /  ")}
            </span>
            <span className="fact-secondary shrink-0">
              {creative.city} · {creative.availability}
              {creative.dayRate != null ? ` · $${creative.dayRate}` : ""}
            </span>
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-3xl items-center justify-between gap-6">
            <Link className="fact underline underline-offset-4" href={prevHref}>
              ← previous
            </Link>
            <Link
              className="fact bg-ink px-5 py-4 text-paper transition-opacity duration-150 hover:opacity-80"
              href={withParams(`/business/scout/${creative.talentId}`, {
                org: common.org,
              })}
            >
              OPEN THE REVEAL
            </Link>
            <Link className="fact underline underline-offset-4" href={nextHref}>
              next →
            </Link>
          </div>

          {/* Scouting tracker — no name, just whether eyes are on them. */}
          <div className="mx-auto mt-6 w-full max-w-3xl text-center">
            {track ? (
              <p>
                <span className="fact border border-ink px-2 py-1.5">
                  saved{track.status !== "watching" ? ` · ${track.status}` : ""}
                </span>
                <Link
                  className="fact-secondary ml-4 underline underline-offset-4"
                  href={withParams("/business/crm", { org: common.org })}
                >
                  manage in crm
                </Link>
              </p>
            ) : canManage ? (
              <form action={trackTalent}>
                <input
                  type="hidden"
                  name="talentId"
                  value={creative.talentId}
                />
                <input type="hidden" name="orgId" value={org.id} />
                <button
                  type="submit"
                  className="fact underline underline-offset-4"
                >
                  save this creative
                </button>
                <span className="fact-secondary ml-3">
                  adds them to your saved list in the crm
                </span>
              </form>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}

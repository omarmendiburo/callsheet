import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Rule } from "@/components/ui";
import { getOpenProjectsForOrg } from "@/components/marketplace/_data";
import { transitionApplication } from "../_actions";
import {
  advanceTrack,
  inviteTrackedToProject,
  removeTrack,
} from "../scout/_actions";
import { resolveScoutOrg } from "../scout/_org";
import {
  getOrgPipeline,
  getOrgTracks,
  projectsInPipeline,
  type PipelineRow,
  type PipelineStatus,
  type TrackRow,
  type TrackStatus,
} from "./_data";

/*
 * The CRM view (spec §5 + owner's call 2026-08-01) — two band-sets:
 *
 *   SCOUTING (top): the org's private watchlist over the pool. watching →
 *   contacted → invited; invite creates/updates the real application row to
 *   "shortlisted", so an invited creative appears in the inbound set too.
 *
 *   INBOUND (below): every application across every project the org owns.
 *   applied → viewed → shortlisted → booked, then a collapsed declined band.
 *
 * Ruled status bands, NOT kanban columns; this design language is bands.
 * Isolation: single gate is resolveScoutOrg (membership in ?org or the sole
 * org); getOrgPipeline and getOrgTracks filter by that orgId. A member of one
 * org can never see another org's applicants or watchlist. Names are correct
 * on this surface; the wall stays name-blind.
 */

const BASE = "/business/crm";

/* The four visible bands, in pipeline order. Declined is handled separately. */
const BANDS: { status: PipelineStatus; label: string }[] = [
  { status: "applied", label: "applied" },
  { status: "viewed", label: "viewed" },
  { status: "shortlisted", label: "shortlisted" },
  { status: "booked", label: "booked" },
];

/* The one legal forward step out of each state (mirrors _actions FORWARD). */
const FORWARD: Record<string, { target: PipelineStatus; label: string } | null> =
  {
    applied: { target: "viewed", label: "mark viewed" },
    viewed: { target: "shortlisted", label: "shortlist" },
    shortlisted: { target: "booked", label: "book" },
    booked: null,
    declined: null,
  };

/* Scouting bands, in tracker order. */
const TRACK_BANDS: { status: TrackStatus; label: string }[] = [
  { status: "watching", label: "watching" },
  { status: "contacted", label: "contacted" },
  { status: "invited", label: "invited" },
];

/* "open to work" / "booked til Sep 12" / "unavailable" from the profile's
 * availability facts. Honest availability, mockup vocabulary. */
function availabilityFact(row: TrackRow): string {
  if (row.availability === "now") return "open to work";
  if (row.availability === "from_date") {
    if (!row.availableFrom) return "avail. soon";
    const d =
      typeof row.availableFrom === "string"
        ? new Date(row.availableFrom)
        : row.availableFrom;
    if (Number.isNaN(d.getTime())) return "avail. soon";
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `booked til ${label}`;
  }
  return "unavailable";
}

function one(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/* "3d ago" / "today" from a timestamp — whole days since applied. */
function daysAgo(d: Date | string): string {
  const then = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(then.getTime())) return "";
  const ms = Date.now() - then.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

/* Preserve ?org across links so a multi-org caller keeps their context. */
function withOrg(href: string, orgParam?: string): string {
  if (!orgParam) return href;
  const join = href.includes("?") ? "&" : "?";
  return `${href}${join}org=${encodeURIComponent(orgParam)}`;
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("business");
  const params = await searchParams;
  const orgParam = one(params, "org");

  const resolution = await resolveScoutOrg(user.id, orgParam);

  // Multiple orgs and none chosen — a plain org switcher (org is a query param).
  if (resolution.kind === "choose") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <p className="fact-secondary">business · pipeline · pick an org</p>
        <h1 className="headline mt-4 text-4xl sm:text-5xl">Which org?</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed">
          The pipeline is one org&apos;s applicants. Pick which one.
        </p>
        <ul className="mt-8 flex flex-col divide-y divide-rule border-t border-b border-rule">
          {resolution.orgs.map(({ org, role }) => (
            <li key={org.id} className="flex items-center justify-between py-4">
              <span className="text-[15px]">{org.name}</span>
              <Link
                className="fact underline underline-offset-4"
                href={`${BASE}?org=${org.id}`}
              >
                open as {role}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const org = resolution.org;
  const canManage = resolution.orgs.some(
    (o) => o.org.id === org.id && (o.role === "owner" || o.role === "manager"),
  );

  const [all, tracks, openProjects] = await Promise.all([
    getOrgPipeline(org.id),
    getOrgTracks(org.id),
    getOpenProjectsForOrg(org.id),
  ]);
  const projects = projectsInPipeline(all);
  const inviteTargets = openProjects.map((p) => ({ id: p.id, title: p.title }));

  const fProject = one(params, "project");
  const showDeclined = one(params, "declined") === "1";

  // Project filter applies to every band.
  const rows = fProject ? all.filter((r) => r.projectId === fProject) : all;

  const byStatus = (s: PipelineStatus) => rows.filter((r) => r.status === s);
  const booked = byStatus("booked");
  const declined = byStatus("declined");

  const clearHref = withOrg(BASE, orgParam);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="fact-secondary">business · {org.name} · pipeline</p>

      <h1 className="headline mt-4 text-4xl sm:text-5xl">The pipeline.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        Two lists, one desk. Scouting is the pool you are building: creatives
        you tracked from the wall, moved from watching to contacted to invited.
        Inbound is every application to your projects, applied to booked. Names
        live here; the wall stays name-blind.
      </p>

      {/* ---------- BAND-SET 1 — SCOUTING (the watchlist) ---------- */}
      <section className="mt-10">
        <h2 className="fact">scouting · {tracks.length}</h2>
        <div className="mt-4">
          <Rule />
        </div>
        {tracks.length === 0 ? (
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-secondary">
            Nobody tracked yet. Open the{" "}
            <Link
              className="text-ink underline underline-offset-4"
              href={withOrg("/business/scout", orgParam)}
            >
              wall
            </Link>{" "}
            or the{" "}
            <Link
              className="text-ink underline underline-offset-4"
              href={withOrg("/business/scout/reels", orgParam)}
            >
              reels view
            </Link>{" "}
            and track the creatives you want to keep eyes on.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-10">
            {TRACK_BANDS.map(({ status, label }) => {
              const band = tracks.filter((t) => t.status === status);
              return (
                <Band key={status} label={label} count={band.length}>
                  {band.length === 0 ? (
                    <p className="fact-secondary py-4">nobody here yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-rule border-t border-b border-rule">
                      {band.map((t) => (
                        <TrackItem
                          key={t.trackId}
                          row={t}
                          orgId={org.id}
                          orgParam={orgParam}
                          canManage={canManage}
                          inviteTargets={inviteTargets}
                        />
                      ))}
                    </ul>
                  )}
                </Band>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- BAND-SET 2 — INBOUND (applications) ---------- */}
      <div className="mt-12">
        <h2 className="fact">inbound · {all.length}</h2>
      </div>

      {/* Booked is the celebration state — plain, per DESIGN voice. */}
      {booked.length > 0 ? (
        <p className="fact mt-6 border border-ink px-3 py-3">
          booked. the callsheet has a name on it. HMNTY reaches out to
          coordinate the introduction.
        </p>
      ) : null}

      {/* Project filter chip row (GET param) — filters every band. */}
      {projects.length > 1 ? (
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
          <span className="fact-secondary shrink-0 pt-1.5 sm:w-28">project</span>
          <div className="flex flex-wrap gap-2">
            <ChipLink
              href={
                showDeclined
                  ? withOrg(`${BASE}?declined=1`, orgParam)
                  : clearHref
              }
              active={!fProject}
            >
              all
            </ChipLink>
            {projects.map((p) => (
              <ChipLink
                key={p.id}
                href={withOrg(
                  `${BASE}?project=${p.id}${showDeclined ? "&declined=1" : ""}`,
                  orgParam,
                )}
                active={fProject === p.id}
              >
                {p.title}
              </ChipLink>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <Rule />
      </div>

      {all.length === 0 ? (
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-secondary">
          No applications yet. Post a project or scout the wall.{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href={withOrg(`/business/${org.id}/projects/new`, orgParam)}
          >
            post a project
          </Link>{" "}
          ·{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href={withOrg("/business/scout", orgParam)}
          >
            scout the wall
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-12">
          {BANDS.map(({ status, label }) => {
            const band = byStatus(status);
            return (
              <Band key={status} label={label} count={band.length}>
                {band.length === 0 ? (
                  <p className="fact-secondary py-4">nobody here yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-rule border-t border-b border-rule">
                    {band.map((r) => (
                      <PipelineItem
                        key={r.applicationId}
                        row={r}
                        orgId={org.id}
                        orgParam={orgParam}
                        canManage={canManage}
                      />
                    ))}
                  </ul>
                )}
              </Band>
            );
          })}

          {/* Declined band — collapsed to a count line unless ?declined=1. */}
          <section>
            {declined.length === 0 ? (
              <p className="fact-secondary">declined · 0</p>
            ) : showDeclined ? (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="fact-secondary">declined · {declined.length}</p>
                  <Link
                    className="fact-secondary underline underline-offset-4"
                    href={withOrg(
                      fProject ? `${BASE}?project=${fProject}` : BASE,
                      orgParam,
                    )}
                  >
                    hide
                  </Link>
                </div>
                <div className="mt-4">
                  <Rule />
                </div>
                <ul className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
                  {declined.map((r) => (
                    <PipelineItem
                      key={r.applicationId}
                      row={r}
                      orgId={org.id}
                      orgParam={orgParam}
                      canManage={canManage}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p className="fact-secondary">
                declined · {declined.length}
                {"  "}
                <Link
                  className="underline underline-offset-4"
                  href={withOrg(
                    fProject
                      ? `${BASE}?project=${fProject}&declined=1`
                      : `${BASE}?declined=1`,
                    orgParam,
                  )}
                >
                  show
                </Link>
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/* A ruled status band: caps label with count, a rule, then rows. Not a column. */
function Band({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="fact-secondary">
        {label} · {count}
      </p>
      <div className="mt-4">
        <Rule />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PipelineItem({
  row,
  orgId,
  orgParam,
  canManage,
}: {
  row: PipelineRow;
  orgId: string;
  orgParam?: string;
  canManage: boolean;
}) {
  const forward = FORWARD[row.status];
  const canDecline = row.status !== "booked" && row.status !== "declined";
  const profileHref = withOrg(`/business/scout/${row.talentId}`, orgParam);

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px]">{row.displayName}</span>
        <span className="fact-secondary shrink-0">{daysAgo(row.createdAt)}</span>
      </div>

      <p className="fact-secondary">
        {row.disciplines.length > 0 ? row.disciplines.join(" · ") : "—"}
        {"  ·  "}
        {row.projectTitle}
      </p>

      {row.note ? (
        <p className="max-w-2xl text-[15px] leading-relaxed">{row.note}</p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
        {canManage && forward ? (
          <form action={transitionApplication}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="projectId" value={row.projectId} />
            <input
              type="hidden"
              name="applicationId"
              value={row.applicationId}
            />
            <input type="hidden" name="target" value={forward.target} />
            <button type="submit" className="fact underline underline-offset-4">
              {forward.label}
            </button>
          </form>
        ) : null}

        {canManage && canDecline ? (
          <form action={transitionApplication}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="projectId" value={row.projectId} />
            <input
              type="hidden"
              name="applicationId"
              value={row.applicationId}
            />
            <input type="hidden" name="target" value="declined" />
            <button
              type="submit"
              className="fact-secondary underline underline-offset-4"
            >
              decline
            </button>
          </form>
        ) : null}

        <Link
          className="fact-secondary underline underline-offset-4"
          href={profileHref}
        >
          view profile
        </Link>
      </div>
    </li>
  );
}

/* A scouting row: name, facts (disciplines · city · availability · rate),
 * the note, then text-link actions. Invite is a plain GET-free form: a select
 * of open projects + a text button — no client JS, same as every other
 * mutation on this page. */
function TrackItem({
  row,
  orgId,
  orgParam,
  canManage,
  inviteTargets,
}: {
  row: TrackRow;
  orgId: string;
  orgParam?: string;
  canManage: boolean;
  inviteTargets: { id: string; title: string }[];
}) {
  const profileHref = withOrg(`/business/scout/${row.talentId}`, orgParam);
  const facts = [
    row.disciplines.length > 0 ? row.disciplines.slice(0, 3).join(" · ") : null,
    row.city,
    availabilityFact(row),
    row.dayRate != null ? `$${row.dayRate}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px]">{row.displayName}</span>
        <span className="fact-secondary shrink-0">{daysAgo(row.createdAt)}</span>
      </div>

      <p className="fact-secondary">{facts}</p>

      {row.note ? (
        <p className="max-w-2xl text-[15px] leading-relaxed">{row.note}</p>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        {canManage && row.status === "watching" ? (
          <form action={advanceTrack}>
            <input type="hidden" name="trackId" value={row.trackId} />
            <input type="hidden" name="orgId" value={orgId} />
            <button type="submit" className="fact underline underline-offset-4">
              mark contacted
            </button>
          </form>
        ) : null}

        {canManage && row.status !== "invited" ? (
          inviteTargets.length > 0 ? (
            <form
              action={inviteTrackedToProject}
              className="flex flex-wrap items-center gap-3"
            >
              <input type="hidden" name="trackId" value={row.trackId} />
              <input type="hidden" name="orgId" value={orgId} />
              <select
                name="projectId"
                defaultValue={inviteTargets[0].id}
                className="fact-secondary border border-rule bg-transparent px-2 py-1.5 focus:border-ink focus:outline-none"
              >
                {inviteTargets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="fact underline underline-offset-4"
              >
                invite to project
              </button>
            </form>
          ) : (
            <span className="fact-secondary">no open project to invite to</span>
          )
        ) : null}

        <Link
          className="fact-secondary underline underline-offset-4"
          href={profileHref}
        >
          view profile
        </Link>

        {canManage ? (
          <form action={removeTrack}>
            <input type="hidden" name="trackId" value={row.trackId} />
            <input type="hidden" name="orgId" value={orgId} />
            <button
              type="submit"
              className="fact-secondary underline underline-offset-4"
            >
              stop tracking
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

/* A filter chip as a link (GET nav, no client JS) — same language as the
 * marketplace FilterRow chips: active inverts to ink, matching the sidebar. */
function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`fact border px-2 py-1.5 transition-opacity duration-150 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-paper text-secondary hover:opacity-80"
      }`}
    >
      {children}
    </Link>
  );
}

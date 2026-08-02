import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { LEVELS } from "@/lib/taxonomy";
import { Rule } from "@/components/ui";
import { MediaFrame } from "@/components/media";
import { AdminShell } from "../../_shell";
import { getUserById } from "../../_data";
import {
  getProfileByUserId,
  getDisciplines,
  getMedia,
} from "@/app/talent/_data";
import { listUserOrgs } from "@/lib/tenancy";

/*
 * Admin profile view (owner's ask 2026-08-02: open a profile straight from
 * the accounts page). Unlike the business reveal this shows the WHOLE truth
 * for staff: every media row with its moderation status (pending/flagged/
 * removed included), full facts, and org memberships for business users. No
 * role/org scoping, no approved-only filter. Admin surface: plain and fast.
 */

const LEVEL_LABEL = new Map(LEVELS.map((l) => [l.id, l.label]));
const AVAILABILITY_LABEL: Record<string, string> = {
  now: "available now",
  from_date: "available from a date",
  unavailable: "unavailable",
};

export const dynamic = "force-dynamic";

export default async function AdminUserProfile({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireUser("admin");
  const { userId } = await params;
  const user = await getUserById(userId);
  if (!user) notFound();

  const profile =
    user.role === "talent" ? await getProfileByUserId(user.id) : null;
  const [disciplines, media, orgs] = await Promise.all([
    profile ? getDisciplines(profile.id) : Promise.resolve([]),
    profile ? getMedia(profile.id) : Promise.resolve([]),
    user.role === "business"
      ? listUserOrgs(user.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof listUserOrgs>>),
  ]);

  return (
    <AdminShell active="/admin/users">
      <p className="fact-secondary">back office · account</p>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h1 className="headline text-4xl sm:text-5xl">{user.name}</h1>
        <Link
          className="fact underline underline-offset-4"
          href="/admin/users"
        >
          back to accounts
        </Link>
      </div>
      <p className="mt-4 fact-secondary">
        {user.role} · {user.email}
        {user.phone ? ` · ${user.phone}` : ""} ·{" "}
        {user.suspended ? "suspended" : "active"}
      </p>

      {profile ? (
        <>
          <section className="mt-10">
            <h2 className="fact-secondary">facts</h2>
            <div className="mt-4">
              <Rule />
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:max-w-lg">
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">city</span>
                <span className="fact">{profile.city}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">availability</span>
                <span className="fact">
                  {AVAILABILITY_LABEL[profile.availability] ??
                    profile.availability}
                </span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">day rate</span>
                <span className="fact">
                  {profile.dayRate != null ? `$${profile.dayRate}` : "—"}
                </span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="fact-secondary">travel</span>
                <span className="fact">
                  {profile.willingToTravel
                    ? profile.travelRadiusMiles
                      ? `within ${profile.travelRadiusMiles} mi`
                      : "yes"
                    : "local only"}
                </span>
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="fact-secondary">disciplines</h2>
            <div className="mt-4">
              <Rule />
            </div>
            {disciplines.length === 0 ? (
              <p className="mt-4 text-[15px] text-secondary">None listed.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2 sm:max-w-lg">
                {disciplines.map((d) => (
                  <li key={d.id} className="flex justify-between gap-4">
                    <span className="fact">{d.type}</span>
                    <span className="fact-secondary">
                      {LEVEL_LABEL.get(d.level) ?? d.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="fact-secondary">
              work · every piece, any status
            </h2>
            <div className="mt-4">
              <Rule />
            </div>
            {media.length === 0 ? (
              <p className="mt-4 text-[15px] text-secondary">
                Nothing registered yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {media.map((m) => (
                  <figure key={m.id}>
                    <MediaFrame
                      url={m.url}
                      vertical={m.vertical}
                      label={`${m.kind} · ${m.status}`}
                      interactive
                    />
                    <figcaption className="fact-secondary mt-2">
                      {m.title} · {m.kind} · {m.status}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {user.role === "business" ? (
        <section className="mt-10">
          <h2 className="fact-secondary">organizations</h2>
          <div className="mt-4">
            <Rule />
          </div>
          {orgs.length === 0 ? (
            <p className="mt-4 text-[15px] text-secondary">
              No org memberships.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2 sm:max-w-lg">
              {orgs.map(({ org, role }: { org: { id: string; name: string; verified: boolean }; role: string }) => (
                <li key={org.id} className="flex justify-between gap-4">
                  <span className="fact">{org.name}</span>
                  <span className="fact-secondary">
                    {role} · {org.verified ? "verified" : "unverified"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}

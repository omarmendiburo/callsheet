import { createPasswordResetToken, requireUser } from "@/lib/auth";
import { headers } from "next/headers";
import { Rule } from "@/components/ui";
import { AdminShell } from "../_shell";
import { listOrgs, listUsers } from "../_data";
import {
  suspendUser,
  unsuspendUser,
  verifyOrg,
  unverifyOrg,
} from "../_actions";

/*
 * User management (spec §6). Every user in a plain table with a text filter by
 * name/email (a real form input — this is admin, not the marketplace). Suspend
 * / unsuspend flips users.suspended; getCurrentUser() already rejects a
 * suspended user, so a suspend kills their very next request. Orgs get a
 * verify / unverify section below. No impersonation tonight — out of scope.
 */

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; resetFor?: string }>;
}) {
  await requireUser("admin");
  const { q: qRaw, resetFor } = await searchParams;
  const q = (qRaw ?? "").trim().toLowerCase();

  const [allUsers, orgs] = await Promise.all([listUsers(), listOrgs()]);

  /* Staff-assisted reset: generate a 30-minute link the admin hands to the
   * person privately. Stateless token; nothing is stored or sent. */
  let resetLink: { email: string; url: string } | null = null;
  if (resetFor) {
    const target = allUsers.find((u) => u.id === resetFor);
    if (target && !target.suspended) {
      const h = await headers();
      const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
      resetLink = {
        email: target.email,
        url: `${origin}/reset?token=${createPasswordResetToken(target)}`,
      };
    }
  }
  const users = q
    ? allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    : allUsers;

  return (
    <AdminShell active="/admin/users">
      <p className="fact-secondary">back office · accounts</p>
      <h1 className="headline mt-3 text-4xl sm:text-5xl">Accounts.</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed">
        Suspend cuts access on the user&rsquo;s very next request. Verifying an
        org marks it trusted to post. Impersonation is out of scope tonight.
      </p>

      <section className="mt-10">
        <h2 className="fact-secondary">find an account</h2>
        <div className="mt-4">
          <Rule />
        </div>
        <form method="get" className="mt-4 flex items-end gap-3">
        <label className="block flex-1">
          <span className="fact-secondary mb-2 block">filter by name or email</span>
          <input
            type="text"
            name="q"
            defaultValue={qRaw ?? ""}
            placeholder="type to filter"
            className="w-full border border-rule bg-transparent px-3 py-3 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="fact border border-ink px-4 py-3 transition-opacity duration-150 hover:opacity-80"
        >
          filter
        </button>
      </form>
        <p className="fact-secondary mt-3">
          {users.length} of {allUsers.length} accounts
          {q ? ` matching "${qRaw}"` : ""}
        </p>

        {resetLink ? (
          <div className="mt-4 border border-ink p-4">
            <p className="fact">reset link for {resetLink.email}</p>
            <p className="mt-2 text-[13px] break-all select-all">
              {resetLink.url}
            </p>
            <p className="fact-secondary mt-2">
              hand it to them privately. works once, expires in 30 minutes.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="fact-secondary">all accounts</h2>
        <div className="mt-4 overflow-x-auto border-t border-b border-rule">
          <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="fact-secondary py-3 pr-4 font-normal">name</th>
              <th className="fact-secondary py-3 pr-4 font-normal">email</th>
              <th className="fact-secondary py-3 pr-4 font-normal">role</th>
              <th className="fact-secondary py-3 pr-4 font-normal">created</th>
              <th className="fact-secondary py-3 pr-4 font-normal">status</th>
              <th className="fact-secondary py-3 font-normal">action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-rule align-top">
                <td className="py-3 pr-4 text-[14px]">{u.name}</td>
                <td className="py-3 pr-4 text-[13px] break-all">
                  {u.email}
                </td>
                <td className="fact py-3 pr-4">{u.role}</td>
                <td className="fact py-3 pr-4">{fmtDate(u.createdAt)}</td>
                <td className="fact py-3 pr-4">
                  {u.suspended ? "suspended" : "active"}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-4">
                    <form
                      action={u.suspended ? unsuspendUser : suspendUser}
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                      >
                        {u.suspended ? "unsuspend" : "suspend"}
                      </button>
                    </form>
                    {!u.suspended ? (
                      <a
                        className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                        href={`/admin/users?resetFor=${u.id}${qRaw ? `&q=${encodeURIComponent(qRaw)}` : ""}`}
                      >
                        reset link
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-[14px] text-secondary">
                  No accounts match that filter.
                </td>
              </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="fact-secondary">organizations · verify to trust for posting</h2>
        <div className="mt-4">
          <Rule />
        </div>
        <div className="mt-4 overflow-x-auto border-t border-b border-rule">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="fact-secondary py-3 pr-4 font-normal">name</th>
                <th className="fact-secondary py-3 pr-4 font-normal">ein</th>
                <th className="fact-secondary py-3 pr-4 font-normal">created</th>
                <th className="fact-secondary py-3 pr-4 font-normal">verified</th>
                <th className="fact-secondary py-3 font-normal">action</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-rule align-top">
                  <td className="py-3 pr-4 text-[14px]">{org.name}</td>
                  <td className="fact py-3 pr-4">{org.ein ?? "—"}</td>
                  <td className="fact py-3 pr-4">{fmtDate(org.createdAt)}</td>
                  <td className="fact py-3 pr-4">
                    {org.verified ? "verified" : "unverified"}
                  </td>
                  <td className="py-3">
                    <form action={org.verified ? unverifyOrg : verifyOrg}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <button
                        type="submit"
                        className="fact underline underline-offset-4 transition-opacity duration-150 hover:opacity-70"
                      >
                        {org.verified ? "unverify" : "verify"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-[14px] text-secondary">
                    No organizations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ErrorText, Field, PrimaryButton, Rule, TextInput } from "@/components/ui";
import { getOrgForUser, getOrgSeats } from "../../_data";
import { addSeat, changeRole, removeSeat } from "./_actions";

/*
 * §5.2 team & seats. Everyone with a seat sees the roster. Only owners see the
 * management controls (add seat, change role, remove). getOrgForUser is the
 * isolation gate — a non-member gets notFound(), never another org's roster.
 */

const ERRORS: Record<string, string> = {
  missing: "name, email, and a temp password are all required.",
  email: "that email address doesn't look right.",
  password: "the temp password must be at least 8 characters.",
  dupe: "an account with that email already exists.",
  notfound: "that seat no longer exists.",
  lastowner: "an org must keep at least one owner.",
  self: "you can't remove your own seat.",
};

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string; added?: string; temp?: string }>;
}) {
  const { orgId } = await params;
  const { error, added, temp } = await searchParams;
  const user = await requireUser("business");
  const active = await getOrgForUser(user.id, orgId);
  if (!active) notFound();

  const { org, role } = active;
  const isOwner = role === "owner";
  const seats = await getOrgSeats(org.id);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="fact-secondary">business · {org.name} · team</p>
      <p className="mt-3">
        <Link
          className="fact-secondary underline underline-offset-4"
          href={`/business/${org.id}`}
        >
          back to overview
        </Link>
      </p>

      <h1 className="headline mt-4 text-4xl sm:text-5xl">Team &amp; seats.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        {isOwner
          ? "Owners manage the roster. Managers can post projects and move applications; viewers can read."
          : "This is your org's roster. Only an owner can change seats."}
      </p>

      {/* One-time temp-password reveal after a successful add. */}
      {added && temp ? (
        <div className="mt-8 border border-ink p-4">
          <p className="fact-secondary">seat added · {added}</p>
          <p className="mt-3 text-[15px] leading-relaxed">
            Temporary password, shown once:
          </p>
          <p className="fact mt-2 break-all">{temp}</p>
          <p className="mt-3 text-[13px] text-secondary">
            Share it privately, not over an open channel. It won&apos;t be shown
            again. Ask them to change it after their first log in.
          </p>
        </div>
      ) : null}

      <section className="mt-10">
        <p className="fact-secondary">roster · {seats.length}</p>
        <div className="mt-4">
          <Rule />
        </div>
        <ul className="mt-4 flex flex-col divide-y divide-rule border-t border-b border-rule">
          {seats.map((s) => {
            const isSelf = s.userId === user.id;
            return (
              <li key={s.membershipId} className="flex flex-col gap-3 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px]">
                    {s.name}
                    {isSelf ? " (you)" : ""}
                  </span>
                  <span className="fact-secondary">{s.role}</span>
                </div>
                <p className="fact-secondary break-all">{s.email}</p>

                {isOwner && !isSelf ? (
                  <div className="mt-1 flex flex-wrap items-end gap-x-6 gap-y-3">
                    {s.role !== "owner" ? (
                      <form
                        action={changeRole}
                        className="flex items-end gap-3"
                      >
                        <input type="hidden" name="orgId" value={org.id} />
                        <input
                          type="hidden"
                          name="membershipId"
                          value={s.membershipId}
                        />
                        <label className="block">
                          <span className="fact-secondary mb-2 block">
                            role
                          </span>
                          <select
                            name="role"
                            defaultValue={s.role}
                            className="fact-secondary border border-rule bg-transparent px-2 py-2 focus:border-ink focus:outline-none"
                          >
                            <option value="manager">MANAGER</option>
                            <option value="viewer">VIEWER</option>
                          </select>
                        </label>
                        <button
                          type="submit"
                          className="fact-secondary underline underline-offset-4"
                        >
                          save role
                        </button>
                      </form>
                    ) : (
                      <span className="fact-secondary">owner (seat locked)</span>
                    )}

                    <form action={removeSeat}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <input
                        type="hidden"
                        name="membershipId"
                        value={s.membershipId}
                      />
                      <button
                        type="submit"
                        className="fact-secondary underline underline-offset-4"
                      >
                        remove
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {isOwner ? (
        <section className="mt-10">
          <p className="fact-secondary">add a seat</p>
          <div className="mt-4">
            <Rule />
          </div>
          <div className="mt-4">
            <p className="max-w-lg text-[15px] leading-relaxed">
              Create a seat with a temporary password. You&apos;ll see the
              password once, then share it privately.
            </p>
            <form action={addSeat} className="mt-8 flex flex-col gap-6">
              <input type="hidden" name="orgId" value={org.id} />
              <Field label="full name">
                <TextInput name="name" placeholder="their name" required />
              </Field>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field label="email">
                  <TextInput
                    name="email"
                    type="email"
                    placeholder="them@example.com"
                    required
                  />
                </Field>
                <Field label="temp password" hint="8 characters or more">
                  <TextInput
                    name="tempPassword"
                    placeholder="set a temp password"
                    required
                  />
                </Field>
              </div>
              <Field label="role">
                <select
                  name="role"
                  defaultValue="manager"
                  className="fact-secondary w-full border border-rule bg-transparent px-3 py-3 focus:border-ink focus:outline-none"
                >
                  <option value="manager">MANAGER</option>
                  <option value="viewer">VIEWER</option>
                </select>
              </Field>
              {error ? (
                <ErrorText>{ERRORS[error] ?? "something went wrong."}</ErrorText>
              ) : null}
              <PrimaryButton type="submit">ADD SEAT</PrimaryButton>
            </form>
          </div>
        </section>
      ) : error ? (
        <div className="mt-8">
          <ErrorText>{ERRORS[error] ?? "something went wrong."}</ErrorText>
        </div>
      ) : null}
    </div>
  );
}

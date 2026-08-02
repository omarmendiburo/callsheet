import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrgForUser } from "../../../_data";
import { DISCIPLINES, LEVELS, PROJECT_TYPES } from "@/lib/taxonomy";
import {
  ErrorText,
  Field,
  PrimaryButton,
  Rule,
  TextArea,
  TextInput,
} from "@/components/ui";
import { createProject } from "../../../_actions";

/*
 * §5.3 project creation (manager+). getOrgForUser is the membership gate;
 * viewers are bounced to the org home. Roles-needed is a fixed set of blank
 * rows — the server keeps only the ones with a real discipline and a positive
 * count, so there is no client JS and the closed vocabulary holds.
 */

const ERRORS: Record<string, string> = {
  title: "the project needs a title.",
  type: "pick a project type.",
  location: "which city is the shoot in?",
  roles: "add at least one role with a count of one or more.",
  timeline: "the end date can't come before the start date.",
};

const ROLE_ROWS = [0, 1, 2, 3, 4];

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { orgId } = await params;
  const { error } = await searchParams;
  const user = await requireUser("business");
  const active = await getOrgForUser(user.id, orgId);
  if (!active) notFound();

  const { org, role } = active;
  // Viewers can read but not post; send them back to the org home.
  if (role === "viewer") redirect(`/business/${org.id}`);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <p className="fact">
          <Link href={`/business/${org.id}`}>{org.name}</Link>
        </p>
        <Link
          className="fact-secondary underline underline-offset-4"
          href={`/business/${org.id}`}
        >
          back to org
        </Link>
      </header>

      <h1 className="headline mt-12 text-5xl">Post a project.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        Describe the work and the roles you need. It opens for applications the
        moment you post it.
      </p>

      <form action={createProject} className="mt-10 flex flex-col gap-8">
        <input type="hidden" name="orgId" value={org.id} />

        <Field label="title">
          <TextInput
            name="title"
            placeholder="e.g. impact campaign film"
            required
          />
        </Field>

        <Field label="type">
          <select
            name="type"
            defaultValue={PROJECT_TYPES[0]}
            className="fact-secondary w-full border border-rule bg-transparent px-3 py-3 focus:border-ink focus:outline-none"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field label="description" hint="the brief a creative reads">
          <TextArea
            name="description"
            placeholder="what the project is, and what you're looking for"
          />
        </Field>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="timeline start" hint="optional">
            <TextInput name="timelineStart" type="date" />
          </Field>
          <Field label="timeline end" hint="optional">
            <TextInput name="timelineEnd" type="date" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="shooting location (city)">
            <TextInput name="location" placeholder="san diego" required />
          </Field>
          <label className="flex items-end gap-3 pb-3">
            <input
              type="checkbox"
              name="remoteOk"
              className="h-4 w-4 accent-ink"
            />
            <span className="text-[15px]">Remote work is OK.</span>
          </label>
        </div>

        <fieldset>
          <legend className="fact-secondary mb-3">
            roles needed · pick a craft, a count, and an optional level
          </legend>
          <div className="flex flex-col divide-y divide-rule border-t border-b border-rule">
            {ROLE_ROWS.map((i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-center gap-3 py-3 sm:grid-cols-[2fr_1fr_1.5fr]"
              >
                <select
                  name="roleDiscipline"
                  defaultValue=""
                  className="fact-secondary w-full border border-rule bg-transparent px-2 py-2 focus:border-ink focus:outline-none"
                >
                  <option value="">— DISCIPLINE —</option>
                  {DISCIPLINES.map((d) => (
                    <option key={d} value={d}>
                      {d.toUpperCase()}
                    </option>
                  ))}
                </select>
                <input
                  name="roleCount"
                  type="number"
                  min={1}
                  max={99}
                  placeholder="count"
                  className="w-full border border-rule bg-transparent px-2 py-2 text-[15px] placeholder:lowercase placeholder:text-secondary focus:border-ink focus:outline-none"
                />
                <select
                  name="roleLevel"
                  defaultValue=""
                  className="fact-secondary w-full border border-rule bg-transparent px-2 py-2 focus:border-ink focus:outline-none"
                >
                  <option value="">ANY LEVEL</option>
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-secondary">
            Only rows with a discipline and a count of one or more are saved.
          </p>
        </fieldset>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <Field label="day rate on-set (usd)" hint="optional">
            <TextInput
              name="dayRateOnset"
              type="number"
              min={0}
              placeholder="e.g. 600"
            />
          </Field>
          <Field label="hourly post (usd)" hint="optional">
            <TextInput
              name="hourlyPostprod"
              type="number"
              min={0}
              placeholder="e.g. 55"
            />
          </Field>
        </div>

        <Field label="bring-your-own gear">
          <select
            name="byoGear"
            defaultValue="not_needed"
            className="fact-secondary w-full border border-rule bg-transparent px-3 py-3 focus:border-ink focus:outline-none"
          >
            <option value="not_needed">NOT NEEDED</option>
            <option value="preferred">PREFERRED</option>
            <option value="required">REQUIRED</option>
          </select>
        </Field>

        {error ? (
          <ErrorText>{ERRORS[error] ?? "something went wrong."}</ErrorText>
        ) : null}

        <div className="mt-2">
          <Rule />
        </div>

        <PrimaryButton type="submit">POST THE PROJECT</PrimaryButton>
      </form>
    </main>
  );
}

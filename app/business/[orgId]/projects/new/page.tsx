import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrgForUser } from "../../../_data";
import { PROJECT_TYPES } from "@/lib/taxonomy";
import {
  ErrorText,
  Field,
  PrimaryButton,
  Rule,
  TextArea,
  TextInput,
} from "@/components/ui";
import { createProject } from "../../../_actions";
import { RolesEditor } from "./RolesEditor";

/*
 * §5.3 project creation (manager+). getOrgForUser is the membership gate;
 * viewers are bounced to the org home. Roles are a growable per-role editor
 * (rate, gear, remote per role); the server action re-validates every row.
 */

const ERRORS: Record<string, string> = {
  title: "the project needs a title.",
  type: "pick a project type.",
  location: "which city is the shoot in?",
  roles: "add at least one role with a count of one or more.",
  timeline: "the end date can't come before the start date.",
};


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
    <div className="mx-auto w-full max-w-2xl">
      <p className="fact-secondary">business · {org.name} · new project</p>
      <p className="mt-3">
        <Link
          className="fact-secondary underline underline-offset-4"
          href={`/business/${org.id}`}
        >
          all projects
        </Link>
      </p>

      <h1 className="headline mt-4 text-4xl sm:text-5xl">Post a project.</h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed">
        {org.verified
          ? "Describe the work and the roles you need. It opens for applications the moment you post it."
          : "Describe the work and the roles you need. It goes live to creatives once HMNTY verifies your organization; you can post it now."}
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

        <Field label="shooting location (city)">
          <TextInput name="location" placeholder="san diego" required />
        </Field>

        <RolesEditor />



        {error ? (
          <ErrorText>{ERRORS[error] ?? "something went wrong."}</ErrorText>
        ) : null}

        <div className="mt-2">
          <Rule />
        </div>

        <PrimaryButton type="submit">POST THE PROJECT</PrimaryButton>
      </form>
    </div>
  );
}

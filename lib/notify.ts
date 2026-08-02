import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sendEmail, APP_URL } from "@/lib/email";

/*
 * Product notifications: who hears about what, in the product's own voice.
 * Every function is fire-safe (sendEmail never throws) and every recipient
 * is resolved server-side. Copy rules: plain English, short, no em dashes,
 * one link, signed the same way everywhere.
 */

const SIGN = "\n\nCallsheet by HMNTY Studios";

async function talentEmail(talentId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ email: schema.users.email })
    .from(schema.talentProfiles)
    .innerJoin(schema.users, eq(schema.talentProfiles.userId, schema.users.id))
    .where(eq(schema.talentProfiles.id, talentId))
    .limit(1);
  return rows[0]?.email ?? null;
}

async function orgStaffEmails(orgId: string): Promise<string[]> {
  const db = await getDb();
  type Row = { email: string; role: string };
  const rows: Row[] = await db
    .select({ email: schema.users.email, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id))
    .where(eq(schema.memberships.orgId, orgId));
  return rows
    .filter((r: Row) => r.role === "owner" || r.role === "manager")
    .map((r: Row) => r.email);
}

async function adminEmails(): Promise<string[]> {
  const db = await getDb();
  const rows: { email: string }[] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.role, "admin"));
  return rows.map((r: { email: string }) => r.email);
}

/* ---- signups ---- */

export async function notifyTalentWelcome(email: string, firstName: string) {
  await sendEmail(
    email,
    "You're on the Callsheet",
    `Hi ${firstName},\n\nYour profile is in. Finish onboarding (work links, your ten-second pitch, rates) and a person on the HMNTY team reviews every piece before it goes live. Employers see your work first and your name last.\n\n${APP_URL()}/talent${SIGN}`,
  );
}

export async function notifyBusinessWelcome(
  email: string,
  firstName: string,
  orgName: string,
) {
  await sendEmail(
    email,
    `${orgName} is on Callsheet`,
    `Hi ${firstName},\n\n${orgName} is set up. One step left on our side: the HMNTY team verifies new organizations before their projects reach creatives, usually fast. You can scout the wall and build your pipeline right away.\n\n${APP_URL()}/business${SIGN}`,
  );
}

export async function notifyAdminsNewOrg(orgName: string) {
  const admins = await adminEmails();
  await sendEmail(
    admins,
    `New organization awaiting verification: ${orgName}`,
    `${orgName} just signed up. Their projects stay off the job board until an admin verifies them.\n\n${APP_URL()}/admin/users${SIGN}`,
  );
}

/* ---- the work loop ---- */

export async function notifyOrgNewApplication(
  orgId: string,
  projectTitle: string,
) {
  const staff = await orgStaffEmails(orgId);
  await sendEmail(
    staff,
    `New application: ${projectTitle}`,
    `A creative just applied to ${projectTitle}. Their work is on the application, name after you open the profile.\n\n${APP_URL()}/business${SIGN}`,
  );
}

export async function notifyTalentApplicationStatus(
  talentId: string,
  projectTitle: string,
  status: "shortlisted" | "booked" | "declined",
) {
  const email = await talentEmail(talentId);
  if (!email) return;
  const lines: Record<typeof status, [string, string]> = {
    shortlisted: [
      `You're shortlisted: ${projectTitle}`,
      `Your application to ${projectTitle} made the shortlist. Nothing to do yet; the team reaches out if it moves forward.`,
    ],
    booked: [
      `You're booked: ${projectTitle}`,
      `You got ${projectTitle}. The organization has your contact details and takes it from here.`,
    ],
    declined: [
      `Update on ${projectTitle}`,
      `${projectTitle} went another way this time. Your profile stays on the wall and your work keeps speaking for you.`,
    ],
  };
  const [subject, body] = lines[status];
  await sendEmail(email, subject, `${body}\n\n${APP_URL()}/talent${SIGN}`);
}

/* When a booking lands, every OTHER applicant still in play hears the role
 * was filled (owner's ask 2026-08-02). No names, no counts, and terminal
 * applications (booked, declined) are left alone. */
export async function notifyOtherApplicantsFilled(
  projectId: string,
  bookedTalentId: string,
  projectTitle: string,
) {
  const db = await getDb();
  type Row = { talentId: string; status: string; email: string };
  const rows: Row[] = await db
    .select({
      talentId: schema.applications.talentId,
      status: schema.applications.status,
      email: schema.users.email,
    })
    .from(schema.applications)
    .innerJoin(
      schema.talentProfiles,
      eq(schema.applications.talentId, schema.talentProfiles.id),
    )
    .innerJoin(schema.users, eq(schema.talentProfiles.userId, schema.users.id))
    .where(eq(schema.applications.projectId, projectId));
  const emails = rows
    .filter(
      (r: Row) =>
        r.talentId !== bookedTalentId &&
        r.status !== "booked" &&
        r.status !== "declined",
    )
    .map((r: Row) => r.email);
  if (emails.length === 0) return;
  await sendEmail(
    emails,
    `Update on ${projectTitle}`,
    `The team behind ${projectTitle} filled the role this time. Your application closes with it, and your work stays on the wall where the next project will find it.

${APP_URL()}/talent${SIGN}`,
  );
}

export async function notifyTalentInvited(
  talentId: string,
  projectTitle: string,
) {
  const email = await talentEmail(talentId);
  if (!email) return;
  await sendEmail(
    email,
    `You're invited: ${projectTitle}`,
    `An organization saw your work and invited you to ${projectTitle}. You're already on their shortlist; details are in your applications.\n\n${APP_URL()}/talent${SIGN}`,
  );
}

/* ---- moderation and admin ---- */

export async function notifyTalentMediaApproved(
  talentId: string,
  title: string,
) {
  const email = await talentEmail(talentId);
  if (!email) return;
  await sendEmail(
    email,
    "Your work is live",
    `"${title}" cleared review and now shows on your profile and the wall.\n\n${APP_URL()}/talent/profile${SIGN}`,
  );
}

export async function notifyOrgVerified(orgId: string, orgName: string) {
  const staff = await orgStaffEmails(orgId);
  await sendEmail(
    staff,
    `${orgName} is verified`,
    `${orgName} is verified. Your projects now reach every matching creative on the network.\n\n${APP_URL()}/business${SIGN}`,
  );
}

/* ---- seats ---- */

export async function notifySeatCredentials(
  email: string,
  firstName: string,
  orgName: string,
  tempPassword: string,
) {
  await sendEmail(
    email,
    `You have a seat at ${orgName} on Callsheet`,
    `Hi ${firstName},\n\n${orgName} added you to their Callsheet team. Log in with this email and the temporary password below, then change it.\n\nTemporary password: ${tempPassword}\n\n${APP_URL()}/login${SIGN}`,
  );
}

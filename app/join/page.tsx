import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Flow from "./Flow";

/*
 * §4.1 talent signup. A full-viewport, distraction-free conversational intake
 * (typeform-style): one question per screen. All logic and state live in the
 * client Flow; the server action in ./_actions.ts is the source of truth and
 * re-validates every field before writing the user, profile, and disciplines.
 *
 * Logged-in users are sent home instead (audit 2026-08-02): re-running signup
 * while authenticated can only ever dead-end on the duplicate-email check.
 */
export default async function JoinPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/${user.role}`);
  return <Flow />;
}

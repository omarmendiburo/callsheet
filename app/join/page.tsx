import Flow from "./Flow";

/*
 * §4.1 talent signup. A full-viewport, distraction-free conversational intake
 * (typeform-style): one question per screen. All logic and state live in the
 * client Flow; the server action in ./_actions.ts is the source of truth and
 * re-validates every field before writing the user, profile, and disciplines.
 */
export default function JoinPage() {
  return <Flow />;
}

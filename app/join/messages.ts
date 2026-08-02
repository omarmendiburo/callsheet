/*
 * Plain (non-"use server") shared module for the join flow. A "use server"
 * file may only export async functions, so the error copy and the action's
 * return-shape type live here where both the client Flow and the server action
 * can import them.
 */

export type JoinState = { code: string | null };

// code -> plain, friendly line shown on the step that owns the failure.
export const ERROR_MESSAGES: Record<string, string> = {
  missing: "we still need a name, an email, and a password.",
  password: "password needs to be at least 8 characters.",
  email: "that email address doesn't look right.",
  city: "which city do you work out of?",
  disciplines: "pick at least one craft and a level for it.",
  radius: "travel radius has to be a positive number of miles.",
  dupe: "an account with that email already exists. try logging in.",
};

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/* Minimal session probe for the static landing page: role only, no PII,
 * never cached. Logged out returns null. */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  return NextResponse.json(
    user ? { role: user.role } : null,
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroySession();
  // 303 (not the default 307) so the browser follows with a GET. A 307
  // preserves POST, and "/" now serves a static file that rejects POST — the
  // 405 the owner hit after the static homepage landed. GET also works so a
  // stray link-based logout can't 405 either.
  return NextResponse.redirect(new URL("/", request.url), 303);
}

export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url), 303);
}

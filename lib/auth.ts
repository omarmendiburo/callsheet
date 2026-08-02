import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export { hashPassword, verifyPassword } from "@/lib/password";

/*
 * In-house auth (product decision 2026-08-01: no external auth provider).
 * scrypt password hashes + HMAC-signed session cookie. No JWT library,
 * no session table — the cookie carries {uid, exp} signed with AUTH_SECRET.
 */

const SESSION_COOKIE = "cs_session";
const SESSION_DAYS = 7;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("AUTH_SECRET must be set in production");
  }
  return "callsheet-dev-secret-not-for-production";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(userId: string) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString(
    "base64url",
  );
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure only on the real deployment (same gate as secret() above): the
    // local production build is demoed over plain-http LAN URLs, where
    // browsers refuse Secure cookies and every login silently evaporates.
    secure: process.env.NODE_ENV === "production" && !!process.env.VERCEL,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function sessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    if (typeof uid !== "string" || typeof exp !== "number") return null;
    if (Date.now() > exp) return null;
    return uid;
  } catch {
    return null;
  }
}

export type SessionUser = typeof schema.users.$inferSelect;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const uid = await sessionUserId();
  if (!uid) return null;
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, uid))
    .limit(1);
  const user = rows[0];
  if (!user || user.suspended) return null;
  return user;
}

/*
 * Password reset: a stateless HMAC token bound to the CURRENT password hash
 * fragment, so a successful reset invalidates every outstanding token for
 * that user (single-use without a table). 30-minute expiry.
 */
const RESET_MINUTES = 30;

export function createPasswordResetToken(user: {
  id: string;
  passwordHash: string;
}): string {
  const exp = Date.now() + RESET_MINUTES * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.id,
      exp,
      pv: user.passwordHash.slice(0, 16),
      t: "reset",
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function verifyPasswordResetToken(
  token: string,
): Promise<SessionUser | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    const { uid, exp, pv, t } = parsed;
    if (
      t !== "reset" ||
      typeof uid !== "string" ||
      typeof exp !== "number" ||
      typeof pv !== "string"
    )
      return null;
    if (Date.now() > exp) return null;
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, uid))
      .limit(1);
    const user = rows[0];
    if (!user || user.suspended) return null;
    if (user.passwordHash.slice(0, 16) !== pv) return null;
    return user;
  } catch {
    return null;
  }
}

/* Redirects to /login when unauthenticated; to home when the role is wrong. */
export async function requireUser(
  role?: "talent" | "business" | "admin",
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect("/");
  return user;
}

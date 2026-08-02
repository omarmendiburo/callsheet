import "server-only";

/*
 * Transactional email transport (Resend HTTP API, no SDK — no new deps).
 * Fail-open by design: email is never load-bearing, so a missing key, a
 * Resend error, or a timeout logs and returns false without ever breaking
 * the mutation that triggered it.
 *
 * EMAIL_FROM defaults to Resend's shared test sender, which only delivers
 * to the Resend account owner's own address. Real delivery to users needs
 * the founders' domain verified in Resend + EMAIL_FROM set (e.g.
 * "Callsheet <hello@hmntystudios.com>").
 */

const FROM = () =>
  process.env.EMAIL_FROM ?? "Callsheet <onboarding@resend.dev>";

export const APP_URL = () =>
  process.env.APP_URL ?? "https://callsheet.hmntystudios.com";

export async function sendEmail(
  to: string | string[],
  subject: string,
  text: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const recipients = (Array.isArray(to) ? to : [to]).filter(
    // Demo/placeholder addresses are not real inboxes.
    (e) => e && !e.endsWith("@demo.callsheet") && !e.endsWith("@example.com"),
  );
  if (!key || recipients.length === 0) {
    if (!key) console.log("[email] RESEND_API_KEY not set; skipped:", subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM(), to: recipients, subject, text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, subject);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send errored", subject, err);
    return false;
  }
}

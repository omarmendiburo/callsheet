import "server-only";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";

/*
 * Versioned acceptance plumbing (audit H-7 layer 2). The interim documents
 * are plain-English house rules written from the product's actual behavior;
 * when HMNTY's counsel delivers final text, only the page copy and this
 * version string change — acceptance history stays intact and the new
 * version starts recording.
 */

export const LEGAL_VERSION = "2026-08-02-interim";

export async function recordAcceptance(userId: string) {
  try {
    const db = await getDb();
    await db.insert(schema.acceptances).values([
      { id: newId("acc"), userId, doc: "terms", version: LEGAL_VERSION },
      { id: newId("acc"), userId, doc: "privacy", version: LEGAL_VERSION },
    ]);
  } catch (err) {
    // Acceptance recording must never block a signup.
    console.error("[legal] acceptance record failed", err);
  }
}

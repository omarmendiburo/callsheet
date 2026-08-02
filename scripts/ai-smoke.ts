/*
 * AI-layer smoke test (tsx). Seeds if needed, then exercises both
 * capabilities against the demo data:
 *   - rankTalentForProject for both seeded projects
 *   - recruiterSearch for three natural-language queries
 * Prints ranked names + scores + rationales, plus which engine is active.
 *
 * Run: pnpm tsx scripts/ai-smoke.ts
 * With no ANTHROPIC_API_KEY set, the heuristic engine runs (tonight's path).
 */
import { getDb, schema } from "../lib/db";
import { rankTalentForProject } from "../lib/ai/match";
import { recruiterSearch } from "../lib/ai/recruiter";
import { activeEngine } from "../lib/ai/types";

/*
 * Ensure demo data exists WITHOUT re-running migrations against an already
 * migrated PGlite database (re-migrating an existing PGlite dir crashes the
 * WASM engine). If the users table is empty (or absent), run the seed script,
 * which migrates + seeds from scratch. Otherwise assume it's ready.
 */
async function ensureSeeded() {
  const db = await getDb();
  try {
    const existing = await db.select().from(schema.users).limit(1);
    if (existing.length > 0) return;
  } catch {
    // Table doesn't exist yet — fall through to seed.
  }
  console.log("ai-smoke: no data found, seeding first (run `pnpm seed`)...");
  throw new Error(
    "Database not seeded. Run `pnpm seed` once, then re-run this smoke test.",
  );
}

function line() {
  console.log("-".repeat(72));
}

async function main() {
  await ensureSeeded();
  const db = await getDb();

  console.log(`\nActive engine: ${activeEngine().toUpperCase()}`);
  console.log(
    `ANTHROPIC_API_KEY ${process.env.ANTHROPIC_API_KEY ? "present" : "absent"} — ` +
      `${process.env.ANTHROPIC_API_KEY ? "Claude path live" : "heuristic path"}.`,
  );

  const projects = await db.select().from(schema.projects);

  for (const p of projects) {
    line();
    console.log(`PROJECT ${p.id}: "${p.title}" (${p.type}) @ ${p.location}`);
    console.log(
      `  needs: ${(p.rolesNeeded as { discipline: string }[])
        .map((r) => r.discipline)
        .join(", ")}  |  day rate $${p.dayRateOnset ?? "-"}`,
    );
    const ranked = await rankTalentForProject(p.id);
    console.log(`  ranked ${ranked.length} candidates:`);
    for (const m of ranked) {
      console.log(
        `   [${String(m.score).padStart(3)}] ${m.displayName} (${m.engine})`,
      );
      console.log(`         ${m.rationale}`);
    }
  }

  const queries = [
    "documentary dp in san diego",
    "shortform editor under $500",
    "certified colorist available now",
  ];

  for (const q of queries) {
    line();
    console.log(`RECRUITER QUERY: "${q}"`);
    const res = await recruiterSearch(q);
    console.log(`  engine: ${res.engineUsed}`);
    console.log(`  ${res.explanation}`);
    console.log(`  filters: ${JSON.stringify(res.filters)}`);
    console.log(`  ${res.results.length} results:`);
    for (const m of res.results.slice(0, 5)) {
      console.log(
        `   [${String(m.score).padStart(3)}] ${m.displayName} (${m.engine})`,
      );
      console.log(`         ${m.rationale}`);
    }
  }
  line();
}

main().then(() => process.exit(0));

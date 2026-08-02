# AI layer (W4) — spec §8

Two capabilities behind one stable interface. AI ranks and explains; it never rejects, hides, contacts, or books anyone. Every output shows its reasoning.

- `rankTalentForProject(projectId)` → `Match[]` (`lib/ai/match.ts`): SQL pre-filter (share ≥1 needed discipline), score 0–100, written rationale, persisted to the `matches` table.
- `recruiterSearch(query)` → `{ filters, results, engineUsed, explanation }` (`lib/ai/recruiter.ts`): parses plain English into `{disciplines[], maxDayRate?, city?, radiusMiles?, levels[]?, availableNow?}`, then filters + ranks. Return the `filters`/`explanation` to the UI so it shows what was understood.
- `GET /api/ai/health` → `{ engine, keyPresent }`: label surfaces honestly.

**Engine switch:** heuristic when no key; the Claude engine (`lib/ai/claude.ts`, model in `CLAUDE_MODEL`) activates automatically when `ANTHROPIC_API_KEY` is set. Any Claude error/malformed response logs one line and falls back to heuristic — the app never 500s. No PII (emails/phones) ever reaches the API.

**Orchestrator wiring:** on the business scout page (`app/business/scout`), add a "rank for this project" button calling `rankTalentForProject`, and a recruiter search box calling `recruiterSearch` — render each row's score + rationale, and the recruiter's `explanation` as its reasoning. Suggested order: heuristic tonight, Claude when the key lands.

**Smoke test:** `pnpm tsx scripts/ai-smoke.ts`.

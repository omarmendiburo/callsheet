# Callsheet

The creative workforce OS for HMNTY Studios' talent network pilot. Three
doors, one law: the work is the resume.

- **Talent** — individual creatives: conversational signup (`/join`), guided
  onboarding, media by pasted link (YouTube / Vimeo / Instagram), job board
  with quiet recommendations, screen-tests feed.
- **Business** — orgs with seats and roles: post projects with per-role
  terms, scout a name-blind wall (gallery / reels / CRM trio), AI-suggested
  order and plain-English recruiter search, saved-talent list (one-tap save
  from the wall, reels, or reveal), application
  pipeline. Names appear ONLY on the reveal and in the CRM.
- **Admin** — HMNTY staff: accounts (suspend, verify orgs, reset links),
  media moderation (nothing goes public unapproved), certification, metrics,
  AI engine status.

Introductions happen off-platform through HMNTY staff. No payments, no DMs,
no uploads in the pilot — those are decisions, not gaps. See
`docs/AUDIT-2026-08-02.md` for the full product and engineering review.

## Run it

```bash
pnpm install
pnpm seed        # migrations + demo data (embedded PGlite, no env needed)
pnpm dev         # http://localhost:3000
```

Demo logins (password `callsheet-demo`):

| door | email |
|---|---|
| talent | `talent@demo.callsheet` |
| business (org owner) | `business@demo.callsheet` |
| business (manager) | `manager@demo.callsheet` |
| admin | `admin@demo.callsheet` |

All seeded people/orgs are labeled `Placeholder:` — they are demo data and
stay labeled by law.

## Environment

No env vars are required locally (embedded PGlite persists to `.data/`,
gitignored). Everything is optional and activates on its own:

| var | effect when set |
|---|---|
| `DATABASE_URL` | swaps the embedded DB for Postgres/Neon; `pnpm db:migrate` + `pnpm seed` run against it |
| `AUTH_SECRET` | session cookie signing (REQUIRED in production; dev falls back to a dev-only secret) |
| `ANTHROPIC_API_KEY` | AI flips from the heuristic engine to Claude (`lib/ai/claude.ts`, model `claude-sonnet-5`); verify via `GET /api/ai/health` or `pnpm exec tsx scripts/ai-smoke.ts` |
| `AI_DAILY_CALL_CAP` | daily Claude call backstop per server instance (default 200; over cap falls back to heuristic) |
| `RESEND_API_KEY` | password-reset emails send for real (until then: staff-assisted reset links from `/admin/users`) |

## Gates (run before every commit)

```bash
pnpm check:design   # DESIGN.md compliance — a failing design check is a failing build
pnpm build
```

CI (`.github/workflows/ci.yml`) runs both on every push and PR.

## Where things live

- `AGENTS.md` — the binding syllabus: design law, plumbing, file ownership.
- `DESIGN.md` — the visual identity (note the dated override block on top).
- `docs/AUDIT-2026-08-02.md` — full product/architecture/UX/back-office
  audit: operating map, flows, gap report, roadmap.
- `lib/` — auth (scrypt + HMAC cookie, no library), tenancy (org isolation),
  db (dual-driver), media (link classification), taxonomy (the one shared
  vocabulary), ai (heuristic + Claude behind one interface).
- `drizzle/` — SQL migrations (`pnpm db:generate` after schema changes).
- `scripts/seed.ts` — idempotent demo seed.

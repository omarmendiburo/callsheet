<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Callsheet — agent syllabus

Multi-tenant creative workforce OS. Three doors: **Talent** (individual creatives), **Business**
(orgs with seats/roles posting projects), **Admin** (HMNTY staff). AI matches people to
opportunity; it suggests and explains, humans decide. Full spec: the product-spec the orchestrator
holds; ask via NEEDS_CONTEXT if a requirement is ambiguous.

## Law

- **DESIGN.md rules everything visible** (summary: black #000 on white #FFF, grey #6B6B6B recedes;
  Anton = statements ≥32px via `.headline`; Inter (Helvetica-lineage sans) = everything else;
  facts via `.fact` / `.fact-secondary` (sans caps, tracked). **NO monospace, NO serif** (owner's
  calls 2026-08-01). Icons: **lucide-react ONLY**, used sparingly where a word won't do; no other
  icon set may be imported. 0px radius; no shadows/gradients/emoji/accent colours; motion =
  opacity 150ms only; one black primary button per screen. `pnpm check:design` must pass — it is
  a build gate. Admin surfaces: same tokens, plain and fast, polish not required.
- **Gates before any commit:** `pnpm build` && `pnpm check:design` both green, changed path
  exercised (curl or dev-server walk), diff reviewed for unrelated changes.
- **No new dependencies.** NEEDS_CONTEXT to the orchestrator if you believe one is required.
- **Data integrity:** placeholder people stay labeled (`isPlaceholder`, names prefixed
  "Placeholder:"). Never invent real-looking people. AI never rejects, contacts, or books anyone
  autonomously.

## Plumbing (use, don't rebuild)

- DB: `const db = await getDb()` from `@/lib/db`; schema tables from `schema.*`. Never raw SQL.
- Org data: ALWAYS through `@/lib/tenancy` (`getMembership`, `listUserOrgs`, `requireOrgRole`).
- Auth: `@/lib/auth` — `requireUser(role?)`, `getCurrentUser()`, `hashPassword`,
  `createSession`, `destroySession`. Sessions are HMAC cookies; do not add auth libraries.
- IDs: `newId("prefix")` from `@/lib/id`. Geo: `@/lib/geo`. Vocabulary: `@/lib/taxonomy`
  (DISCIPLINES, LEVELS, PROJECT_TYPES, PROFILE_PROMPTS, WORK_TYPES) — never hardcode these lists.
- UI primitives: `@/components/ui` (PrimaryButton, Field, TextInput, TextArea, Chip, Rule,
  WorkFrame, ErrorText). Media has no real files tonight: render `WorkFrame` letterboxes.
- Server actions for all mutations; validate every field server-side; fail closed.

## File ownership (one owner per area — do not cross)

- W1 talent: `app/talent/**`, `app/join/**` · W2 business: `app/business/**`
- W3 marketplace: `app/talent/jobs/**`, `app/business/scout/**`, `app/screen-tests/**`,
  `components/marketplace/**` · W4 AI: `lib/ai/**`, `app/api/ai/**` · W5 admin: `app/admin/**`
- Shared (`lib/**`, `components/ui.tsx`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`,
  `app/login/**`): orchestrator-owned — NEEDS_CONTEXT if a change there seems required.

## Return contract

End your report with exactly one status token: `DONE` | `DONE_WITH_CONCERNS` | `NEEDS_CONTEXT` |
`BLOCKED`, plus: files touched, verification performed, out-of-scope items. Report ≤500 words.
On tool timeout: treat as UNKNOWN, never retry same tool + same args; two timeouts on one target
→ report it and move on.

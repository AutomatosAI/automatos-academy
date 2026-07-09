# PRD-MT-02 — Spine: Postgres, Clerk, sync, deletion (academy repo)

**Status:** ready to build after D-R3/D-R6 (hosting + Clerk tenant) · **Repo:** `automatos-academy` · **Wave:** 0
**Depends on:** D-R3 (Railway Postgres), D-R6 (Clerk tenant + keys). Shapes only from [CONTENT-API-CONTRACT.md](CONTENT-API-CONTRACT.md).
**Unblocks:** MT-04 (accounts), MT-06 (sync), MT-07 (mock attempts), MT-08 (deletion UI).
**Source design:** [../02-architecture.md](../02-architecture.md) §3 (data model), §4 (auth/deletion), §5 (sync).

## 1. Why

Everything per-user — mastery map, SM-2 item state, mock attempts, telemetry, deletion rights — needs a home. The design locks a 7-table Postgres model with Clerk identity and *server-derived* rollups; today the academy has **no DB and no auth at all** (progress is localStorage). This PRD stands the Spine up inside the academy service (D-R3) so the app has accounts, sync, and the two GDPR deletion paths from its first build.

## 2. Scope

**In:** schema + migrations · Clerk JWT middleware · sync API (raw progress/telemetry in, reconciled state out) · server-side competence/decay derivation · export + both deletion paths · rate limiting.
**Out:** catalog serving (MT-01) · any UI (app PRDs) · plans/entitlement logic beyond the `plan` column (D1: pilot FREE) · Voice-Tutor rate ceilings (MT-09, same middleware point) · web-academy Clerk adoption.

## 3. Data model (02 §3, F4/F6 applied — restated as build truth)

Seven tables, exactly: `users` (`clerk_user_id` unique, `workspace_id`, `plan` default `'free'`), `mastery_map` (`scope_type` `domain|path`, `competence` **stored raw**, `decay_at`), `progress` (SM-2: `seen/correct/ease/interval/due_at` — mirrors `store.js` q-shape), `content_cache` (per-user snapshot meta), `telemetry` (`event_type` `answer|card_outcome|session|scenario`), `mock_attempts` (`scaled`, `passed`, `at`), `scenario_progress` (`step`, `score_pct`). **Every content-referencing table carries `vendor_id` + `track_id`** (F4); all rows scoped by `user_id`; indexes on `(user_id, track_id)` hot paths.

## 4. User stories

### US-021: Migrations + schema
- [ ] `node-pg-migrate` (or equally boring, battle-tested runner) with one initial migration creating all 7 tables + indexes + FKs per 02 §3.
- [ ] `DATABASE_URL` required at boot **only when Spine routes are enabled** (`SPINE_ENABLED=true`); the service still boots as a pure static/catalog server without it (academy deploy safety).
- [ ] Migration runs in CI against a disposable Postgres (GitHub Actions service container).

### US-022: Clerk auth middleware
- [ ] `@clerk/backend` token verification on every `/api/me/*` + `/api/sync/*` route; maps `clerk_user_id` → `users` row (creating on first authenticated call, minting `workspace_id`).
- [ ] 401 (missing/invalid) vs 403 (valid but wrong shape) distinguished; no route trusts client-supplied user ids — identity comes from the token only.
- [ ] Keys via env (`CLERK_SECRET_KEY` etc.); boot-fails loudly if `SPINE_ENABLED` without them.

### US-023: Sync — raw events in
- [ ] `POST /api/sync/progress` — batch of item-state answer events `{vendorId, trackId, itemId, correct, answeredAt, ease, interval, dueAt, seen, correct_count}`; upsert rule: **later `answeredAt` wins** per item (02 §5 — device wall-clock of the answer, not arrival order); idempotent on retry.
- [ ] `POST /api/sync/telemetry` — append-only batch; payload jsonb; PII-minimization: reject free-text fields not in the event schema.
- [ ] `POST /api/sync/mocks` + `POST /api/sync/scenarios` — same batch/idempotency posture.
- [ ] All sync routes rate-limited per user (reuse the in-memory limiter pattern from `server.js:124`, but per-`user_id`).

### US-024: Server-derived rollups — state out
- [ ] After each progress reconcile, re-derive `mastery_map` rows (domain scopes from item states via the ported weighted-competence math; path scopes across member tracks via `paths.json`) and reset `decay_at` — **clients never write competence** (02 §5).
- [ ] Engine math lives in `server/engine/` as a port of `public/js/engine/readiness.js` competence computation + the 03 §2 decay curve (`effective = floor + (stored−floor)·e^(−λΔt)`, `λ = ln2/halfLife(blueprintWeight)`) — one canonical server implementation, unit-tested against the worked example in 03 §5.
- [ ] `GET /api/me/state?since={ts}` — reconciled `progress` + `mastery_map` (+`mock_attempts`, `scenario_progress`) changed since `ts`, decay applied **on read**.

### US-025: Export + both deletion paths (F8 — Stage-1 compliance gate)
- [ ] `GET /api/me/export` — full JSON of the user's rows across all 7 tables (GDPR access/portability).
- [ ] `DELETE /api/me/data` — deletes the user's Spine rows (all 7 tables), keeps the Clerk identity; returns counts; idempotent.
- [ ] `DELETE /api/me/account` — separately-confirmed (requires header `X-Confirm-Account-Deletion: <clerk_user_id>`); deletes Spine rows **and** calls Clerk's user-deletion API; the copy consequence ("removes your sign-in across Academy surfaces") is the app's job (MT-08), the semantics are this route's.
- [ ] Both paths covered by integration tests incl. "deleted user can re-sign-up clean".

## 5. Functional requirements

- FR-1: Envelope on Spine responses: `{success, data, error}` (catalog stays envelope-free per contract §1).
- FR-2: All timestamps `timestamptz` UTC; `answeredAt` accepted with bounded clock skew (reject >48h future).
- FR-3: No secrets in code; `.env.example` documents `SPINE_ENABLED`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`.
- FR-4: CI: migration + integration tests against service-container Postgres; mock Clerk verification in tests (verified-token fixture), one live-Clerk smoke deferred to deploy checklist.

## 6. Non-goals

No content tables (D-R4 phase 2 owns that later, behind the same contract). No plan enforcement. No admin surface. No cross-user queries of any kind.

## 7. Success / exit

MT-06's device sync round-trips against a deployed Spine; deletion paths demonstrably wipe rows; Stage-1 F8 gate implementable app-side with zero backend gaps.

## 8. Open questions

- Retention window for `telemetry` (pilot: keep all; revisit pre-GA) — flagged, not blocking.
- `content_cache` server table is bookkeeping for support/debug (which version a device holds); confirm we want it populated in pilot or leave the table dormant until needed.

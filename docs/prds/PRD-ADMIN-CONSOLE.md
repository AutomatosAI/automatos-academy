# PRD — Admin Console (users · payments · progress · content)

**Status:** approved to build (first build after Part 1) · **Owner decision 2026-07-23:** academy-native Stripe
**Depends on:** the Spine live (PRD-PLATFORM-ACTIVATION) for user/progress data; the extended media plane (PRD-MEDIA-DOMAIN-SLOTS) for content upload.

## Why

Today the only admin surface is the per-placeholder video Upload button (C3). There is **no user management, no payments, no per-user progress view, no text-content editing, no roles** — `users.plan` defaults to `'free'` and is never written; there is zero billing code. Gerard needs a real **`#/admin`** console to run the Academy: view/edit/delete users, take payments, see learner progress, and view/edit/upload content.

## Principles

- **RBAC, not an env allowlist.** Add `users.role` (`learner` | `admin` | `owner`); retire the binary `ACADEMY_ADMIN_CLERK_IDS` gate (keep it only as the bootstrap that seeds the first `owner`).
- **Reuse the Spine.** Users/progress already live in Postgres (`server/spine/`); admin routes are read/write over the same tables, role-gated.
- **Fail-closed + auditable.** Every admin write is role-checked server-side and written to an `admin_audit` log (actor, action, target, at).
- **The SPA stays no-build.** `#/admin` is vanilla-JS views like the rest of `public/js/views/`.

## Stories

### S1 — Roles + admin gate
- Migration: `users.role text NOT NULL DEFAULT 'learner'`; index. Backfill: any `sub` in `ACADEMY_ADMIN_CLERK_IDS` → `owner` on first sign-in (bootstrap).
- `server/spine/auth.js` attaches `req.spineUser.role`; new `requireRole('admin')` middleware (owner ⊇ admin ⊇ learner).
- `GET /api/me` gains `role` so the SPA shows/hides `#/admin`.

### S2 — Users admin (`/api/admin/users`)
- `GET /api/admin/users?q=&plan=&role=&limit=&offset=` — list/search (email/clerk_id), paginated.
- `GET /api/admin/users/:id` — one user + counts (progress rows, mocks, last-active).
- `PATCH /api/admin/users/:id` — set `role` / `plan` (audited). Owner-only for role changes.
- `DELETE /api/admin/users/:id` — admin-scoped version of the existing self-service wipe (`me-routes.js` `wipeUserRows`), + optional Clerk delete; hard-confirmed + audited.

### S3 — Progress admin (`/api/admin/users/:id/progress`)
- Read a user's progress/mastery/streak/mocks (the same rollups as `/api/me/state`, but admin-scoped to a target user). Read-only.

### S4 — Payments (academy-native Stripe) (`server/billing/`)
- `POST /api/billing/checkout` — create a Stripe Checkout Session for a price (Clerk-authed learner). `POST /api/billing/portal` — Stripe billing-portal link.
- `POST /api/billing/webhook` — Stripe signature-verified; on `checkout.session.completed` / `customer.subscription.updated|deleted` → **write `users.plan`** (+ a `subscriptions` table: user_id, stripe_customer_id, stripe_sub_id, price_id, status, current_period_end). Idempotent by event id.
- **Gating:** a `planAllows(track, plan)` helper; the Content API and `#/track` gate premium tracks (v1: everything free, the hooks + `plan` writer land so pricing is a config flip later).
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price-id map. Absent ⇒ billing routes 503, `plan` stays `free` (dormant-safe, like every other plane).

### S5 — Content admin
- **Media:** the `#/admin` content tab lists tracks → slots (video/audio) with their state; Upload/Replace via the extended media plane (PRD-MEDIA-DOMAIN-SLOTS) — works for domain slots, not just `v-ov-*`.
- **Text (lessons/questions):** an editor over the **DB content store** (C2). Edits create a **draft `content_version`**; publish flips the pointer (the existing `publish-content.mjs` transaction). Keeps git as the offline canonical; the DB is the live publish target. Depends on the text write-back API (PRD-CONTENT-LIFECYCLE) — the same endpoint Automatos uses.

### S6 — The `#/admin` SPA
- New route in `public/js/router.js` + `public/js/views/admin/` (tabs: Users · Progress · Payments · Content). Guarded by `role` from `/api/me`; non-admins never see it. Uses the existing auth/token seam (`public/js/auth.js`) for the Bearer token on admin calls.

## Non-goals (v1)
- Per-track pricing UI (config-driven; the `plan` writer + gate land, pricing is a later flip).
- Team/org accounts (single-user plans only in v1).
- Editing scenarios/labs in-app (lessons + questions first).

## Verification
- Migration applies; a seeded `owner` sees `#/admin`, a learner 403s on every `/api/admin/*`.
- Users tab: search, open a user, change plan/role (audited row written), delete (rows gone).
- Progress tab: a target user's mastery/streak render.
- Payments: Stripe test-mode checkout → webhook → `users.plan` updated; portal link resolves; missing env ⇒ 503, no crash.
- Content: upload a video to a **domain** slot (presign 200); edit a lesson → draft → publish → `/api/catalog` serves the change.

## Sequencing
S1 → S2 → S3 (users/progress, immediately useful once Spine is live) → S5 media (needs PRD-MEDIA-DOMAIN-SLOTS) → S4 payments → S5 text (needs PRD-CONTENT-LIFECYCLE write-back).

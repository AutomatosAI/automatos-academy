# PRD-UNIFIED — One account, one progress record, one content store

**Status:** DRAFT — awaiting decision boxes D-U1..D-U9 (register below)
**Date:** 2026-07-16
**Repos:** `automatos-academy` (web SPA + Express + Spine) · `automatos-academy-app` (Expo)

## Why this wave

The mobile app already has accounts (Clerk), synced progress (the Spine, PRD-MT-02) and API-served
content (PRD-MT-01/MT-10). The web academy has none of the three: progress is localStorage-only,
there is no sign-in, and the SPA reads static JSON from `/content/`. PRD-MT-02 §Scope explicitly
deferred "web-academy Clerk adoption" — this wave is that follow-on, plus the file→DB content
migration that `server/catalog.js` describes itself as phase 1 of (D-R4 phase 2).

**Outcome:** the same login works on web and mobile; a learner's progress, readiness and profile
are identical on both surfaces; content is served from Postgres through the existing Content API
contract on both surfaces, so publishing content no longer requires a redeploy.

## The three PRDs

| PRD | Delivers | Depends on |
|---|---|---|
| [PRD-U1-WEB-CLERK-IDENTITY](./PRD-U1-WEB-CLERK-IDENTITY.md) | Clerk sign-in on the web SPA (optional, never a wall), shared Clerk application with mobile, Spine enabled in prod, privacy/copy reconciliation | D-U1, D-U2, D-U3 |
| [PRD-U2-SHARED-PROFILES-PROGRESS](./PRD-U2-SHARED-PROFILES-PROGRESS.md) | Web sync client (queue/flush/reconcile peer of the mobile one), one-time local-progress backfill, `#/profile` on web + de-orphaned mobile profile fed by real Spine data, GDPR surfaces on web | U1 · D-U4, D-U5 |
| [PRD-U3-CONTENT-DB](./PRD-U3-CONTENT-DB.md) | Content in Postgres behind the **unchanged** Content API contract; git stays the authoring source; ingest/publish step; SPA switches from static JSON to the API; durable version journal; optional media→CDN cutover | D-U6..D-U9 (independent of U1/U2) |

Sequencing: **U1 → U2** (U2 needs the token + enabled Spine). **U3 is parallel** — it needs only
`DATABASE_URL`, not Clerk. All three ride the same Railway Postgres.

## Decision register

| # | Decision | Options | Recommendation | Owner |
|---|---|---|---|---|
| D-U1 | Clerk production instance | (a) create `pk_live` app, web+mobile share it · (b) stay on the `pk_test` dev tenant | **(a)** — the current tenant (`many-kid-3.clerk.accounts.dev`) is a dev instance; accounts created there don't carry to prod | Gerard |
| D-U2 | Web sign-in prominence | (a) header button + contextual nudges (after mock, at badge claim) · (b) gate any content | **(a)** — browsing stays 100 % open; sign-in only adds sync/profile. (b) would break the SEO/marketing funnel | Gerard |
| D-U3 | Migration execution | (a) Railway pre-deploy command `npm run migrate` · (b) boot-time auto-migrate | **(a)** — keeps the fail-loud boot contract (`server.js` exits if Spine env is half-set); matches `.env.example` "run once per deploy" | Gerard |
| D-U4 | Profile v1 scope | (a) real data only: mastery/readiness, mock history, credentials, member-since + server-derived streak · (b) also XP/levels (new model) | **(a)** — XP/level exist nowhere server-side today (mobile profile numbers are demo placeholders); don't invent a points economy in a sync PRD | Gerard |
| D-U5 | First sign-in backfill | (a) prompt once: "Bring this device's progress into your account?" · (b) silent auto-upload | **(a)** — shared/public computers exist; consent-first matches the academy's privacy voice | Gerard |
| D-U6 | Content publish trigger | (a) CI job on merge to `main` · (b) manual `workflow_dispatch` | **(a)** with (b) kept as a manual override | Gerard |
| D-U7 | Live content refresh | (a) server polls max published `content_version` every 60 s and rebuilds the in-memory index · (b) authenticated reload endpoint | **(a)** — no new auth surface, bounded staleness, zero ops | Gerard |
| D-U8 | Media→CDN cutover in this wave | (a) bundle (execute the existing `VIDEO_HOSTING.md` plan; repo 767 MB → <80 MB) · (b) keep separate | **(a)** — same "get big things out of git" motion; still blocked on copying the `AWS_SDK_DEPLOY_*` secrets | Gerard |
| D-U9 | `CONTENT_SOURCE` default flip | files → db after N green days | **7 days** dual-running with the byte-equivalence check in CI | Gerard |

## Environment prerequisites (Gerard / Railway dashboard)

| Env | Service | Needed by |
|---|---|---|
| Railway Postgres ≥ 15 attached, `DATABASE_URL` | academy | U1/U2 (Spine) + U3 (content) |
| `SPINE_ENABLED=true` | academy | U1/U2 |
| `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` (production instance per D-U1) | academy | U1 |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` switched to the same production instance | app (EAS/env) | U1 |
| `EXPO_PUBLIC_SPINE_API=https://academy.automatos.app` | app | U2 (mobile already wired, env empty today) |
| `CONTENT_SOURCE=db` (after D-U9) | academy | U3 |
| `AWS_SDK_DEPLOY_*` secrets copied (existing blocker) | academy repo CI | U3/D-U8 |

## Non-goals for the wave

- No authoring CMS/admin UI — git + PR + `npm run validate` remains the only way content changes.
- No change to the Content API contract (`docs/CONTENT-API-CONTRACT.md`) — mobile keeps working untouched.
- No Next.js rebuild — `docs/FRONTEND_BRIEF.md` remains a separate strategic fork; this wave keeps the no-build SPA.
- No paid plans/entitlements — `users.plan` stays `'free'`.

## Relationship to in-flight work

- Lands **after** the Academy Periwinkle pair (web #20 / app #23) merges; all new web UI (sign-in header,
  profile view) is built in the periwinkle design system.
- The mobile profile screen (`app/profile.tsx`, currently an orphan route with demo numbers) gets wired
  to real data in U2 — the same wave should link it from the feed (or the tab bar, if that lands first).

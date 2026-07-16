# PRD-U1 — Web sign-in: Clerk on the academy SPA, one identity with mobile

**Status:** DRAFT · blocked on D-U1 (production Clerk instance), D-U2, D-U3
**Repo:** `automatos-academy` (+ one env change in `automatos-academy-app`)
**Prior art:** PRD-MT-02 built the server side (Spine auth) and explicitly deferred web adoption
("web-academy Clerk adoption" in its Out-of-scope list). This PRD is that follow-on.

## 1. Problem

A learner who studies on the web and installs the app starts from zero — there is no account on
web, so nothing can follow them. The Spine (Clerk-verified sync API, 7-table Postgres schema,
GDPR endpoints) is built, tested, and mounted behind `SPINE_ENABLED` — but no production deploy
runs it, and the web SPA has zero auth code (grep-confirmed: no Clerk, no token handling, no
`/api/sync` client anywhere under `public/`).

## 2. Goals

1. The **same Clerk application** authenticates web and mobile — one email/Apple/Google account,
   `users.clerk_user_id` identical on both surfaces, so the Spine's internal `users.id` is shared.
2. Sign-in on web is **optional and additive** — every page, track, quiz and mock works signed-out
   exactly as today. Signing in adds: synced progress (U2), a profile (U2), attributable badge
   claims, and GDPR self-service.
3. The Spine goes live in production (Railway Postgres + `SPINE_ENABLED=true`).
4. Every "no login / nothing is uploaded" promise in copy and docs is reconciled honestly.

## 3. Non-goals

- No content behind auth (D-U2a is the premise; a wall is explicitly rejected).
- No sync/profile UI — that's U2. U1 ends at "signed in, token available, Spine reachable".
- No change to mobile auth flow (it already works); only its env moves to the production instance.
- No SSO with the main Automatos platform's Clerk tenant — the Academy keeps its own instance
  (same policy as PRD-MT-02). Revisit only if platform/academy account unification becomes a goal.

## 4. Design

### 4.1 Client (no-build SPA — keep it that way)

- Load **ClerkJS from Clerk's CDN** (`<script async crossorigin>` in `index.html`), initialised with
  the publishable key. No bundler, no npm dependency — matches the SPA's no-build rule.
- **Key hydration** reuses the existing `chat-config.js` pattern (`server.js hydrateChatConfig`):
  boot writes a gitignored `public/auth-config.js` from `CLERK_PUBLISHABLE_KEY`; absent env →
  `window.ACADEMY_AUTH = null` and the UI simply never renders sign-in (graceful, like the tutor's
  "coming online" state). Static-host deploys (DEPLOY.md Option A) therefore keep working.
- New module `public/js/auth.js` (single seam, mirroring `content.js`'s role):
  - `initAuth()` — mounts Clerk, exposes `getToken()` (session JWT for the Spine), `user()`,
    `onAuthChange(cb)`.
  - Sign-in/up via Clerk's modal components (`clerk.openSignIn()`) — no custom credential forms.
  - Nothing else in the SPA touches Clerk directly; views consume `auth.js` only.
- **Topbar affordance:** signed-out → a quiet "Sign in" ghost-pill in `.ac-topbar` (periwinkle
  system, post-#20); signed-in → avatar + menu (Profile · Export my data · Delete · Sign out).
  Contextual nudges (post-mock result, badge claim panel) say what sign-in *does*: "keep this
  progress on all your devices" — never a gate.

### 4.2 Server

- Already built: `server/spine/auth.js` verifies `Authorization: Bearer` via `@clerk/backend`
  `verifyToken({secretKey})` and upserts `users` on `clerk_user_id`. No route trusts a client id.
- **Hardening (in scope):** pass `authorizedParties: [ACADEMY_BASE_URL]` (+ the app's origins) to
  `verifyToken` once the production instance exists — today no audience/azp check is configured.
- Enable in prod: Railway Postgres attached → `npm run migrate` (execution mode per **D-U3**) →
  `SPINE_ENABLED=true` + `CLERK_SECRET_KEY`. Boot stays fail-loud (exits if half-configured).
- Web and Spine are same-origin (`academy.automatos.app`) — no CORS work; catalog stays public.

### 4.3 One Clerk application (D-U1)

- Create the **production** Clerk application; enable email/password, Apple, Google (mobile parity;
  `app/sign-in.tsx` already offers all three).
- Web gets `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`; mobile's `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  switches from the `pk_test` dev tenant (`many-kid-3.clerk.accounts.dev`) to the same production
  instance. **Note:** dev-tenant accounts do not migrate — acceptable pre-launch; call it out in
  the app release notes if any real testers exist.

### 4.4 Copy + privacy reconciliation (this is real scope, not polish)

Statements that become false the day sign-in exists, each needing an edit:
- `README.md` "no backend, no login required" → "no login required; optional sign-in syncs progress".
- `docs/DEPLOY.md` local-first claims → add the Spine-enabled deployment section.
- `server.js` `/api` 501 catch-all copy ("Phase 1 is local-first; no backend yet") → update.
- Certificate/claim + progress-backup copy ("nothing is uploaded", `views/certificate.js`,
  `progress-io.js` header) → true only when signed out; say so explicitly.
- `PRD-CREDENTIALS.md` "no login, no DB" constraint → superseded note pointing here.
- New `#/privacy`-adjacent copy: what is stored when signed in (progress/telemetry per the Spine's
  PII-minimised schema), where (Railway Postgres), and the export/delete rights (endpoints exist).
- Badge claim: prefill the claim name from the Clerk profile when signed in (still free-editable;
  keep the "Signed by the Academy — not a vendor credential" honesty rules verbatim).

## 5. User stories

- **US-U01** — As a learner I sign in on the web with the same account I use in the app, from a
  button in the topbar, without losing where I was (Clerk modal, no navigation).
- **US-U02** — As a signed-out learner nothing changes: every surface works, no nag walls; I see
  one quiet "Sign in" affordance and honest copy about what it adds.
- **US-U03** — As a signed-in learner, `auth.js` can hand any module a fresh session token so
  Spine calls (U2) just work; expiry/refresh is Clerk's problem, not the SPA's.
- **US-U04** — As the operator, a deploy with no Clerk/DB env boots exactly as today (static +
  catalog), and a half-configured Spine still refuses to boot rather than half-working.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | `auth-config.js` hydration + ClerkJS loader + `auth.js` seam | with env: token retrievable in console; without env: zero UI change, zero console errors |
| S2 | Topbar sign-in/avatar + account menu (periwinkle) | signed-in/out states render in Mist+Night; reduced-motion safe |
| S3 | `authorizedParties` hardening + `.env.example`/CONTRACT doc updates | spine tests still green; contract doc lists the new env |
| S4 | Copy/privacy reconciliation sweep (§4.4 list) | grep for "no login"/"nothing is uploaded" returns only signed-out-qualified copy |
| S5 | Prod enablement runbook (`docs/SPINE-ENABLE.md`): Postgres → migrate → envs → smoke | Gerard can execute top-to-bottom; smoke = `GET /healthz`, 401 on bare `/api/me/state`, 200 with token |
| S6 | Mobile env switch to production Clerk (app repo, env-only PR) | app signs in against the prod instance in a dev build |

## 7. Risks

- **Dev→prod tenant switch** deletes test accounts (accepted, D-U1 note).
- **ClerkJS CDN** adds a third-party script to a previously dependency-free page — load it `async`,
  never block first paint on it; the SPA must render fully if the script fails (auth degrades to
  signed-out, same as no-env deploys).
- **Copy drift**: §4.4 has a checklist; S4's DoD is a grep, not vibes.
- Rate limiter is in-memory per-process (60 req/user/min) — fine single-instance; flag if the
  academy ever scales horizontally.

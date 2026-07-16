# Enable the Spine — accounts + progress sync in production

Step-by-step runbook (PRD-U1 S5) to take the academy deploy from "static + catalog" to
"optional Clerk sign-in + cross-device sync". Everything here is **additive**: signed-out
learners see zero change, an unconfigured deploy keeps booting exactly as today, and a
half-configured Spine refuses to boot rather than half-working (`server.js` exits if
`SPINE_ENABLED=true` but `DATABASE_URL` / `CLERK_SECRET_KEY` is missing).

## 0. Prerequisite — the production Clerk instance (D-U1)

Create the **production** Clerk application (`pk_live_` / `sk_live_` keys) with the same
sign-in methods the mobile app already offers: **email/password, Apple, Google**
(`app/sign-in.tsx` parity). Web and mobile must share this **one instance** — the Spine keys
users on `clerk_user_id`, so two instances would mint two different `users` rows and progress
would never meet across surfaces.

- The current dev tenant (`many-kid-3.clerk.accounts.dev`, `pk_test_…`) is **not** it.
  Accounts created on the dev tenant do not migrate; if any real testers exist, say so in the
  app release notes.
- In the Clerk dashboard, add the web origin(s) to the instance's allowed origins
  (`https://academy.automatos.app` + the Railway domain if it should sign in too).

## 1. Attach Railway Postgres

Railway project → the academy service → **Add → Database → PostgreSQL** (Postgres ≥ 15 —
`gen_random_uuid()` is used by the schema). Attaching injects `DATABASE_URL` into the
service's environment automatically; no manual value needed.

## 2. Migrations as a pre-deploy command (D-U3, option a)

Railway service → **Settings → Deploy → Pre-deploy command**:

```bash
npm run migrate
```

This runs `node-pg-migrate -m migrations up` against `DATABASE_URL` before each new deploy
goes live: the 7-table Spine schema on the first run, no-ops after, and any future migration
automatically. Boot itself never migrates — the fail-loud boot contract stays intact.

## 3. Set the environment (service → Variables)

| Variable | Value | Notes |
|---|---|---|
| `SPINE_ENABLED` | `true` | Mounts `/api/me` + `/api/sync`. Without the two vars below, boot **exits on purpose**. |
| `CLERK_SECRET_KEY` | `sk_live_…` | Server half: verifies session tokens, powers account deletion. Never reaches the client. |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_…` | Client half: hydrated into `public/auth-config.js` at boot — this is what makes the topbar "Sign in" appear. |
| `ACADEMY_AUTHORIZED_PARTIES` | `https://academy.automatos.app` | Comma-separated origins; tokens whose `azp` isn't listed are refused (PRD-U1 S3). Add the Railway domain only if sign-in should work there too. |
| `DATABASE_URL` | *(injected by step 1)* | Postgres for the 7-table user-state schema. |

Then redeploy. Expected boot log lines:

```
[catalog] serving contentVersion …
[spine] user-state API mounted (/api/me, /api/sync)
```

If instead the service exits with `[spine] SPINE_ENABLED=true but DATABASE_URL and/or
CLERK_SECRET_KEY is missing`, that is the fail-loud contract doing its job — fix the vars.
`CLERK_PUBLISHABLE_KEY` set *without* `SPINE_ENABLED` boots with a warning: learners could
sign in but would have no sync API — set both.

## 4. Smoke checks

1. **Health** — `curl https://academy.automatos.app/healthz` → `{"ok":true,"service":"automatos-academy"}`.
2. **Auth is enforced** — `curl -i https://academy.automatos.app/api/me/state` (no header) →
   **401** with the envelope `{"success":false,"data":null,"error":"missing_token"}`.
   (A **501** here means the Spine did not mount — re-check step 3.)
3. **Sign-in works end-to-end** — open the site, click **Sign in** (topbar), authenticate,
   then in the browser console grab a token: `await window.Clerk.session.getToken()`. Call
   `curl -H "Authorization: Bearer <token>" https://academy.automatos.app/api/me/state` →
   **200** envelope `{"success":true,"data":{"progress":[],…},"error":null}` (fresh user =
   empty state; the first authenticated call minted the `users` row).
4. **authorizedParties bites** — a token minted for an origin not in
   `ACADEMY_AUTHORIZED_PARTIES` must come back **401** `invalid_token`.
5. **Unconfigured parity (regression)** — on any deploy *without* these vars, the UI shows no
   sign-in affordance and `/auth-config.js` serves `window.ACADEMY_AUTH = null`.

## 5. Mobile — point the app at the same instance

Set the app repo's `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (EAS env / `.env`) to the **same**
`pk_live_…` from step 0 and rebuild. Same instance ⇒ same `clerk_user_id` ⇒ one `users` row —
that is the whole "one identity" guarantee. (`EXPO_PUBLIC_SPINE_API=https://academy.automatos.app`
is the U2 wire-up; the env slot already exists in the app.)

## Rollback

Unset `SPINE_ENABLED` **and** `CLERK_PUBLISHABLE_KEY`, then redeploy → the service boots as
pure static/catalog again and the sign-in affordance disappears (`auth-config.js` hydrates to
`null`). Unsetting only `SPINE_ENABLED` leaves the button up with no sync API behind it — the
boot warns about exactly this; don't ship it. All user data stays untouched in Postgres for
the next enablement; no migration down-run is needed.

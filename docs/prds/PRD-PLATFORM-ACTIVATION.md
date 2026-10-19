# PRD — Platform Activation (light up the dormant plane)

**Status:** ready — mostly owner env actions + verification. **Unlocks:** cross-device progress sync, the media admin plane, DB-served content — three built systems, one deploy.

## Why
The Spine + content-DB + media plane are fully built and tested but dormant (`SPINE_ENABLED=false`, `CONTENT_SOURCE=files`, no `DATABASE_URL`, no prod Clerk). Until they're on, web and mobile progress are per-device islands, the admin Upload button 403s (plane not mounted), and content needs a redeploy to change.

## Steps (owner + verification)
1. **Provision Postgres** (Railway) → set `DATABASE_URL`. Migrations run on boot (`npm run migrate` via docker-entrypoint). Nothing in CI connects to production Postgres: it is reachable only on Railway's private network.
2. **Content → DB (C2/U3):** done — production runs **`CONTENT_SOURCE=db`**. *Updated 2026-10-19:* content publishes on every deploy: `docker-entrypoint.sh` runs `npm run publish-content` inside Railway after migrations (the old `content-publish.yml` publish could not reach production Postgres and failed on every content merge after 19 Aug). `content-publish.yml` is now the validate + dry-run gate on content PRs. Manual lane: `railway ssh --service automatos-academy -- "npm run publish-content"`. The server polls every 60 s, so a manual publish or a rollback goes live without a redeploy.
3. **Prod Clerk instance** → `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY`; set `ACADEMY_AUTHORIZED_PARTIES`. Set **`SPINE_ENABLED=true`**. Mobile: `EXPO_PUBLIC_SPINE_API` = the academy URL.
4. **Media plane secrets:** `AWS_SDK_DEPLOY_*` (already set) on the server for presign; **`ACADEMY_ADMIN_CLERK_IDS`** = the owner's Clerk id (bootstraps the first admin until PRD-ADMIN-CONSOLE's `role` column lands); `ACADEMY_ADMIN_KEY` for machine callers.

## Verification
- `GET /api/me/state` returns for a signed-in user; sign in on web **and** mobile → the same progress on both (islands closed).
- `/api/catalog/version` (db mode) == the git `versionRollup`; a DB publish changes served content with no redeploy.
- Signed-in owner sees the Upload button on the videos page; presign returns 200.

## Notes
- Every switch is independently fail-safe (absent ⇒ prior behaviour), so activate incrementally: Postgres → content dual-run → Spine/Clerk → media.
- This PRD is the prerequisite for PRD-ADMIN-CONSOLE (needs Spine + Clerk) and unifies the two video-publish paths (retire git-JSON-baked urls in favour of `media_bindings` once the plane is live).

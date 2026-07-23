# PRD — Platform Activation (light up the dormant plane)

**Status:** ready — mostly owner env actions + verification. **Unlocks:** cross-device progress sync, the media admin plane, DB-served content — three built systems, one deploy.

## Why
The Spine + content-DB + media plane are fully built and tested but dormant (`SPINE_ENABLED=false`, `CONTENT_SOURCE=files`, no `DATABASE_URL`, no prod Clerk). Until they're on, web and mobile progress are per-device islands, the admin Upload button 403s (plane not mounted), and content needs a redeploy to change.

## Steps (owner + verification)
1. **Provision Postgres** (Railway) → set `DATABASE_URL` (+ `DATABASE_PUBLIC_URL` for CI). Run migrations (`npm run migrate` on boot via docker-entrypoint).
2. **Content → DB dual-run (C2/U3):** the `content-publish.yml` Action seeds the DB on merge (skips-with-notice until `DATABASE_URL` set). Let it dual-run ~7 days (git canonical + DB mirror, both validated by the 3 integrity tripwires in `catalog-db.js`), then flip **`CONTENT_SOURCE=db`**. Content then ships without redeploy (60 s poll).
3. **Prod Clerk instance** → `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY`; set `ACADEMY_AUTHORIZED_PARTIES`. Set **`SPINE_ENABLED=true`**. Mobile: `EXPO_PUBLIC_SPINE_API` = the academy URL.
4. **Media plane secrets:** `AWS_SDK_DEPLOY_*` (already set) on the server for presign; **`ACADEMY_ADMIN_CLERK_IDS`** = the owner's Clerk id (bootstraps the first admin until PRD-ADMIN-CONSOLE's `role` column lands); `ACADEMY_ADMIN_KEY` for machine callers.

## Verification
- `GET /api/me/state` returns for a signed-in user; sign in on web **and** mobile → the same progress on both (islands closed).
- `/api/catalog/version` (db mode) == the git `versionRollup`; a DB publish changes served content with no redeploy.
- Signed-in owner sees the Upload button on the videos page; presign returns 200.

## Notes
- Every switch is independently fail-safe (absent ⇒ prior behaviour), so activate incrementally: Postgres → content dual-run → Spine/Clerk → media.
- This PRD is the prerequisite for PRD-ADMIN-CONSOLE (needs Spine + Clerk) and unifies the two video-publish paths (retire git-JSON-baked urls in favour of `media_bindings` once the plane is live).

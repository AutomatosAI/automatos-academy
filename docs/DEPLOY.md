# Deploy — academy.automatos.app

The app is a **static SPA with hash routing** plus a thin Express server. Hash routing means every route lives under `/#/…`, so the only real server paths are `/` and static assets — **it deploys anywhere**, with or without the server.

## Option A — Static host (simplest)

Serve the `public/` directory as the site root on any static host (Cloudflare Pages, Netlify, Vercel static, GitHub Pages, S3+CloudFront).

- Build command: *none*
- Output / publish directory: `public`
- No SPA rewrite rules needed (hash routing). A catch-all → `/index.html` is harmless if the host adds one.

## Option B — Express server (matches the Automatos landing/Railway pattern)

Run the included `server.js` (Node ≥ 20). It serves `public/`, adds cache headers, reserves `/api/*` for the future backend, and has an SPA fallback.

```bash
npm install
npm start            # PORT env (default 4321)
```

- **Railway:** builds the root `Dockerfile`, which boots through `docker-entrypoint.sh`: migrations, then the course content publish (see [Course content publishing](#course-content-publishing)), then `node server.js`. Don't set a custom start command — it would skip the entrypoint.
- Health check: `GET /healthz` → `{ ok: true }`.

Pick Option B for anything beyond static serving — the Content API, badge signing, and the optional accounts + progress-sync Spine all live in `server.js`. Option A (static) can never offer sign-in: `auth-config.js` is hydrated from env at boot, so a static deploy simply renders no auth UI. Otherwise Option A is less to operate.

## Enabling accounts + sync (the Spine)

Sign-in is **optional and additive** — an unconfigured deploy renders zero auth UI and behaves exactly as before. To turn on accounts + cross-device progress sync (Railway Postgres, Clerk keys, `SPINE_ENABLED=true`, authorized-parties hardening, smoke checks), follow the step-by-step runbook: **[SPINE-ENABLE.md](SPINE-ENABLE.md)**.

## Course content publishing

Production serves course content from Postgres (`CONTENT_SOURCE=db`). Git (`public/content/**`) stays the authoring source; Postgres holds the published versions, and the server polls the `content_current` pointer every 60 s.

**Content publishes on every deploy, inside Railway.** `docker-entrypoint.sh` runs, in order:

1. `npm run migrate` — a failed migration stops the boot.
2. `npm run publish-content` — only when `DATABASE_URL` is set and `CONTENT_SOURCE=db`. It validates the tree (the same gate as `npm run validate`), writes the whole version in one transaction and flips `content_current`. An unchanged tree is a no-op, so a code-only deploy leaves the pointer alone, including a deliberate rollback. Two replicas booting at once are safe: the one that loses the insert race logs it and moves on.

   A failed publish does **not** stop the boot. The deploy log shows a `CONTENT PUBLISH FAILED — serving the last published version` banner and the server keeps serving the previous version. If nothing has ever been published, the server refuses to boot (`no content published`).
3. `exec node server.js`.

The publish has to run inside Railway: production Postgres is reachable only on Railway's private network (`DATABASE_URL`), not from GitHub Actions. `.github/workflows/content-publish.yml` therefore only validates content PRs (`npm run validate` and `npm run publish-content -- --dry-run`) and holds no database secret.

**Manual lane** (publish without a redeploy, e.g. after fixing a failed publish):

```bash
railway ssh --service automatos-academy -- "npm run publish-content"
```

**Rollback:** point `content_current` at an earlier row in `content_versions`; the server picks it up within 60 s. Redeploying the same tree keeps the rollback. A deploy with a changed tree publishes the new version and moves the pointer forward.

**Check after a deploy:** the deploy log has a `[publish]` line (`… published` or `… already published`), and `GET /api/catalog/version` returns the `contentVersion` that `npm run publish-content -- --dry-run` prints for the deployed commit.

## DNS — point the subdomain

Wherever automatos.app's DNS lives (Cloudflare / registrar):

| Type | Name | Value |
|---|---|---|
| CNAME | `academy` | the target your host gives you (e.g. `cname.vercel-dns.com`, `<proj>.pages.dev`, or the Railway domain) |

Then add `academy.automatos.app` as a custom domain in the host's dashboard so it issues the TLS cert. Propagation is usually minutes. (Want `learning.automatos.app` too? Add a second CNAME + custom domain aliasing the same deploy.)

## Verify after deploy

1. `https://academy.automatos.app/` loads the catalog.
2. Start the flagship track → curriculum shows 5 weighted domains.
3. Open a D1 lesson, answer the knowledge check (feedback appears).
4. Run a mock exam → timer counts down, score is /1000, review shows explanations.
5. Readiness shows a grade seal and the "A+ to qualify" verdict.
6. Toggle Bone/Pitch — theme persists (shared `automatos-mood` key with the main site).

## Notes

- **Local-first:** signed out, progress lives in the visitor's `localStorage` (clearing site data resets it). The synced backend now exists — the Spine (`/api/me`, `/api/sync`) with optional Clerk sign-in — and is **off by default**; enable it per [SPINE-ENABLE.md](SPINE-ENABLE.md).
- **CORS:** none needed — content JSON is same-origin under `/content`.

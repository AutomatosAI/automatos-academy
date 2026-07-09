# PRD-MT-01 — Content API v1 + paths/levels (academy repo)

**Status:** ready to build (no open decisions) · **Repo:** `automatos-academy` · **Wave:** 0
**Depends on:** nothing. **Unblocks:** MT-03..06 (app content client), Stage-0 exit (O5/D6 sign-off).
**Contract:** [CONTENT-API-CONTRACT.md](CONTENT-API-CONTRACT.md) — this PRD implements it.

## 1. Why

The app is a client of the academy catalog, but today "the catalog" is `express.static` over `public/content/**` and **paths/levels don't exist anywhere** (red-team F1, High). This PRD ships the versioned Content API from the existing files (D-R4 phase 1 — publish = deploy) and authors the D6 paths/levels objects, closing the app's hardest dependency without waiting on a DB migration. It also gives the repo a test CI workflow — `npm test` exists ([tests/engine.test.mjs](../../../tests/engine.test.mjs), 228 lines) but **nothing runs it on PRs today**.

## 2. Scope

**In:** catalog routes + ETag/version/delta per the contract · `paths.json`/`levels.json` schema, loader, seed data · validator + test extensions · CI workflow · contract tests.
**Out:** any DB (D-R4 phase 2) · auth (catalog is public) · Spine endpoints (MT-02) · draft/published workflow (factory-era; published = deployed files) · serving the web SPA from the API (it keeps `express.static`).

## 3. User stories

### US-011: Content loader + version hash
**Description:** As the API, I need an in-memory content index built at boot so responses are fast and `contentVersion` is deterministic.

**Acceptance criteria:**
- [ ] New module `server/content-index.js` (keep `server.js` thin): at boot, read `public/content/manifest.json`, every `track.json` + domain file it references, plus `paths.json`/`levels.json`; build an index keyed `(vendorId, trackId, domainId)`.
- [ ] `contentVersion` = sha256 (first 12 hex chars) over the sorted relative-path+file-hash list; recomputed only at boot.
- [ ] Malformed/missing referenced file → boot fails loudly with the offending path (no half-served catalog).
- [ ] Loader is read-only over `public/content/**`; zero writes.

### US-012: Catalog endpoints
**Description:** As the app, I can fetch the catalog root, a track, and a domain with HTTP caching, exactly shaped like today's files.

**Acceptance criteria:**
- [ ] `GET /api/catalog`, `/api/catalog/:vendorId/:trackId`, `/api/catalog/:vendorId/:trackId/:domainId` return the verbatim file JSON (no envelope) with `ETag`, `X-Content-Version`, `Cache-Control: public, max-age=300`.
- [ ] `If-None-Match` → `304`. Unknown ids → `404 {error:"not_found"}`.
- [ ] Mounted in `server.js` **before** the `/api` 501 catch-all (server.js:146) without disturbing `/api/notify`, `/api/badge/*`.
- [ ] `GET /api/catalog/version` → `{ contentVersion, generatedAt }`.

### US-013: Paths + levels (D6)
**Description:** As the app's chooser, I need real path/level objects — the mastery `path` scope's source data.

**Acceptance criteria:**
- [ ] `public/content/paths.json` + `public/content/levels.json` created per contract §3, seeded from `pathfinder.js` `recommend()` sequences (all 6) and manifest `lane` values (3 levels).
- [ ] `GET /api/catalog/paths`, `/paths/:pathId`, `/levels`, `/levels/:levelId` served like the other catalog routes.
- [ ] Every track ref resolves against the manifest; every live track appears in exactly one level matching its `lane`.

### US-014: Delta endpoint
**Acceptance criteria:**
- [ ] `GET /api/catalog/changes?since=v` per contract §5; per-boot journal of the last 20 version manifests persisted to a single JSON file (survives restarts on the same volume; empty journal → every `since` answers `410`).
- [ ] Unknown/expired `since` → `410 Gone`; client contract = full refetch.

### US-015: Validation + tests + CI
**Acceptance criteria:**
- [ ] `scripts/validate-content.mjs` extended: paths/levels schema, ref resolution, one-level-per-track, no path of only unpublished tracks.
- [ ] New `tests/content-api.test.mjs` (same zero-framework style as `tests/engine.test.mjs`): boots the app in-process, asserts every contract endpoint's shape, ETag/304 behavior, 404s, 410 delta expiry, and **byte-compatibility of `/api/catalog` with `manifest.json`**.
- [ ] New `.github/workflows/ci.yml`: `npm ci && npm run validate && npm test` on every PR + push to main. **First test CI in this repo.**
- [ ] CI green on the PR.

## 4. Functional requirements

- FR-1: All contract §2 endpoints, shapes verbatim per §1/§3.
- FR-2: Version/ETag/delta semantics per contract §4/§5.
- FR-3: Boot-fail-loud on invalid content; validator catches the same problems pre-merge.
- FR-4: No new runtime deps beyond stdlib + existing `express`/`compression` (hashing via `node:crypto`).
- FR-5: SPA behavior unchanged (static serving, SPA fallback, badge/notify routes untouched).

## 5. Non-goals

No DB, no auth, no draft states, no write endpoints, no CORS gymnastics (native app has no origin; permissive `Access-Control-Allow-Origin: *` on GET catalog routes is fine and matches today's public static posture).

## 6. Success

- App content client (MT-03) builds against the live API with zero shape adapters.
- O5/D6 sign-off checkboxes in the contract can be ticked.
- The repo's engine tests finally run on every PR.

## 7. Open questions

None — this PRD is deliberately the decision-free start. (Path *copy* — names/taglines in §3 seeds — is editorial and cheap to change; flagged for Gerard's read, not blocking.)

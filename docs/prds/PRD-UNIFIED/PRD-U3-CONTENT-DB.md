# PRD-U3 — Content to Postgres, behind the unchanged Content API

**Status:** DRAFT · independent of U1/U2 (needs only `DATABASE_URL`) · blocked on D-U6..D-U9
**Repo:** `automatos-academy` (server + SPA loader; app repo needs **zero changes**)

## 1. Problem

Learning content (11 tracks, 83 JSON files ≈ 4.75 MB, 1,691 questions, 60 scenarios, 85 labs)
lives as static JSON in `public/content/`, read three different ways: the SPA fetches the files
directly, the Content API (`server/catalog.js`) loads them into an in-memory index at boot, and
shells/OG pages re-read them from disk. Publishing any content change requires a redeploy, and the
version journal is a gitignored local file — on ephemeral hosts every restart forgets history and
forces mobile clients through the 410 full-refetch path. `catalog.js` describes itself as phase 1
of exactly this migration ("file→DB, D-R4 phase 2") and `tests/content-api.test.mjs` exists to
hold the contract steady while the backend swaps.

## 2. Goals

1. **Git stays canonical for authoring.** Swarm agents, PR review, `npm run validate`, engine
   tests, and the tutor-corpus exporter keep reading the files. The DB is the **runtime store**.
2. A **publish step** ingests the validated tree into Postgres; the running server picks it up
   without a redeploy (D-U7).
3. The Content API contract is **byte-identical**: same routes, same response bodies, same
   `ETag`/`X-Content-Version`/`Cache-Control`, same `/version` + `/changes` semantics. The mobile
   app (ETag-conditional F16 cache, delta refresh, podcasts) must not notice.
4. The **journal becomes durable** (a table, not a local file) — `?since=` survives restarts;
   410 becomes rare instead of every-deploy.
5. The web SPA consumes the Content API instead of static files — one loader module changes.
6. Repo diet (D-U8): media leaves git per the existing `VIDEO_HOSTING.md` plan (767 MB → < 80 MB).

## 3. Non-goals

- No authoring CMS/admin UI; no content editing anywhere but git.
- No contract changes, no new public routes (one internal reload mechanism per D-U7).
- No per-user content and no auth on the catalog — it stays public + CORS `*`.
- Media binaries do NOT go into Postgres — they move to S3/CloudFront (D-U8) or stay as static
  files; only their URLs live in content JSON, as today.

## 4. Design

### 4.1 Schema (net-new; the Spine's per-user `content_cache` is unrelated)

```
content_documents (
  id            bigserial PK,
  scope_kind    text CHECK IN ('manifest','track','domain','paths','levels','podcasts'),
  vendor_id     text,        -- track/domain scopes
  track_id      text,        -- track/domain scopes
  domain_id     text,        -- domain scope only
  payload       jsonb NOT NULL,      -- the file, verbatim
  sha256        text  NOT NULL,      -- hash of the canonical bytes (ETag source)
  bytes         int   NOT NULL,
  content_version text NOT NULL,     -- the v_<12hex> rollup this row belongs to
  published_at  timestamptz NOT NULL default now(),
  UNIQUE (content_version, scope_kind, vendor_id, track_id, domain_id) NULLS NOT DISTINCT
)
content_versions (
  content_version text PK,           -- v_<12hex>, same derivation as today
  scopes          jsonb NOT NULL,    -- the (path,hash) rollup snapshot (journal entry)
  published_at    timestamptz NOT NULL default now()
)
```

- Hashing and `contentVersion` derivation are **the same functions** used today (per-file sha256
  → sorted rollup) so ETags and version strings are stable across the files→db flip.
- `content_versions` IS the journal: `computeChanges(from,to)` diffs two snapshot rows; retention
  ≥ the current 20 entries (cheap — keep all).
- Publishing is append-only + atomic: insert all rows for the new version in one txn, then flip a
  `content_current` pointer row. Rollback = point back.

### 4.2 Ingest / publish

`scripts/publish-content.mjs`:
1. Run `validate-content.mjs` (hard gate — same validator as CI).
2. Build the index from disk exactly as `buildContentIndex` does (reuse it).
3. Skip publish if `contentVersion` already exists (idempotent).
4. Write `content_documents` + `content_versions` in a transaction; flip current.

Trigger (D-U6): CI job on merge to `main` (needs `DATABASE_URL` secret) + manual dispatch. Local
runs are possible but never required.

### 4.3 Serving

- `buildContentIndex` gains a twin loader: `CONTENT_SOURCE=db` loads the current version's rows
  into the **same in-memory index shape** at boot (keeps zero per-request I/O and the fail-loud
  boot). `files` (default) behaves exactly as today — the no-DB static deploy keeps working.
- **Refresh without redeploy (D-U7a):** every 60 s poll `SELECT content_version FROM
  content_current`; on change, rebuild the index atomically and swap. Bounded staleness ≤ 60 s +
  CDN/client `max-age=300`.
- **Shells + OG:** flip boot order — build the index first, then `generate-shells.mjs` and
  `server.js trackMeta()` read **from the index** (never from disk). Same emitted HTML; one code
  path for both sources.
- `/api/catalog/changes?since=` reads `content_versions` — durable across restarts (goal 4).

### 4.4 Web SPA switch

`public/js/content.js` (the single seam — 10 view/engine modules import it, none touch paths):
- `loadCatalog()` → `GET /api/catalog`; `loadTrack()` → `GET /api/catalog/:vendor/:track` then
  domains **by `domain.id`** (from the track's domain list) instead of by `domainFiles[]` filename.
- Assembled `{vendorId, trackId, ...track, domains}` object is unchanged ⇒ zero view changes.
- Drop `cache:"no-cache"`; let the browser honour `ETag`/`max-age=300` (native conditional GETs).
- Static `/content/*.json` serving remains during dual-run, then can be retired for JSON (media
  URLs unaffected).

### 4.5 Cutover (D-U9)

Dual-run: publish on every main merge while `CONTENT_SOURCE=files`; a CI check asserts
**db-index ≡ file-index byte-for-byte** (extend `content-api.test.mjs`: build both, compare every
scope's bytes + the version string). After 7 green days flip `CONTENT_SOURCE=db` on Railway;
rollback is flipping it back — files still ship in the image until a later cleanup PR.

### 4.6 Media (D-U8 — execute the existing plan)

Run `deploy-media.yml` migrate → CDN URLs via `register-videos.mjs --swap-cdn` on main →
`git rm` the 24 MP4s + 2 M4As (~761 MB). Podcast `audioUrl`s move to absolute CDN URLs (the
mobile `resolveMediaUrl` already handles absolute URLs). Blocked on the `AWS_SDK_DEPLOY_*`
secrets copy (pre-existing). Content-to-DB does not depend on this slice; it just belongs to the
same clean-up motion.

## 5. What must keep reading files (unchanged, by design)

`validate-content.mjs`, `tests/engine.test.mjs` (all-tracks sweep), `export-tutor-corpus.mjs`,
`register-videos.mjs`, `token-parity.mjs` — all dev/CI-time tools operating on the canonical git
tree. Only runtime readers (catalog index, shells, `trackMeta`, the SPA) move.

## 6. User stories

- **US-U20** — Author merges a content fix; within ~1 minute the live site and the app's next
  refresh serve it — no redeploy.
- **US-U21** — A mobile client with a 3-version-old cursor gets a precise `changes[]` delta after
  a server restart (durable journal), instead of a 410 full refetch.
- **US-U22** — `CONTENT_SOURCE` unset/`files` + no `DATABASE_URL` boots exactly as today's static
  deploy (DEPLOY.md Option A intact).
- **US-U23** — A malformed publish cannot go live: the validator gates ingest, and a bad current
  pointer flip is one UPDATE to revert.

## 7. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | migrations: `content_documents` + `content_versions` + current pointer | `npm run migrate` green in CI spine job |
| S2 | `publish-content.mjs` (validate → hash → txn insert → flip) | idempotent re-run proven; version string equals file-mode's for the same tree |
| S3 | `CONTENT_SOURCE=db` index loader + 60 s refresh + durable `/changes` | `content-api.test.mjs` extended: db-index ≡ file-index bytes; contract tests green in both modes |
| S4 | shells/`trackMeta` read from the index; boot order flipped | emitted shell HTML byte-identical (snapshot test); no `readFileSync(content)` left at runtime |
| S5 | CI publish job on main (D-U6) + dual-run equivalence check | merge → rows appear; check red on any divergence |
| S6 | SPA `content.js` → Content API | all views render from API; a cold browser makes conditional GETs (ETag observed) |
| S7 | (D-U8) media→CDN cutover + repo purge | repo < 80 MB; app streams podcast/video from CDN URLs |

## 8. Risks

- **Byte-fidelity is the whole game** — jsonb normalises key order/whitespace, which would change
  hashes and bust every client cache. Mitigation: hash + serve the **canonical serialized bytes**
  (store them, or store `payload` for querying and a `canonical bytes` column for serving; S3's
  equivalence test is the tripwire).
- **Two sources drifting during dual-run** — the CI equivalence check is mandatory (S5), not
  optional.
- **DB down at boot with `CONTENT_SOURCE=db`** — fail-loud (refuse to boot), same posture as the
  Spine; Railway restarts + the previous deploy remain the fallback. Poll failures after a good
  boot keep serving the last good index (log + carry on).
- **410 semantics** — journal retention is now effectively infinite; keep the 410 path tested
  anyway (fresh DB, pre-history cursor).

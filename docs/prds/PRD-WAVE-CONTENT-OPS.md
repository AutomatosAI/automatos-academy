# PRD-WAVE-CONTENT-OPS — one content plane: media on the CDN, words in the DB, an admin/API surface both Gerard and Automatos use

**Status:** DRAFT for review — decision boxes D-CO1…D-CO7 await Gerard · **Owner:** Academy (C5/C6 name companion changes on the automatos-ai side — flagged, not designed here)
**Authored:** 2026-07-23 from a three-repo recon: academy ground truth (file:line below), `automatos-widget-sdk` CDN deploy extraction, `automatos-ai` S3/upload/KB extraction.
**North star (Gerard's words):** *"Move all videos/audio to S3/CDN… move all content out of the container… where do we store the text content — DB? Build knowledge graphs in Automatos for the live tutor… Academy displays it, the pipeline converts it, Automatos reviews what exists so it doesn't duplicate content. As admin I go to any page, placeholders get an upload button… the same upload could be an API Automatos uses."*
**Companions:** [PRD-VOICE-PIPELINE](./PRD-VOICE-PIPELINE.md) (C4 operationalizes its S2/S3) · PRD-U3 (C2 activates it) · PRD-OPS-FRESHNESS (verification chips ride the same plane).

---

## 1. The shape (one diagram)

```
                    AUTHORING                      SERVING                       CONSUMERS
  Automatos ──► content JSON (git, validated) ──► Postgres (U3 tables) ──► Academy web + app (display)
      │                                             │        ▲
      │                                             │        │ media_bindings overlay (C3)
      ▼                                             ▼        │
  admin/API upload (C3) ──► S3 ──► CloudFront CDN ◄─┴── voice pipeline (C4: text→mp3, content-addressed)
                                                    │
                                   corpus sync (C5) ──► Automatos workspace KB (tutor grounding, KG)
                                   inventory API (C6) ◄── Automatos generation (dedup check-before-create)
```

**The editorial boundary that makes it clean:** *words* are authored → git (reviewed, validated, versioned) → published to Postgres. *Media bindings* (which MP4/MP3 fills which slot) are **operational** → DB only, written by the admin UI or the API — no git commit, no redeploy, live in ≤60s (the U3 poll). Text never lives on S3; binaries never live in git (after C1).

## 2. Ground truth (recon 2026-07-23)

**Academy — more is built than not:**
- **Media→CDN is BUILT, dormant:** `.github/workflows/deploy-media.yml` — `migrate` mode (one-time: `public/content/*/videos/` → `s3://$BUCKET/academy/<vendor>/videos/`) + `staging` mode (ongoing `media-staging/<vendor>/<track>/`), 30-day cache-control, CloudFront invalidation, dry-run. Blocked ONLY on the 5 `AWS_SDK_DEPLOY_*` repo secrets (same names as widget-sdk). `scripts/register-videos.mjs` `--swap-cdn` rewrites repo URLs → CDN; `--publish` flips placeholders by slot-id-filename (`v-d1-2.mp4`).
- **Text→DB is BUILT, dormant (U3):** `scripts/publish-content.mjs` (validate → canonical bytes → one-txn pointer flip; idempotent; rollback = repoint) + `.github/workflows/content-publish.yml` (push-to-main on `public/content/**` + dispatch; **skips with a notice until the `DATABASE_URL` secret exists**). Server serves `CONTENT_SOURCE=files|db` with a 60s poll.
- **Video slots are upload targets:** `track.json` `videos[]` = `{id, title, provider, url, status:"placeholder", domainIds}` — the admin button binds a URL into exactly this shape.
- **Admin identity gap:** spine `users` = `id, clerk_user_id, workspace_id, plan, created_at` — **no role column**; `/api/me` returns no admin bit. Machine-caller precedent: the digest's env admin key (`DIGEST_ADMIN_KEY` header pattern).
- Voice: app `RemoteSpeaker` MERGED (#40) — plays content-addressed MP3s, device fallback; generation S2/S3 pending (this wave's C4).

**widget-sdk (the CDN discipline to copy):**
- CI-only `aws s3 sync`; **two cache tiers**: pinned/immutable paths `max-age=31536000, immutable` (never invalidated) vs rolling alias `max-age=3600` + targeted CloudFront invalidation. 5 `AWS_SDK_DEPLOY_*` secrets; bucket `automatos-widget-sdk`, domain `widgets.automatos.app` (dist auto-detected by alias). CDN serves `Access-Control-Allow-Origin: *` (set at CloudFront, out-of-band — no in-repo CORS file). **No presigned-PUT precedent in that repo** (nor in automatos-ai — presigned **GET** only, `attachments/store.py:305` 900s, `api/documents.py:332` 3600s). The academy's browser upload is the family's first presigned PUT — standard `@aws-sdk/s3-request-presigner`, but net-new pattern, flagged honestly.

**automatos-ai (the platform the sync talks to):**
- Upload: `POST /api/documents/upload` — multipart, **50MB cap**, MIME allowlist (md/txt/pdf/docx/csv/json/xlsx), **SHA-256 per-workspace dedup → returns `status:"duplicate"`** (re-push is naturally idempotent). Inventory: `GET /api/documents/` (filters + pagination) + `/analytics`. Retrieval for the tutor: `POST /api/documents/rag/retrieve`.
- **Auth reality for a machine caller:** `get_request_context_hybrid` accepts Clerk JWT **or** the platform-wide `x-api-key: ORCHESTRATOR_API_KEY` + `X-Workspace-ID`. Per-workspace `ak_srv_*` keys carry a `documents:write` scope **but are not accepted on the documents plane today**; `POST /api/knowledge/share` is a **stub**; `content_hash` is computed but not exposed and there's no lookup-by-hash. → C5 v1 rides the admin key; the scoped-key + hash-exposure improvements are the **companion platform PRD** (D-CO6).

## 3. Workstreams

### C1 — Media exodus (videos out of the container, onto the CDN)
| # | Slice | What | DoD | Effort |
|---|---|---|---|---|
| C1-S1 | **Secrets + migrate run** | Gerard copies the 5 `AWS_SDK_DEPLOY_*` secrets (widget-sdk → academy, or org-level) → dispatch `deploy-media.yml` `mode=migrate` (dry-run first) | All `public/content/*/videos/*.mp4` present under `s3://…/academy/<vendor>/videos/`; dry-run log attached | S (Gerard + one dispatch) |
| C1-S2 | **URL swap + git rm** | `register-videos.mjs --swap-cdn` on main → verify players → `git rm` the MP4s (+`.gitignore` guard) | Repo tree −~750MB; container image slim; all videos play from `widgets.automatos.app/academy/…`; site smoke green | S |
| C1-S3 | **Cache-tier alignment** | Videos keep 30-day TTL (slot-named, re-uploadable). **Audio (C4) uses the widget-sdk immutable tier** — content-addressed names ⇒ `max-age=31536000, immutable`, never invalidated | Headers verified on both classes | S |

*Note: git history still carries the old MP4s (clone stays heavy; working tree and image do not). History rewrite is deliberately out of scope — not worth the force-push risk post-incident.*

### C2 — Text plane activation (U3 dual-run → DB)
| # | Slice | What | DoD | Effort |
|---|---|---|---|---|
| C2-S1 | **Seed** | Gerard adds the `DATABASE_URL` repo secret (PUBLIC proxied Railway URL — internal `.railway.internal` is unreachable from CI) → dispatch `content-publish.yml` | `content_versions` row exists; server log shows db index adopted on poll | S (Gerard + one dispatch) |
| C2-S2 | **Dual-run → flip** | 7 days `CONTENT_SOURCE=files` with publishes flowing; equivalence suite already gates CI → flip `CONTENT_SOURCE=db` on Railway | Site serves from Postgres; rollback documented (repoint `content_current`) | S |

### C3 — Media bindings + the admin surface (your placeholder-upload, as UI **and** API)
The core new build. One plane, two callers (browser admin + Automatos):

- **Table `media_bindings`** (spine migration): `id, vendor_id, track_id, slot_id, kind ('video'|'audio'|'transcript'), url, content_type, size_bytes, uploaded_by, created_at, UNIQUE(vendor_id, track_id, slot_id, kind)`. The content index **overlays** bindings at serve time: a bound slot renders `status:"published"` + the bound URL, beating the JSON placeholder. Git JSON remains the slot *definitions*; DB holds the *fulfilment*.
- **API** (academy server, all admin-gated):
  - `POST /api/admin/media/presign` `{vendor, track, slotId, kind, filename, contentType}` → validates slot exists + contentType/size allowlist → returns `{putUrl (presigned S3 PUT, 15min), finalUrl (CDN)}`. Key layout: `academy/<vendor>/<track>/<slotId>-<sanitized-filename>`.
  - `POST /api/admin/media/bind` `{vendor, track, slotId, kind, url}` → verifies the object exists (HEAD) → upserts the binding. Unbind = DELETE.
  - `GET /api/admin/media/slots?vendor&track` → every slot with its state (placeholder/bound/published-in-git) — powers the UI and lets Automatos see what's unfilled.
- **Admin gating (D-CO1):** v1 = `ACADEMY_ADMIN_CLERK_IDS` env allowlist checked server-side on the Clerk-verified user + `isAdmin` in `/api/me`; machine callers use `X-Admin-Key: $ACADEMY_ADMIN_KEY` (the digest pattern). v2 (if roles multiply) = `users.role` column.
- **UI:** signed-in admin on `#/t/<vendor>/<track>/videos` sees Upload on each placeholder card (file→presigned PUT→bind→card flips live); an Unbind/Replace affordance on bound cards; audio slots get **Generate** (→ C4) instead of upload.
- **Server-side AWS:** the academy server gets the same 5 values as **Railway env vars** (server mints presigns; repo is public — keys never in client or repo). New: `@aws-sdk/client-s3` + `s3-request-presigner` (family-first presigned PUT, flagged).

### C4 — Voice generation, operationalized (PRD-VOICE-PIPELINE S2/S3 land here)
- `scripts/generate-audio.mjs` + `KokoroProvider`/`ElevenLabsProvider` + the ported `speakable` segmenter (golden-fixture test vs the app's) — as specced in PRD-VOICE-PIPELINE.
- **Triggers, all three:** (a) CLI/workflow_dispatch (backfill: whole library ≈ $2 Kokoro); (b) `content-publish.yml` hook — diff-only via content-hash HEADs, so new Automatos content self-voices; (c) **admin button** "Generate audio" per lesson/track → academy server endpoint runs single-item generation in-process (seconds) — full runs stay in CI.
- Languages later: namespace `academy/audio/<voiceKey>/…` where `voiceKey` encodes voice+lang (`kokoro-en-af-v1`, `elevenlabs-es-auto-v1`); gated on *translated content*, not pipeline work.
- **Blockers:** the `automatos-voice` pod URL (probe 404'd — deploy/confirm) + C1 secrets + the voice pick (D-CO3).

### C5 — Automatos knowledge sync (the tutor's brain, fed automatically)
- On content publish: export the corpus delta (`npm run tutor-corpus` machinery) → push each changed doc to the platform: `POST /api/documents/upload` with `x-api-key: $ORCHESTRATOR_API_KEY` + `X-Workspace-ID: <Academy workspace>`. Platform-side SHA-256 dedup makes re-pushes no-ops; **replace semantics** = list-by-filename (`GET /api/documents/?search=`) → delete superseded → upload new. The workspace KB/graph machinery (the platform's, not ours) takes it from there — the tutor grounds on it via `rag/retrieve`.
- **Honest platform gaps (companion PRD on automatos-ai, D-CO6 — flagged, not designed here):** accept scoped `ak_srv_*` keys on the documents plane (so the Academy doesn't hold the platform-admin key); expose `content_hash` + add lookup-by-hash; a real batch ingest (today's `/api/knowledge/share` is a stub).

### C6 — Inventory API (Automatos checks before it creates)
- `GET /api/catalog/inventory` (academy, `X-Admin-Key`-gated): every lesson/question/scenario id + title + **content hash**, derived from the served index (files or db mode). Automatos generation calls this to *check-before-create* — your no-duplicates requirement — and can diff its plan against what exists. Cheap: the index is already in memory; this is a serializer.

## 4. Sequencing

- **Phase 0 (Gerard, ~15 min total):** copy 5 `AWS_SDK_DEPLOY_*` repo secrets + add them as Railway service env → add `DATABASE_URL` repo secret → (when ready) pod URL + voice pick.
- **Phase 1 (same day as Phase 0):** C1-S1/S2 migrate + swap + git rm · C2-S1 seed. *Two dispatches and a script run — the container slims and the DB fills the first day the secrets exist.*
- **Phase 2:** C3 (bindings table, presign/bind API, admin UI) + C6 (inventory). C2-S2 flip after its 7-day dual-run.
- **Phase 3:** C4 first render (pod-gated) + C5 sync hook. Companion platform PRD per D-CO6.

Verification: CI-only as ever (spine suite covers the bindings table + admin routes; equivalence suite already guards C2; presign/bind get contract tests with mocked S3; device/site smokes per surface).

## 5. Security (public repo, real keys)
AWS creds: repo secrets (CI) + Railway env (server) only — never client, never committed. Presign: 15-min TTL, content-type + size allowlist, key path locked to `academy/<vendor>/<track>/`, slot must pre-exist (no arbitrary-key writes). Admin: server-side Clerk allowlist check (client `isAdmin` is cosmetic); machine key via header, rotatable env. Platform admin key (`ORCHESTRATOR_API_KEY`) lives ONLY in the academy server/CI env for C5 — and D-CO6's scoped keys retire even that. CDN stays `ACAO:*` (public content, immutable objects).

## 6. Decision boxes (Gerard)

| # | Decision | Recommendation |
|---|---|---|
| D-CO1 | Admin gating | **Env allowlist of Clerk IDs + `X-Admin-Key` for machines** (v1); `users.role` column only when roles multiply |
| D-CO2 | Do DB bindings materialize back to git? | **One-way DB overlay** + an export script for portability (run ad-hoc); no auto-commits from prod |
| D-CO3 | Voice pick (blocks C4 render) | Shortlist of Kokoro voices on the first pod render; you choose by ear |
| D-CO4 | Video cache tier | **Keep 30-day TTL** for slot-named videos (re-uploadable); audio immutable 1yr (content-addressed) |
| D-CO5 | Academy→Automatos auth for C5 v1 | **Platform admin key in academy server env** (works today), retired by D-CO6's scoped keys |
| D-CO6 | Companion platform PRD (scoped keys on documents plane · expose `content_hash` + by-hash lookup · real batch ingest) | **Yes — author it** as the automatos-ai side of this wave; C5 v1 doesn't wait for it |
| D-CO7 | Automatos target workspace for the corpus | You name the Academy workspace id (the tutor's ak_pub already exists — same workspace) |

---

*Traceability: activates PRD-U3 (D-U6/D-U9 dual-run) and the PRD-GROWTH media plan; operationalizes PRD-VOICE-PIPELINE S2/S3; extends the `videos[]` slot system (register-videos.mjs conventions preserved — CI bulk path stays); follows widget-sdk's cache/invalidations discipline and automatos-ai's config-choke/env posture; the C5 contract is grounded in `api/documents.py` + `core/auth/hybrid.py` reality (admin-key + X-Workspace-ID), with the scoped-key gap named for the platform pod rather than silently worked around.*

# PRD — Content Lifecycle (Automatos generates + reviews + verifies daily)

**Status:** **academy side BUILT** (write-back API + drafts review + serve-time overlay + admin Content tab); the **platform half** (cert-watch mission, daily-routine composition) is a **cross-pod automatos-ai follow-up** — see "Delivered" + "Cross-pod remainder" below. **Why:** Gerard wants Automatos to generate, review, cross-reference, verify and refresh Academy content every day. The platform primitives exist (missions, `save-as-routine`, `scheduled_tasks`, watches, the C6 inventory) but are **not composed or wired to the academy**, and there was **no way to push generated text back** (only media bindings) — story 1 closes that gap.

## The loop
```
1. READ    GET /api/catalog/inventory           ← id+title+hash of every lesson/question/video (BUILT, C6)
2. GENERATE draft (agent grounded in sourceOfTruth)
3. REVIEW   mission approval + budget cap        ← ABF-M05 guardrail (BUILT)
4. VERIFY   Watch per sourceOfTruth URL → diff load-bearing facts → drift report (cert-watch — UNBUILT)
5. PUBLISH  media → /api/admin/media/bind (BUILT) · text → POST /api/admin/content (NEW)
6. GROUND   corpus sync → documents plane → KG rebuild → tutor rag/retrieve
```

## Must-build
1. **Academy text write-back API — `POST /api/admin/content`** (scoped key + role). Body = a lesson/question/domain patch. **Writes a draft `content_version`** in the DB store (C2), never git — an admin approves in the console (PRD-ADMIN-CONSOLE S5) to flip the pointer. Keeps git as the offline canonical, the DB as the live target. Idempotent by content hash.
2. **cert-watch mission** (PRD-OPS-FRESHNESS §6) — one Watch per `verification.sourceOfTruth` URL; on change, diff the load-bearing facts and open a drift report (the flagship dogfood; `automatos-ai/api/watches.py` is the substrate).
3. **Compose the daily routine** — a saved Mission (`save-as-routine` + `scheduled_tasks`) that runs inventory-diff → generate → approve → verify → publish → **trigger KG rebuild** (manual today, `knowledge_graph.py:102`).
4. **Cross-reference guard** — the generator must call `/api/catalog/inventory` first and skip ids/titles/hashes that already exist (check-before-create), so daily runs never duplicate.

## Depends on
- PRD-PLATFORM-DOCUMENTS-FIXES (tags persist, KG auto-rebuild) for the grounding half to actually work.
- PRD-ADMIN-CONSOLE S5 (the human approval surface for drafts).

## Verification
- A mission dry-run reads inventory, proposes N drafts, 0 duplicates.
- `POST /api/admin/content` creates a draft version; approving it in `#/admin` serves the change via `/api/catalog`.
- A cert-watch fires on a changed source and files a drift report.
- After a corpus sync + KG rebuild, the tutor `rag/retrieve` cites the new doc **with its course tags** (needs the platform tags fix).

---

## Delivered (academy side — this PR)

**Story 1 (text write-back) + its consumer surface + the serve path are built and tested** — the seam Automatos's daily mission writes to, and the human approval gate:

- **`content_drafts`** table (migration `1784760000000_content-drafts.js`) — one scope's proposed canonical bytes + status (`pending`/`approved`/`rejected`/`superseded`). Partial UNIQUE indexes enforce **one approved override per scope** and **pending idempotency** (NULLS NOT DISTINCT, PG15+, same as `content_documents`).
- **`POST /api/admin/content`** (`server/content/routes.js`) — write-back a draft. Same **two-principal gate as media** (machine `X-Admin-Key` / browser Clerk allowlist, reused `createRequireAdmin`). Validated (`server/content/validate.js`: scope shape, byte-fidelity JSON, 1 MB ceiling, domain-id match) and **idempotent** (an identical pending draft returns the existing row, never stacks — so daily re-runs don't flood the queue).
- **Review API** — `GET /drafts`, `GET /drafts/:id`, `POST /drafts/:id/approve` (one atomic CTE: supersede the scope's prior approved, then approve — exactly one live override per scope), `POST /drafts/:id/reject` (doubles as **retire** a live override → drops back to published).
- **Serve-time overlay** (`server/content/overlay.js` + `overrides-cache.js`, wired into `createCatalogRouter` via `getOverride`, exactly like media `getBindings`) — an approved draft renders over the git/DB base at `/api/catalog` (manifest · paths · levels · track · domain) **with no republish and no pointer flip**. Immutable + fail-soft (a malformed draft is ignored, never white-screens the catalog); content override applies **before** the media overlay, so a bound video url still wins.
- **Admin Content tab** (`public/js/views/admin-content.js`) — the review queue (approve/reject), live overrides (retire), a paste-JSON propose form, and per-draft JSON view.

**Activation:** dormant until the Spine is live (it mounts inside `SPINE_ENABLED`), and the overlay is null-safe until then (files/spine-less deploys serve git untouched). The write-back targets the DB overlay, so it works in **both** `CONTENT_SOURCE=files` and `=db` (the overlay sits on top of whichever base is served).

**Scope note (honest):** the overlay is wired for the verbatim doc scopes (manifest/paths/levels/track/domain). `podcasts` drafts are accepted + reviewable but the derived `/podcasts` endpoints don't yet read the overlay — a trivial same-pattern follow-up, called out so "content" doesn't read as "every endpoint."

## Cross-pod remainder (automatos-ai — NOT this repo)

Stories 2–4 are **platform-side** (the automatos-ai pod owns missions/watches/KG) and can't be built or tested from the academy repo — flagged, not silently deferred:

- **Story 2 — cert-watch mission** (a Watch per `verification.sourceOfTruth` → drift report; `automatos-ai/api/watches.py` substrate).
- **Story 3 — daily routine composition** (`save-as-routine` + `scheduled_tasks`: inventory-diff → generate → approve → **`POST /api/admin/content`** (this PR) → trigger KG rebuild). The academy write-back is now the ready publish target.
- **Story 4 — generator cross-reference guard** (call `/api/catalog/inventory` first, skip existing ids/hashes). The inventory endpoint (C6) already exists; this is generator-prompt discipline, platform-side.
- Depends on **PRD-PLATFORM-DOCUMENTS-FIXES** (tags persist, KG auto-rebuild) for the grounding half — landed via automatos-ai #599.

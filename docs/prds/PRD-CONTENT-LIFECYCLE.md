# PRD — Content Lifecycle (Automatos generates + reviews + verifies daily)

**Status:** design. **Why:** Gerard wants Automatos to generate, review, cross-reference, verify and refresh Academy content every day. The platform primitives exist (missions, `save-as-routine`, `scheduled_tasks`, watches, the C6 inventory) but are **not composed or wired to the academy**, and there is **no way to push generated text back** (only media bindings).

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

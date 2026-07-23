# PRD — Platform Documents-Plane Fixes (automatos-ai / D-CO6)

**Status:** design. **Repo:** `automatos-ai` (companion-platform work, not the academy). **Why:** the academy → Automatos knowledge sync (the tutor's KG) has real, mostly-unflagged breaks on the platform side. Without these, the corpus lands but the tutor can't map it to courses, and every sync is over-privileged.

## Fixes (priority order)

1. **🔴 Persist `tags` on upload.** `orchestrator/api/documents.py:206-218` parses `tags` but creates the `Document(...)` row with `tags=` **commented out** ("TEMPORARILY DISABLED — SQLAlchemy array bug"); `DocumentResponse` returns `doc.tags or []` (empty). The entire corpus-sync contract (`tags=academy,<vendor>,<track>,<domain>` = the course mapping) is **silently dead**. Fix the array-column write (correct the SQLAlchemy `ARRAY(Text)` mapping / use the JSONB path) so tags persist + return.
2. **Expose `content_hash` + by-hash lookup.** It's computed + stored (`documents.py:160,216`) but not exposed; add it to `DocumentResponse` and support `GET /api/documents/?content_hash=` so the academy's `--replace` matches by hash (a rename no longer orphans the old doc).
3. **Accept scoped keys on the documents plane.** Only the broad `ORCHESTRATOR_API_KEY` works today; accept `ak_srv_*` keys carrying `documents:create|delete` so the academy stops holding an over-privileged key.
4. **KG auto-rebuild (or a cheap incremental) on upload.** `knowledge_graph.py:102` is a **manual** full rebuild; the daily lifecycle must currently trigger it explicitly. Add an on-upload incremental index (or a debounced rebuild) so freshly-synced docs are groundable without a manual step.
5. **`/api/knowledge/share`: make it real or remove it.** `knowledge.py:33-58` returns a fabricated `{knowledge_id, status:"shared"}` with no persistence — cross-workspace sharing is a stub. Either implement it (so the academy corpus can be shared across workspaces instead of re-ingested per workspace) or delete the endpoint so callers don't depend on a no-op.

## Verification
- Upload a doc with `tags=academy,anthropic,cca-f` → `GET /api/documents/?search=` returns the doc **with those tags**; the tutor `rag/retrieve` can filter by course tag.
- `--replace` in `sync-tutor-corpus.mjs` finds the prior doc by `content_hash` after a filename change.
- A scoped `ak_srv_*` key with `documents:create` uploads successfully (no need for `ORCHESTRATOR_API_KEY`).
- A freshly-synced doc is groundable without a manual `/graph/build`.

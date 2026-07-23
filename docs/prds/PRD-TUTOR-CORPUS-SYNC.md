# PRD — Tutor Corpus Sync (content → Automatos knowledge graph)

**Status:** built · **Wave:** CONTENT-OPS C5 · **Depends on:** the Automatos documents plane (`api.automatos.app`)

## Why

The Academy tutor is an Automatos workspace agent. For it to "understand every
bit of content" — to answer *"explain domain 3 of GH-300"* or *"why is that
answer right"* with real course context — the platform's **knowledge graph**
needs the teaching content, **tagged and mapped to each course**. Today that
upload is a manual checklist (`tutor-corpus/INDEX.md`). This makes it a one-click,
idempotent, tagged sync.

**Videos are out of scope by decision** — Automatos doesn't need them; it needs
the words. This syncs only the JSON/text content as markdown.

## Design

```
public/content/**            export-tutor-corpus.mjs         sync-tutor-corpus.mjs
 (the live tracks)  ───────▶  tutor-corpus/*.md          ───▶  POST /api/documents/upload
                              + corpus-manifest.json            (file + tags + description)
                                     │                                   │
                          per-file {vendor,track,domain,          Automatos builds the
                           lane,kind,title,tags}                  knowledge graph per workspace
```

1. **Export** (existing, extended). `export-tutor-corpus.mjs` already emits one
   clean markdown doc per track-overview and per domain (227 lessons · 1,691 Q&A
   with the *why*, across all live tracks). It now also writes
   **`corpus-manifest.json`** — the machine-readable index carrying each file's
   `{vendor, track, domain, lane, kind, title, tags}`.
2. **Tag = the course mapping.** Each doc uploads with
   `tags = academy,<vendor>,<track>,<domain>,<code>`. The graph maps every chunk
   back to the course it came from — that is the "tagged and mapped to each
   course" ask, delivered via the plane's existing `tags` form field.
3. **Sync** (`sync-tutor-corpus.mjs`). Multipart `POST /api/documents/upload`
   per doc (`file` + `tags` + `description`), authed with
   `x-api-key: ORCHESTRATOR_API_KEY` + `X-Workspace-ID: ACADEMY_WORKSPACE_ID`.
   Corpus paths flatten to unique KB filenames
   (`anthropic--cca-f__00-track-overview.md`) so overview docs never collide
   across tracks and `--replace` can find a prior copy by exact name.

### Idempotency & replace-on-change
- The plane **dedupes by content hash per workspace** → an **unchanged** doc
  returns `status:"duplicate"` (no-op). Safe to run on every content release.
- An **edited** doc has a new hash → it would upload as a *second* copy. So
  `--replace` first `GET /api/documents/?search=<name>`, deletes the **exact
  filename** match, then uploads. (Fuzzy search hits are never deleted.)

## The contract (verified in `orchestrator/api/documents.py`)

| | |
|---|---|
| Upload | `POST /api/documents/upload` — multipart `file`, `tags?`, `description?`, `team_access?`; dedup → `{status:"duplicate"\|..., document_id, filename}` |
| List | `GET /api/documents/?search=&limit=` → `[{id, filename, …}]` |
| Delete | `DELETE /api/documents/{id}` (needs `documents:delete`) |
| Auth | `x-api-key` + `X-Workspace-ID` (machine); permission `documents:create` |

## Companion-platform gap (D-CO6 — for the Automatos side)

Flagged, not worked around:
1. **Scoped keys don't reach the documents plane.** Only the broad
   `ORCHESTRATOR_API_KEY` is accepted; a per-purpose `ak_srv_*` key is rejected.
   The sync therefore uses the broad key (CI/Railway env only, never in the
   repo). *Ask: accept scoped keys with `documents:create` on this plane.*
2. **No by-hash lookup exposed.** `content_hash` powers dedup internally but
   isn't queryable, so replace-on-change matches by **filename** instead of hash.
   *Ask: expose `?content_hash=` (or return it in the list) for exact
   idempotent replace.*
3. **`/api/knowledge/share` is a stub** — cross-workspace sharing of this corpus
   isn't available yet; each workspace ingests its own copy.

## Activation (owner)

1. Set repo secrets **`ORCHESTRATOR_API_KEY`** (the workspace machine key) and
   **`ACADEMY_WORKSPACE_ID`** (the Academy workspace). Optional repo var
   `AUTOMATOS_API_URL` (defaults to `https://api.automatos.app`).
2. **Actions → "Sync tutor corpus to Automatos KB" → Run workflow** — leave
   `dry_run` ticked first to see the 78-doc plan, then run for real. Use
   `replace` after a content release so edits overwrite cleanly.
3. The knowledge graph builds automatically on the workspace; the tutor then
   teaches across every track.

## Verification
`node scripts/export-tutor-corpus.mjs` writes the manifest; `sync-corpus.test.mjs`
covers the pure planner (tags, unique names) and the push loop (upload /
duplicate / replace / fail) over a fake fetch — no network, no filesystem.

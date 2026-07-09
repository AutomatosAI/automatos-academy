# Content API contract — v1 (the O5 + D6 sign-off artifact)

**Status:** proposed for sign-off · **Consumers:** mobile app (primary), web academy (later) · **Producer:** academy service
**Rule:** [../02-architecture.md](../02-architecture.md) §2 — *the contract is today's JSON schema; storage may change behind it, the shape may not fork.* Signing this off is the Stage-0 exit criterion ([../07-roadmap.md](../07-roadmap.md) §3).

## 1. Base + conventions

- Base path: `/api/catalog` on the academy service (academy.automatos.app).
- All endpoints **GET, unauthenticated, published-only** (published = what the service serves; exactly today's public-content posture — user state is the Spine's business, not the catalog's).
- Every response carries `ETag` and `Cache-Control: public, max-age=300`. Clients send `If-None-Match`; `304` on match.
- Every response body is the **verbatim file schema** documented below — the same JSON the web SPA reads today. No envelope. (Envelope conventions apply to the Spine's `/api/me/*`+`/api/sync/*`, not the catalog.)
- Content version: an opaque string `contentVersion` (derived from the content tree at boot), exposed on `/api/catalog/version` and echoed as a response header `X-Content-Version` on every catalog endpoint.

## 2. Endpoints

| Endpoint | Serves | Source shape today |
|---|---|---|
| `GET /api/catalog/version` | `{ contentVersion, generatedAt }` | computed |
| `GET /api/catalog` | catalog root: vendors → tracks (+`exam{}` summary, `lane`, `status`, `flagship`) | `public/content/manifest.json` |
| `GET /api/catalog/:vendorId/:trackId` | exam spec, `verification.sourceOfTruth[]`, `badge`, **`domainFiles[]` (references)**, `officialResources[]`, `videos[]` | `public/content/{vendor}/{track}/track.json` |
| `GET /api/catalog/:vendorId/:trackId/:domainId` | domain: `weight`, `lessons[]` (with `knowledgeCheck`), `questions[]` (with `sourceRefs`), `scenarios[]`, `labs[]`, `resources[]` | per-domain file (resolved from `domainFiles` by domain `id`) |
| `GET /api/catalog/paths` | **NEW (D6)** — list of learning-path objects | `public/content/paths.json` |
| `GET /api/catalog/paths/:pathId` | one path incl. ordered track membership | same |
| `GET /api/catalog/levels` | **NEW (D6)** — list of level objects | `public/content/levels.json` |
| `GET /api/catalog/levels/:levelId` | one level incl. track membership | same |
| `GET /api/catalog/changes?since={contentVersion}` | delta: which scopes changed since a version (see §5) | computed |

**Schema landmines the app must respect** (F3): `track.json` has **no inline `domains` array** — domains resolve via `domainFiles`; skills tracks omit `exam{}`; question/domain ids are **unique only within a track** (F4) — clients store fully-qualified `(vendorId, trackId, id)`.

## 3. NEW object schemas (D6)

Paths and levels do not exist in today's files; they are new first-class content objects. Seed data derives from shipped product logic — `manifest.json` `lane` values and `pathfinder.js` `recommend()` sequences (PRD-GROWTH §5) — so day-one objects mirror what the academy already recommends.

### 3.1 `paths.json`

```json
{
  "version": 1,
  "paths": [
    {
      "id": "plain-english-onramp",
      "name": "Plain-English on-ramp",
      "tagline": "Never touched AI? Two tracks from zero to running your business with it.",
      "audience": { "comfort": "non" },
      "tracks": [
        { "vendorId": "automatos", "trackId": "ai-explained" },
        { "vendorId": "automatos", "trackId": "ai-business" }
      ]
    }
  ]
}
```

- `id` — kebab-case, globally unique across paths.
- `tracks[]` — **ordered** (most-recommended first), fully-qualified refs; every ref must resolve against the manifest (validator-enforced). `status:"coming-soon"` tracks are allowed in a path (rendered as "then, when live"), but a path may not consist *only* of unpublished tracks.
- `audience` — optional selector hints mirroring pathfinder's three questions (`role`, `goal`, `comfort`); informational for choosers, not access control.
- Day-one seed = the six `recommend()` sequences: plain-english-onramp, ai-for-your-business, business-leader-credential, governance-and-privacy, secure-ai-engineering, claude-architect.

### 3.2 `levels.json`

```json
{
  "version": 1,
  "levels": [
    { "id": "foundations", "name": "Foundations", "order": 1,
      "tagline": "Plain English, no prerequisites.",
      "tracks": [ { "vendorId": "automatos", "trackId": "ai-explained" } ] }
  ]
}
```

- Levels are the manifest's `lane` values promoted to first-class objects: `foundations` (order 1) → `operator` (2) → `practitioner` (3). A track appears in exactly one level (validator cross-checks each track's manifest `lane`).
- `mastery_map` `scope_type='path'` rows reference `paths[].id`; levels are chooser filters, not mastery scopes ([../03-mastery-engine.md](../03-mastery-engine.md) §2 defines scopes as domain|path).

## 4. Versioning

- `contentVersion` = short hash over the manifest + every track/domain/paths/levels file (computed at service boot; changes exactly when deployed content changes).
- Clients persist `(contentVersion, per-scope ETags)`. On app foreground/refresh: `GET /api/catalog/version`; if unchanged, done — zero further requests.

## 5. Deltas

`GET /api/catalog/changes?since={v}` returns:

```json
{ "from": "v_abc", "to": "v_def", "changed": [
    { "scope": "track", "vendorId": "anthropic", "trackId": "cca-f",
      "domains": ["d1-agentic-architectures"] },
    { "scope": "paths" }
] }
```

- `changed[]` lists the scopes whose files changed between the two versions, at domain granularity where known.
- If `since` is unknown/too old (the service keeps a **bounded history, last 20 versions**), respond `410 Gone` → client performs a full refetch of its in-scope tracks. Cheap, explicit, no silent divergence.
- v1 implementation note: history = a small manifest-of-hashes journal persisted alongside the content snapshot at boot/deploy; the *contract* is the response shape, not the journal mechanics.

## 6. Compatibility promises

1. Additive changes only within v1 (new optional fields, new endpoints). Breaking shape changes = `/api/v2/catalog`, negotiated like this document.
2. The file→DB migration (D-R4 phase 2) **must reproduce these responses byte-compatibly** (modulo field ordering) before it takes over serving; the contract tests in the academy repo are the proof (MT-01 acceptance).
3. Draft content, when the factory lands, is invisible to every endpoint here — published-only is structural, not a query param.

## 7. Sign-off

| Side | What sign-off means | Signed |
|---|---|---|
| App (MT-03..08) | builds its content client + cache against exactly these shapes | ☐ |
| Academy (MT-01, future migration) | serves these shapes and treats them as frozen-additive | ☐ |
| Owner (Gerard) | O5 closed; D6 objects approved incl. §3 seed data | ☐ |

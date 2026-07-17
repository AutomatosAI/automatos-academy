# The Wire — ingest contract (PRD-WIRE S4)

**Audience:** the platform-repo session building the daily **"the-wire" mission** (research →
adversarial verify → editor pass → POST). This document is the complete interface: everything
below is testable against the live API, and nothing below requires reading academy source.
**Spec:** `docs/prds/PRD-WIRE.md` §4.2–§4.4 owns the rationale; this file owns the wire format.

The Wire is the academy's agent-written news surface. Posts arrive **only** through this API —
there is no CMS, no authoring UI, no other write path. The API enforces the *shape* of
verification at the boundary (§3 below): a post without its sources, or a factual post without
two independent sources, is rejected with a `400` and never exists, not even as a draft.

---

## 1. Base URL, mounting, feature detection

| Deploy | Behaviour |
|---|---|
| Production | `https://academy.automatos.app` — Wire mounted when `WIRE_INGEST_KEY` + `DATABASE_URL` are set |
| Wire not mounted | `/api/wire/*` answers `501 {"error":"not_implemented", …}`; `/wire/rss.xml` and `/wire/sitemap.xml` answer `503 {"error":"not_configured"}` |
| Misconfigured (key without DB) | The academy refuses to boot — you will never see a half-alive Wire |

A `501` from `GET /api/wire/posts` means "this deploy has no Wire", not an outage. The mission
should treat it as a hard configuration error and alert, not retry.

## 2. Authentication

- Every **write** and every **admin read** carries the header `X-Wire-Key: <WIRE_INGEST_KEY>`.
- The key is a server-held secret provisioned in the academy's environment. It must live in the
  mission's secret store — never in a repo, never in client-side config, never logged.
- Compare is timing-safe server-side; a failed key is always a bare `401 {"error":"unauthorized"}`
  with no reason (deliberately).
- Rotation = academy env change + mission secret update. No key versioning; rotate atomically.
- Public reads (`GET /api/wire/posts*`, RSS, sitemap, shells) need no key.

## 3. Endpoints

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /api/wire/posts` | key | Create/replace a post (idempotent on `postId`, §5) |
| `POST /api/wire/posts/:postId/publish` | key | `draft → published` (also re-instates an unpublished post). Idempotent: re-publishing a published post is a clean `200` keeping the original `publishedAt` |
| `POST /api/wire/posts/:postId/unpublish` | key | Kill-switch. Body `{"reason": "…"}` **required** (1–500 chars). Works from any state; the post vanishes from list/RSS/shell/sitemap on the next request; the row is retained for audit |
| `POST /api/wire/posts/:postId/corrections` | key | Append `{"note": "…"}` (1–500 chars) to a **published** post. Renders as a visible Corrections box everywhere; bumps `updatedAt` (and the RSS `<updated>`) |
| `GET /api/wire/admin/posts?status=&limit=` | key | Review queue + audit list: every state, newest-updated first. `status` ∈ `draft\|published\|unpublished` (omit for all), `limit` 1–200 (default 50). Rows include `status`, `unpublishReason`, `correctionsCount`. Never cached |
| `GET /api/wire/admin/posts/:postId` | key | One full row, any status — the body a human reads before the publish call, or the complete audit record after an unpublish |
| `GET /api/wire/posts?type=&tag=&limit=&before=` | public | Published only, newest first. `limit` 1–50 (default 20), `before` = ISO timestamp or epoch-ms (strictly older). `Cache-Control: public, max-age=60` |
| `GET /api/wire/posts/:slug` | public | One published post: full body + sources + corrections |
| `GET /wire/rss.xml` | public | Atom feed, latest 50 published, per-entry source links + corrections; `<updated>` reflects corrections |
| `GET /wire/sitemap.xml` | public | Sitemap of `/wire/` + every published post shell, `<lastmod>` = `updatedAt` |
| `GET /wire/:slug/` | public | Server-rendered SEO shell per published post (og/article tags, NewsArticle/BlogPosting JSON-LD with `citation`, no-JS body). 404 for drafts/unpublished/unknown |

All public GET responses that carry posts also carry `"transparency"` — see §7.

## 4. Post body schema — `POST /api/wire/posts`

Content-Type `application/json`. **Unknown fields anywhere are rejected** (`400 unknown_field`),
including inside `sources[]` and `byline` — send exactly this shape:

| Field | Type | Rules |
|---|---|---|
| `postId` | string | **Required.** 1–200 chars. The idempotency key — use the mission run id (e.g. `run-2026-07-17-001`). §5 |
| `slug` | string | **Required.** `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 80 chars. Unique across all posts forever (unpublished rows keep their slug) |
| `type` | string | **Required.** One of `model-news` · `trend` · `new-course` · `question-refresh` · `changelog` |
| `tags` | string[] | Optional (default `[]`). ≤ 8 tags, each 1–40 chars |
| `title` | string | **Required.** 1–120 chars |
| `summary` | string | **Required.** 1–300 chars. The dek — feeds the list, RSS, teaser, and the shell's meta description |
| `bodyMd` | string | **Required.** 1 byte – 32 KB (UTF-8 bytes). Restricted markdown — §6 |
| `sources` | object[] | **Required.** 1–12 entries, each exactly `{url, title, retrievedAt, claims}` — §3-gate rules below |
| `byline` | object | **Required.** `{agents: string[], missionRun: string, model?: string}` — agents 1–8 entries × ≤ 80 chars, missionRun ≤ 200 chars, model ≤ 80 chars |
| `status` | string | Optional (default `draft`). `draft` always allowed; `published` only when the academy runs `WIRE_PUBLISH_POLICY=auto` (§8) — under review policy it is a `400` |

### The verification gate (enforced shape — a `400` here means the post never existed)

Each `sources[]` entry:

- `url` — valid `http(s)://` URL (anything else, including `ftp:`/`javascript:`, is rejected)
- `title` — 1–200 chars
- `retrievedAt` — ISO timestamp, **≤ 7 days old** at ingest, ≤ 10 min future clock skew
- `claims` — **one line**, 1–200 chars: which statement in the post this source supports.
  This is the per-claim mapping readers see; write it as prose, not a URL list

Type-level rules:

- **Factual types** (`model-news`, `trend`): **≥ 2 sources on distinct registrable domains.**
  Independence is eTLD+1: `www.anthropic.com` and `docs.anthropic.com` are the SAME domain;
  `bbc.co.uk` and `theguardian.co.uk` are DIFFERENT (ccTLD second-levels are handled). Two pages
  of one site never satisfy this.
- **First-party types** (`new-course`, `question-refresh`, `changelog`): ≥ 1 source, and it
  **must be the canonical artifact** — the live track page, the merged PR URL, the changelog
  entry. (The API can only check shape; pointing at the canonical artifact is the mission's
  contract obligation.)

## 5. Idempotency and lifecycle

`postId` is the idempotency key. State machine:

```
            POST (replace, same postId)          corrections (append-only)
              ┌────────↺────────┐                    ┌──────↺──────┐
   POST       │                 │     publish        │             │   unpublish {reason}
  ──────────► draft ────────────┴──────────────► published ────────┴──────────────► unpublished
              │                                      ▲                                  │
              └── never public, 404 everywhere       └────────────── publish ───────────┘
                                                          (re-instates; corrections survive)
```

- **Re-POST while `draft`** → replaces the draft wholesale, returns `200` (a fresh create returns
  `201`). A crashed-and-re-run mission is safe by design — no double posts, ever.
- **Re-POST after publish** → `409 {"error":"conflict","reason":"already_published"}`. Published
  posts are immutable (D-W2); **corrections are the only post-publish mutation**. Fix mistakes
  with a correction, or unpublish.
- **Same `slug` under a different `postId`** → `409 {"reason":"slug_taken"}`. Slugs are permanent
  — pick date-scoped slugs (`claude-4-2-launch`, not `todays-news`).
- **Corrections on a draft** → `409 {"reason":"not_published"}` — replace the draft instead.
- **Unpublish** requires `{"reason"}`; repeatable (last reason wins); reversible via `publish`.
- Publishing sets `publishedAt` fresh on every `draft/unpublished → published` transition.

Successful writes echo `{"post": {postId, slug, type, tags, title, summary, status, publishedAt,
createdAt, updatedAt}}` (create/replace), or `{postId, status, publishedAt?}` (publish/unpublish),
or `{postId, corrections, updatedAt}` (corrections).

## 6. `bodyMd` — the restricted markdown

Wire bodies are untrusted input to the academy; the renderer is deliberately small. **Supported:**
paragraphs · `##`/`###`/`####` headings · `-`/`*` and `1.` lists · `> ` blockquotes · fenced code
blocks · `**bold**` · `*italic*` · `` `code` `` · `[links](https://…)`.

**Not supported / neutralised:** raw HTML (escaped to text) · images · tables · link URLs on any
scheme other than `http(s)` or in-app `#/…` (rendered as plain text, silently). Don't fight the
subset — write plain prose. House tone: plain-language-first (the ABF rule); summary carries the
"so what", body carries the detail; link the platform where a feature is involved.

Do **not** put source citations in `bodyMd` footers — sources render from `sources[]` on every
surface automatically (the Sources box, RSS entries, JSON-LD `citation`). Duplicating them in the
body doubles the maintenance and drifts.

## 7. The transparency label — server-owned, do not bake into content

Every public response carries `"transparency"` (list/post JSON), the feed subtitle (RSS), and a
label block (shells). The academy owns the copy and its D-W5 states:

- Review policy: `Researched and written by Automatos agents · every claim linked to its source · reviewed by a human`
- Auto policy: the same **without** ` · reviewed by a human`

The mission must **never** claim authorship/review status inside `title`/`summary`/`bodyMd` —
the label tracks the real publish policy automatically; copy baked into content would lie the
moment the policy flips.

## 8. Publish policy (D-W1)

- **Launch mode (`review`, the default):** ingest with `status:"draft"` (or omit `status`). A
  human lists the queue (`GET /api/wire/admin/posts?status=draft`), reads the full post
  (`GET /api/wire/admin/posts/:postId`), and approves via the `publish` call. Sending
  `status:"published"` in this mode is a `400 publish_policy_is_review_use_the_publish_call`.
- **Auto mode (`WIRE_PUBLISH_POLICY=auto`, after 4 clean weeks or 20 consecutive clean posts,
  whichever is later):** the mission may send `status:"published"` directly. The kill-switch and
  the label degrade stand regardless.
- The mission should not hardcode the mode: on a `400` with reason
  `publish_policy_is_review_use_the_publish_call`, fall back to draft + stop (the human publishes).

## 9. Error catalogue

Errors are machine-readable and envelope-free — branch on `status` + `error` (+ `field`/`reason`):

| Status | Body | Meaning / action |
|---|---|---|
| `400` | `{"error":"invalid_input","field":"…","reason":"…"}` | The named field tripped the named rule. Fix and re-POST (same `postId` is safe). Reasons are stable strings, e.g. `must_be_string_1_to_120_chars`, `must_match_^[a-z0-9]+(-[a-z0-9]+)*$_max_80`, `must_be_one_of_model-news\|trend\|new-course\|question-refresh\|changelog`, `must_be_array_of_1_to_12`, `must_be_http_or_https_url`, `must_be_iso_timestamp`, `stale_over_7_days`, `in_the_future`, `must_be_one_line_1_to_200_chars`, `factual_type_needs_2_sources_on_independent_domains`, `unknown_field`, `must_be_draft_or_published`, `publish_policy_is_review_use_the_publish_call` (field paths drill in: `sources[2].retrievedAt`, `byline.agents`) |
| `401` | `{"error":"unauthorized"}` | Missing/wrong `X-Wire-Key`. Never retried with the same key — alert |
| `404` | `{"error":"not_found"}` | Unknown `postId` (writes/admin) or slug (public read) |
| `409` | `{"error":"conflict","reason":"slug_taken"\|"already_published"\|"not_published"}` | §5 lifecycle rules. `already_published` on a re-run is SUCCESS from the mission's point of view — the post is live; don't re-post, don't alert |
| `429` | `{"error":"rate_limited"}` | Per-IP fixed window on writes + admin reads (default 60/min). Back off ≥ 60 s. The daily mission makes a handful of calls — sustained 429s mean a bug or an attacker |
| `500` | `{"error":"internal_error"}` | Academy-side fault. Safe to retry idempotently (same `postId`) |
| `501` | `{"error":"not_implemented", …}` | Wire not mounted on this deploy (§1) — config error, not outage |

## 10. Mission expectations (contract notes, not API rules)

- **Story-level dedupe is yours.** Idempotency stops exact re-runs, not the same story
  re-reported tomorrow under a new `postId`. Before posting, check
  `GET /api/wire/posts?limit=50` (public, includes `byline.missionRun`) and skip stories the
  Wire already carries.
- **Cadence and alerting are yours.** The academy runs no cron and no scheduler — it is purely
  receptive, and a missed day shows as a visibly stale newest-post date. Missed-run/failed-run
  alerting lives in the mission (the OPS-FRESHNESS §6 guardrail pattern: budget caps, approval
  gates).
- **Pipeline order** (PRD §4.4): research → adversarial verify (a second agent attempts to refute
  each claim against the collected sources; claims that fail are cut, and their sources with
  them) → editor pass (house voice) → POST. The §4-gate is the backstop, not the pipeline.
- **Question refreshes**: course content changes travel by GitHub PR through the content-repo
  gate (never this API); the Wire post is the *announcement*, type `question-refresh`, citing the
  merged PR URL as its canonical source.

## 11. Worked examples

Create a draft (review mode):

```bash
curl -sS https://academy.automatos.app/api/wire/posts \
  -H "Content-Type: application/json" -H "X-Wire-Key: $WIRE_INGEST_KEY" \
  -d '{
    "postId": "run-2026-07-17-001",
    "slug": "claude-4-2-launch",
    "type": "model-news",
    "tags": ["anthropic", "models"],
    "title": "Claude 4.2 lands with a 2M-token context window",
    "summary": "Anthropic shipped Claude 4.2 this morning — much bigger context, same price. What it changes for the architect exam’s context-management domain.",
    "bodyMd": "Anthropic released **Claude 4.2** today.\n\n- 2M-token context window\n- pricing unchanged\n\n[The announcement](https://www.anthropic.com/news/claude-4-2)",
    "sources": [
      {"url": "https://www.anthropic.com/news/claude-4-2", "title": "Anthropic — Claude 4.2 announcement", "retrievedAt": "2026-07-17T06:10:00Z", "claims": "Claude 4.2 ships with a 2M-token context window"},
      {"url": "https://techcrunch.com/2026/07/17/claude-4-2/", "title": "TechCrunch coverage", "retrievedAt": "2026-07-17T06:12:00Z", "claims": "Pricing is unchanged from Claude 4.1"}
    ],
    "byline": {"agents": ["the-wire"], "missionRun": "run-2026-07-17-001", "model": "claude-fable-5"}
  }'
# → 201 {"post":{"postId":"run-2026-07-17-001","status":"draft",…}}
```

Publish, correct, kill:

```bash
curl -sS -X POST -H "X-Wire-Key: $WIRE_INGEST_KEY" \
  https://academy.automatos.app/api/wire/posts/run-2026-07-17-001/publish
curl -sS -X POST -H "X-Wire-Key: $WIRE_INGEST_KEY" -H "Content-Type: application/json" \
  -d '{"note": "An earlier version misstated the price; it is unchanged from 4.1."}' \
  https://academy.automatos.app/api/wire/posts/run-2026-07-17-001/corrections
curl -sS -X POST -H "X-Wire-Key: $WIRE_INGEST_KEY" -H "Content-Type: application/json" \
  -d '{"reason": "price claim disputed by the vendor"}' \
  https://academy.automatos.app/api/wire/posts/run-2026-07-17-001/unpublish
```

Review queue (human pass, launch mode):

```bash
curl -sS -H "X-Wire-Key: $WIRE_INGEST_KEY" "https://academy.automatos.app/api/wire/admin/posts?status=draft"
curl -sS -H "X-Wire-Key: $WIRE_INGEST_KEY" "https://academy.automatos.app/api/wire/admin/posts/run-2026-07-17-001"
```

## 12. Local dev + the seed fixture

`scripts/seed-wire.mjs` (academy repo) drives synthetic drafts through this exact API against a
**local** database — it is the executable proof of this contract and a handy target diff when the
mission's client misbehaves: `DATABASE_URL=postgres://…@localhost/db npm run seed-wire -- --count 5
[--publish]`. It refuses non-local databases; seeds are visibly synthetic and land as drafts.
`tests/wire.test.mjs` holds the full request/response fixtures for every rule in this document.

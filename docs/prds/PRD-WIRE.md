# PRD-WIRE — The Wire: agent-written daily news, verified at the door

**Status:** DRAFT · blocked on D-W1..D-W6 (register in §8) · **Owner:** Academy · **Last updated:** 2026-07-16
**Repo:** `automatos-academy` (all five slices). The daily authoring mission itself is built in the
platform repo against the §4.4 interface contract — S4 delivers the contract, not the mission.
**Strategy context:** [PRD-GROWTH.md](./PRD-GROWTH.md) §4 (The Academy Brief) ·
[PRD-OPS-FRESHNESS.md](./PRD-OPS-FRESHNESS.md) §6 (the cert-watch mission) ·
[PRD-UNIFIED/PRD-U3-CONTENT-DB.md](./PRD-UNIFIED/PRD-U3-CONTENT-DB.md) (git stays canonical for course content)

## 1. Problem

Between content merges the academy is static. A learner who finished their module yesterday has no
reason to come back today — yet the subject moves daily (model releases, cert blueprint changes,
platform features), and the academy already runs a freshness operation
([PRD-OPS-FRESHNESS](./PRD-OPS-FRESHNESS.md)) whose output is invisible: re-verification happens in
a log file, question refreshes land in PRs nobody outside the repo sees. The owner's brief:

> "A wire page (blog) driven by Automatos widgets — this is where we start to plumb in Automatos to
> manage context: news on latest models, trends, new courses, updated questions to keep you on your
> toes… widgets driving the content, researching and updating it every day, always cross-verified
> from real sources."

Two constraints shape everything below. First, [PRD-GROWTH](./PRD-GROWTH.md) §7 ruled out "a blog
CMS" — that ruling stands: the Wire has **no authoring UI**; posts are written by a scheduled
Automatos mission and arrive through an authenticated ingest API. Second, the academy's one live
agent today (the tutor) only *answers*; the Wire is the surface where agents visibly *work* —
researching, verifying, publishing — the same pattern ABF module 05 and the cert-watch mission
teach, running in public on the academy's own front page.

The risk is equally clear: an agent surface that publishes a wrong fact under the academy's name
attacks the exact reputation ("live-verified, cited, never asserted from memory") the academy is
built on. So verification is not a pipeline aspiration — it is **enforced at the ingest boundary**,
labelled on every post, and reversible in one authenticated call.

## 2. Goals

1. **A daily reason to return.** Fresh, dated posts on `#/wire`: model news, trends, new/updated
   courses, question-refresh notes, changelog — each one useful to a learner in under two minutes.
2. **Course content stays git-canonical.** The Wire is a separate runtime surface (`wire_posts`
   table, own migration, own API). Nothing here writes to `content_documents` or the content tree;
   "updated questions" flow as agent-opened GitHub PRs through the existing
   `npm run validate` + CI + review gate (§4.7, D-W6).
3. **"Always cross-verified" as code, not copy.** Every post carries mandatory `sources[]`
   (url + retrieved-at + one-line claim mapping); factual posts without ≥2 independent sources are
   rejected with a 400 at ingest. Sources render on every surface, including RSS.
4. **Transparent authorship.** Every post carries the agent byline and a mandatory transparency
   label (exact wording D-W5). Readers are never left to guess who wrote it.
5. **Human kill-switch.** Unpublish in one authenticated call; corrections append visibly;
   a review-queue mode exists (D-W1) so launch can be human-approved before going autonomous.
6. **Honest reach surfaces.** RSS feed + real-path SEO shells per post — the Wire is findable and
   subscribable without an account, like everything else on the academy.

## 3. Non-goals

- **No authoring CMS or admin UI.** The ingest API (plus a dev seed script) is the only way posts
  exist. Review-queue actions are authenticated API calls, not a dashboard (v1).
- **No runtime mutation of course content** — no track, lesson, question, or manifest row is
  touched by anything in this PRD.
- **No comments, reactions, or personalization.** It's a wire, not a social feed.
- **No newsletter engine.** The Academy Brief ([PRD-GROWTH](./PRD-GROWTH.md) §4) stays as planned;
  D-W4 decides whether it simply consumes the Wire's RSS as source material.
- **No mobile build.** A read-only Wire view in the app comes later; nothing here touches the
  Content API contract, so the app is unaffected.
- **No platform-side implementation.** The mission (research → verify → post) is a platform-repo
  build; this PRD ships its interface contract (§4.4, S4) and proves it with a seed script.

## 4. Design

### 4.1 Schema (net-new; unrelated to the Spine and to U3's `content_documents`)

One `node-pg-migrate` migration (same family as `migrations/1784160000000_content-db.js`):

```
wire_posts (
  id            bigserial PK,
  post_id       text UNIQUE NOT NULL,   -- client-supplied idempotency key (mission run id)
  slug          text UNIQUE NOT NULL,   -- ^[a-z0-9]+(-[a-z0-9]+)*$, ≤ 80 chars
  type          text NOT NULL CHECK IN ('model-news','trend','new-course','question-refresh','changelog'),
  tags          text[] NOT NULL DEFAULT '{}',        -- ≤ 8
  title         text NOT NULL,                        -- ≤ 120 chars
  summary       text NOT NULL,                        -- ≤ 300 chars (dek; feeds shells/RSS/teaser)
  body_md       text NOT NULL,                        -- ≤ 32 KB, restricted markdown (§7)
  sources       jsonb NOT NULL,   -- [{url, title, retrievedAt, claims}] — validated at ingest (§4.3)
  byline        jsonb NOT NULL,   -- {agents[], missionRun, model?} — feeds the transparency label
  status        text NOT NULL DEFAULT 'draft' CHECK IN ('draft','published','unpublished'),
  corrections   jsonb NOT NULL DEFAULT '[]',          -- [{at, note}] append-only (D-W2)
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
)
```

Rows are tiny and kept forever — unpublished posts are retained for audit, never deleted.

### 4.2 Ingest API — the platform-facing contract

New `server/wire/` module (mount/routes/validate split, mirroring `server/spine/`), mounted in
`server.js` behind env, same fail-loud posture as the Spine: both `DATABASE_URL` **and**
`WIRE_INGEST_KEY` present → mount `/api/wire`; `WIRE_INGEST_KEY` without `DATABASE_URL` → refuse to
boot; neither → nothing mounts and the existing `/api` 501 fallback lets the SPA feature-detect.

Writes authenticate with `X-Wire-Key: <WIRE_INGEST_KEY>` — a server-held secret, timing-safe
compare (the `sigMatches` pattern in `server.js`), rate-limited. This is the **reverse edge** of
the tutor integration: the tutor calls out to the platform with a public `ak_pub_*` key +
origin allowlist; the Wire is called *into* by a platform mission holding a private key. The key
never appears in client JS or `chat-config.js`.

| Method + path | Auth | Behaviour |
|---|---|---|
| `POST /api/wire/posts` | key | Create. Body: `{postId, slug, type, tags[], title, summary, bodyMd, sources[], byline, status}`. `status` may be `draft` always; `published` only when D-W1 policy is auto. **Idempotent on `postId`**: re-POST while `draft` replaces the draft; re-POST after publish → `409` (corrections are the only post-publish mutation). Same `slug` under a different `postId` → `409`. |
| `POST /api/wire/posts/:postId/publish` | key | `draft → published`, sets `published_at`. Used by the mission (auto mode) or by the human review pass (D-W1). |
| `POST /api/wire/posts/:postId/unpublish` | key | Kill-switch. `{reason}` required; status → `unpublished`; the post vanishes from list, RSS, and shell on the next request. |
| `POST /api/wire/posts/:postId/corrections` | key | Appends `{at, note}`; renders as a Corrections box; bumps `updated_at` (RSS `<updated>`). |
| `GET /api/wire/posts?type=&tag=&limit=&before=` | public | Published only, newest first, `limit ≤ 50`. `Cache-Control: public, max-age=60`. |
| `GET /api/wire/posts/:slug` | public | One published post, full body + sources + corrections. |

Errors are machine-readable: `400 {error:"invalid_input", field, reason}` · `401` bad/missing key ·
`409 {error:"conflict", reason}` · `429` rate-limited. The contract lives at
`docs/WIRE-INGEST-CONTRACT.md` (S4) — complete enough that the platform repo builds the mission
without reading academy source.

### 4.3 The verification gate — reject at the boundary, don't trust the pipeline

The API cannot check truth; it enforces the **shape** of verification, so an unverified post cannot
be accepted no matter what the pipeline upstream did:

- `sources[]` mandatory on every post. Each entry: valid `http(s)` URL · `retrievedAt` ISO
  timestamp **≤ 7 days old** at ingest (no stale research) · `claims` — one line (≤ 200 chars)
  mapping which statement in the post this source supports.
- **Factual types** (`model-news`, `trend`): **≥ 2 sources with distinct registrable domains** —
  independence, not two pages of the same site. **First-party types** (`new-course`,
  `question-refresh`, `changelog`): ≥ 1 source, and it must be the canonical artifact (the track
  page, the merged PR URL).
- Caps enforced (§4.1 field limits); unknown fields rejected; `type` outside the enum rejected.

Anything failing these rules is a `400` — the post never exists, not even as a draft.

### 4.4 The authoring pipeline (platform-side; interface contract only)

A scheduled daily mission ("the-wire") on the Automatos platform: **research** (watch-list +
model/vendor announcement pages) → **adversarial verify** (a second agent attempts to refute each
claim against the collected sources; claims that survive keep their source mapping, claims that
don't are cut) → **editor pass** (house voice, plain-language-first per the ABF tone rule) →
`POST` to §4.2. Budget-capped, approval-gated per D-W1 — exactly the guardrail pattern ABF module
05 teaches and [PRD-OPS-FRESHNESS](./PRD-OPS-FRESHNESS.md) §6 already specifies for cert-watch.
The cert-watch mission is the Wire's natural feeder: its drift reports become `question-refresh`
and `changelog` posts. Academy-side there is **no cron and no scheduler** — the site is purely
receptive; if the mission misses a day, the newest post's date shows it (visible staleness as the
incentive, the same posture as the `verifiedAt` chip in OPS-FRESHNESS §2). Missed-run alerting is
the mission's job, in the platform repo.

### 4.5 Reader surface — `#/wire` and `#/wire/:slug`

New `public/js/views/wire.js` in the periwinkle system; routes registered in `app.js`
(`route("/wire", …)`, `route("/wire/:slug", …)`) with `url.wire()` helpers in `router.js`; a nav
entry in the chrome. The list view groups by date with type chips and tag filters; the post view
renders title, dek, body, the **Sources box** (every post ends with its sources: link, retrieved
date, what it supports — the label is clickable proof, not decoration), the Corrections box when
present, and the transparency label (D-W5) under the byline. The SPA feature-detects: `GET
/api/wire/posts` returning the 501 fallback or an empty deploy hides the nav entry and home teaser;
a deep link shows a friendly "the Wire isn't switched on for this deploy" state — DEPLOY.md
Option A (static, no DB) keeps working untouched.

Analytics (extend the single vocabulary in `public/js/analytics.js`): `wire_view` ·
`wire_post_view` · `wire_source_click`; platform links inside posts are already covered by
`cta_automatos_click`.

### 4.6 RSS + SEO shells

- **`GET /wire/rss.xml`** — real path, served from the DB per request: latest 50 published posts,
  full summary, per-item source links (the feed carries the verification, not just the claims),
  `<updated>` reflecting corrections. RSS is both distribution and honesty: anyone can audit the
  Wire's history from a feed reader.
- **`GET /wire/:slug/`** — real-path shell per post (og tags, `NewsArticle`/`BlogPosting` JSON-LD
  with `citation` from `sources[]`, canonical, no-JS body, link into `/#/wire/:slug`). Boot-time
  `generate-shells.mjs` can't see posts published after boot, so post shells render **per request
  from the DB** — the precedent is `server.js`'s `/cert/:payload` og page. The boot-time generator
  is extended only for the static parts: a `/wire/` index shell and a sitemap reference pointing at
  a DB-served `/wire/sitemap.xml`.
- **Home teaser (D-W3):** a "From the Wire" strip on the catalog view — three latest titles +
  dates — rendered only when ≥ 3 published posts exist (an empty feed is anti-marketing, the same
  logic that deferred Discord in [PRD-GROWTH](./PRD-GROWTH.md) §6).

### 4.7 "Updated questions to keep you on your toes" — the git lane, reported by the Wire

Question refreshes are **course content**, so they take the canonical road: the cert-watch mission
(OPS-FRESHNESS §6, extended per D-W6) opens a GitHub PR against the content tree; `npm run
validate` + CI + human review gate it; the existing publish path
(`scripts/publish-content.mjs` on main merge, PRD-U3) ships it. The Wire's role is the
**announcement**: a `question-refresh` post citing the merged PR ("47 GH-500 questions re-verified
against the July study-guide refresh — what changed"), giving learners the "on your toes" signal
without ever creating a second write path into course content.

## 5. User stories

- **US-W1** — A learner opens the academy on a Tuesday; the Wire's top item is that morning's
  model-news post, dated today, with two independent sources and their retrieval dates. Checking
  the Wire becomes part of the daily loop.
- **US-W2** — A skeptical reader clicks a source link, finds the claim on the source page, and
  reads the transparency label explaining an agent researched and wrote the post. Skepticism is
  the label's target audience, and it survives the click.
- **US-W3** — A post is wrong. One authenticated `unpublish` call and it is gone from the list,
  the RSS feed, and its shell on the next request — with the row retained for audit.
- **US-W4** — The platform mission crashes mid-run and re-runs; its re-POST of the same `postId`
  replaces the draft instead of duplicating it. No double posts, ever.
- **US-W5** — A question-refresh PR merges; the Wire announces it with a link to the PR, and a
  learner mid-track knows exactly which questions moved and why.
- **US-W6** — A static deploy with no `DATABASE_URL` boots exactly as today: no Wire nav, no
  teaser, no errors.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | Migration `wire_posts` + `server/wire/` ingest/publish/unpublish/corrections API + §4.3 boundary validation | `tests/wire.test.mjs` in the `npm test` chain: <2-independent-source factual post → 400; stale `retrievedAt` → 400; idempotent re-POST proven; post-publish re-POST → 409; bad key → 401 (timing-safe); unmounted deploy → 501 fallback |
| S2 | `#/wire` list + `#/wire/:slug` views + `/wire/rss.xml` + analytics events | Views render in periwinkle with Sources box on every post; feed validates (W3C); `wire_*` events fire; SPA feature-detect hides nav on no-Wire deploys |
| S3 | Per-request `/wire/:slug/` shells + `/wire/sitemap.xml` + home "From the Wire" teaser (D-W3) | JSON-LD valid in Google tooling; canonical + og tags present; teaser hidden below 3 posts and on no-Wire deploys |
| S4 | `docs/WIRE-INGEST-CONTRACT.md` (endpoint, auth, body schema, idempotency, error codes, D-W1 policy) + `scripts/seed-wire.mjs` | Contract sufficient to build the mission without academy source access; seed script drives a sample post end-to-end through the real API |
| S5 | Unpublish/corrections surfaces + transparency label (D-W5 copy) on list, post, RSS, and shells | Kill-switch proven: unpublish → gone on next request everywhere; correction renders on post + bumps RSS `<updated>`; label present on all four surfaces |

Sequencing: S1 → S2 → (S3 ∥ S4) → S5. Nothing depends on U1/U2 (no auth, no Spine); S1 shares
only `DATABASE_URL` with U3.

## 7. Risks

- **A wrong post under the academy's name** is the reputation-killer, and agent authorship raises
  the base rate. Defense in depth: the §4.3 ingest gate (shape of verification), the adversarial
  verify step (pipeline), review-queue launch mode (D-W1), the kill-switch (S5), and the label —
  never pretending a human wrote it.
- **Untrusted markdown at runtime.** Course content is first-party; Wire bodies arrive over the
  network. `public/js/markdown.js` HTML-escapes `& < >` but does not escape quotes in link hrefs
  or filter URL schemes — fine for git-authored lessons, not for ingest input. S2 hardens the
  Wire render path: attribute-escape hrefs, allowlist `http(s)` schemes, no raw HTML; shells
  `esc()` everything they emit (S1 additionally caps and shape-checks all fields).
- **Secret discipline.** `WIRE_INGEST_KEY` is the first academy secret that *writes content*.
  Timing-safe compare, rate limit, never hydrated into any `public/` config file; rotation is an
  env change + mission update.
- **Repeat coverage.** Idempotency stops exact re-runs, not the same story re-reported on
  consecutive days. Story-level dedupe is mission-side (contract note in S4: check the public list
  before posting); accept some overlap in v1.
- **Search engines and "AI content".** The defense is the design: named agent byline, per-claim
  sources, JSON-LD citations, corrections in the open. If the Wire can't be honest about itself,
  it shouldn't rank — and won't.
- **Cadence slippage.** A quiet Wire looks worse than no Wire. The visible-date posture (§4.4)
  makes slippage undeniable; D-W3's ≥3-post threshold keeps the home page from advertising an
  empty feed; if the mission proves unreliable, the teaser comes off before the Wire does.

## 8. Decision register (owner)

| # | Decision | Options | Recommendation | Owner |
|---|---|---|---|---|
| D-W1 | Publish policy at launch | (a) missions publish directly · (b) ingest lands `draft`; a human `publish` call approves each post for the first weeks | **(b)** for the first 4 weeks or 20 consecutive clean posts, whichever is later — then flip to (a) with the kill-switch standing | Gerard |
| D-W2 | Post mutability | (a) editable in place · (b) published posts immutable; changes are appended, visible corrections | **(b)** — a news surface that silently rewrites itself forfeits the trust it exists to build (same instinct as OPS-FRESHNESS §5 "never silently delete") | Gerard |
| D-W3 | "From the Wire" home teaser | (a) yes, 3 latest titles when ≥3 posts · (b) not on home; Wire is nav-only | **(a)** — the home page is where the daily-return habit starts; the ≥3 threshold avoids showcasing an empty feed | Gerard |
| D-W4 | RSS / newsletter tie-in | (a) RSS now (S2), Academy Brief later consumes it as source material · (b) hold RSS until the newsletter exists | **(a)** — RSS costs one route and serves readers immediately; the Brief (GROWTH §4) stays its own decision | Gerard |
| D-W5 | Transparency label — exact copy (label itself is mandatory, only wording is open) | (a) "The Wire — researched by Automatos agents, verified against sources" · (b) "Researched and written by Automatos agents · every claim linked to its source" · (c) b + "· reviewed by a human" while D-W1(b) mode is active | **(c) degrading to (b)** when auto-publish flips — the label should never claim review that isn't happening | Gerard |
| D-W6 | Question-refresh PRs in Wire v1? | (a) the Wire program includes building the PR-opening agent · (b) PR-opening stays in OPS-FRESHNESS §6 (cert-watch v2); Wire v1 only *reports* merged refreshes | **(b)** — one PRD per write path; the Wire never grows a second road into course content (§4.7) | Gerard |

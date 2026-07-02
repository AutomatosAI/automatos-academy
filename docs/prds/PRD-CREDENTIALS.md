# PRD — Credentials: completion badges, certificate pages & the LinkedIn loop

**Status:** proposed (recommended: v1 ships before/with S0) · **Owner:** Academy · **Last updated:** 2026-07-02
**Strategy context:** [STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md) §4 ("Share" — the missing loop stage)
**Related:** [PRD-GROWTH.md](./PRD-GROWTH.md) (email capture at claim) · [PRD-B1-AI-BUSINESS.md](./PRD-B1-AI-BUSINESS.md) §2 (completion definition)

## 1. Why

Completion currently produces **nothing shareable**. The readiness engine gates an A+; APA and ABF
define completion badges in prose — but there is no certificate page, no image, no LinkedIn
action. That breaks two goals at once:

1. **The growth loop.** A learner posting "I completed the Automatos Academy AI-Security track"
   on LinkedIn *is* the marketing engine — their network sees Automatos, some become learners,
   some become platform users. Without an artifact, every completion evaporates.
2. **Gerard's own goal.** "Certified, founder of Automatos AI, teaches others" — his and the
   team's completions should be first-class public proof, on LinkedIn and on a team page.

This is the highest-leverage small build in the backlog: days of work, and every future
completion compounds through it.

## 2. What a "credential" honestly is here (hard rule)

The academy issues **completion badges**, never the external credential. Copy rules:

- Exam tracks: *"Completed the Automatos Academy GH-500 preparation track"* + optional
  self-reported *"Passed GH-500"* flag the learner sets — rendered distinctly ("prep completed"
  vs "reports passing"). We never imply the vendor issued anything.
- Skills tracks (ABF, APA, AI-Security, Cross-Vendor): *"Completed …"* + the track's completion
  definition (ABF: "AI-operational — shipped one real automation"; APA: "Automatos-ready").
- Standard footer on every certificate page: *"Automatos Academy is independent training. Not
  affiliated with or endorsed by any certification body."*

## 3. v1 — zero-backend shareable certificate (ship first)

Local-first constraint holds (no login, no DB). v1 is honest social proof, not cryptographic
verification:

1. **Claim flow.** When the engine's completion condition is met (A+ gate for exam tracks;
   all-modules + capstone check for skills tracks), the readiness/track page shows **"Claim your
   badge"** → learner enters their display name → client generates the certificate URL.
2. **Certificate page** — new engine route (small): `#/cert/<payload>` where payload encodes
   `{name, trackId, date, checksum}` (compact, URL-safe). Renders: learner name, track name +
   code, completion definition, date, the standard footer (§2), academy branding, and two CTAs —
   **"Add to LinkedIn profile"** and **"Start this track"** (the viewer-facing loop-closer: every
   shared cert is a landing page).
3. **LinkedIn Add-to-Profile deep link** — prefilled `linkedin.com/profile/add?...` with
   certification name, organization, issue month/year, and the certificate URL. **Verify the
   current parameter set against LinkedIn's documentation at build time** (params drift).
4. **Share image.** One static OG image per track (title + code + "Automatos Academy") so shares
   unfurl properly; per-name dynamic images are v2 (needs the server).
5. **Download.** "Save as image/PDF" via print stylesheet — good enough for v1.

**Anti-abuse posture, stated honestly:** the payload checksum deters casual URL-editing, nothing
more. v1 badges are social proof; real verification is v2. Do not claim "verified" anywhere in v1.

## 4. v2 — signed badges + verify endpoint (when server.js grows one route)

`server.js` (Express) already exists — v2 adds:
- **`POST /api/badge`** — issues `{certId, signature}` (HMAC, server-held secret) at claim;
  certificate page gains a ✓ "Verify" state via **`GET /api/verify/:certId`**.
- **Dynamic OG image** per certificate (name + track) — one small endpoint.
- **Email capture at claim** (optional field, honest copy: "get your certificate link + track
  updates") — feeds [PRD-GROWTH](./PRD-GROWTH.md) §4; claim works without it.
- Registry is a flat JSON/SQLite file — no accounts, still no login.

## 5. The wall of wins (alumni register — lightweight, curated)

A `#/wall` page: opt-in list of completions + self-reported external passes ("Maria K — GH-500
prep completed · reports passing GH-500 ✓"). v1 is **manually curated** from claim emails +
LinkedIn tags (zero infra, zero moderation surface); v2 auto-lists opt-ins from the badge
registry. Social proof for the academy, motivation for learners, zero gaming incentive (it
certifies effort, not rank — no leaderboard).

## 6. The team page (Gerard's goal #5, made concrete)

A small "Who's behind this" surface (route or section, [PRD-GROWTH](./PRD-GROWTH.md) §5 owns
placement): Gerard + team, each with **real external credentials** (CCA-F, then GH-500, AIGP…
as earned — linked to the issuer's verification page, e.g. Credly) *and* academy badges. Copy
angle: *"We walk the same roadmap we teach — in public."* Updated as the S0–S5 journey
progresses; each new team credential is also a LinkedIn post
([PRD-GROWTH](./PRD-GROWTH.md) §6).

## 7. Engine touches (kept small, vendor-agnostic)

- New route + certificate view (v1: pure client, reads manifest for track names).
- Completion-condition helper per track shape (exam A+ vs skills capstone) — likely exists in
  readiness math; expose it.
- `registration{}`-style addition to track.json: `badge{completionLabel, definition}` (data,
  not code — consistent with [PRD-EXPANSION](./PRD-EXPANSION.md) §5's register pattern).
- Manifest/track copy stays vendor-clean; all badge copy comes from content.

## 8. Acceptance

**v1:** a learner completing any live track can claim, view, download, and LinkedIn-add a
certificate page in <2 minutes · certificate URL renders correctly logged-out/incognito (it's
client-only) · §2 honesty copy present on every certificate · OG unfurl works on LinkedIn ·
"Start this track" CTA on every certificate page · zero engine references to any vendor name
(grep-clean holds).
**v2:** verify endpoint returns issued badges only · email capture optional and honest ·
dynamic OG renders name + track.

## 9. Open decisions (owner)

1. **Badge visual identity** — extend the academy favicon/brand or commission a badge set
   (one template + per-track color/code keeps it cheap and consistent).
2. **Self-reported "passed the real exam" flag** — include in v1 (recommended: yes, clearly
   labelled self-reported) or defer.
3. **Wall of wins** — curated v1 now or wait for v2 registry.
4. LinkedIn organization entity to attribute certifications to (Automatos AI company page vs a
   dedicated Academy page — recommended: the company page; it's the brand being marketed).

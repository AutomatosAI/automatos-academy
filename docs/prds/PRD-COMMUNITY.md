# PRD-COMMUNITY — Community, staged honestly: share cards → percentiles → Discord v0 → (parked) native

**Status:** DRAFT · staging PRD — S1 buildable now, S2 volume-gated, S3 is an ops decision (no code), S4 PARKED · blocked on D-C1..D-C7 (§8) · **Owner:** Academy (Gerard for D-C5) · **Last updated:** 2026-07-16
**Repo:** `automatos-academy` (S1/S2 only — S3 ships links, S4 ships nothing)
**Related:** [PRD-CREDENTIALS](./PRD-CREDENTIALS.md) (honesty rules inherited **verbatim**) ·
[PRD-U2](./PRD-UNIFIED/PRD-U2-SHARED-PROFILES-PROGRESS.md) (Spine + profile, D-U4a real-data rule) ·
[PRD-GROWTH](./PRD-GROWTH.md) §6–7 (the standing Discord deferral this PRD gives an exit condition) ·
PRD-MT-12 (Today plan + celebrations — forthcoming, this wave; share hooks ride its milestone moments) ·
[competitor scan 2026-07-16](../research/competitor-scan-2026-07-16.md)

## 1. Problem

The Academy is fully single-player (scan, synthesis item 7). A learner studies alone, hits a
30-day streak alone, and claims a certificate whose only social surface is the LinkedIn button.
The owner's frame, kept honest:

> Community / share / chat are "out of scope for now, just thinking" — but Discord works as a v0.

This PRD does not build a community. It makes the staging **explicit**, so each step ships learner
value on its own and none buys moderation burden before there are people to moderate:

1. **Share** (S1) — zero social surface, zero moderation. The infra mostly exists: signed badges
   (`server.js` HMAC sign/verify, `BADGE_SIGNING_SECRET`) and server-rendered OG certificate pages
   (`/cert/:payload`). What's missing is the *image*: cert pages unfurl with the generic site-wide
   `og-academy.png`, and streaks/readiness have no shareable artifact at all. Evidence this is the
   cheapest win: Duolingo's designed milestone cards drove 5–10x organic sharing (scan §1, [3P]).
2. **Compare** (S2) — read-only aggregate, zero user-to-user surface. Pocket Prep ships "your
   numbers vs everyone prepping the same exam" (scan §8); the Spine already holds per-user
   mastery rollups and mock history to compute it from.
3. **Gather** (S3) — real humans, on a platform purpose-built for moderation tooling (Discord),
   with the Academy writing no code. [PRD-GROWTH](./PRD-GROWTH.md) §6 deferred this correctly
   ("an empty server is anti-marketing"); S3 defines what v0 looks like *when* it stops being empty.
4. **Build** (S4) — native in-product community. **Parked**, with its real costs written down and
   the conditions that would reopen it.

Each stage is also the value test for the next: if nobody shares cards, percentiles won't save it;
if Discord stays quiet, forums would have been a graveyard.

## 2. Goals

1. A learner can share a milestone — streak, per-track readiness, claimed certificate — as a
   designed card that unfurls properly on LinkedIn/X, under the same honesty rules as certificates.
2. A learner preparing a track can see where they stand among learners preparing the same track —
   **aggregate only**; no other learner is ever visible, rankable, or inferable.
3. A learner who wants company finds the official Discord at moments it's actually wanted (first
   badge, streak milestone) — never as a nag, never as a gate.
4. Every shared artifact is a landing page for the next learner ("Start this track →" — the same
   loop-closer certificates already carry).
5. Nothing in any stage requires accounts, and nothing degrades the signed-out experience.

## 3. Non-goals

- **No native in-product community** — forums, chat, study groups, comments (S4 marker only).
- **No leaderboards or leagues.** Weekly 30-person cohorts (Duolingo/Brilliant/Sololearn, scan
  §1/§2/§3) are volume-gated — they don't work until there are cohorts to fill. Parked with S4.
- **No follower graphs, DMs, or public learner profiles.** Profiles stay private to the account
  (PRD-U2 non-goal stands). Percentiles never become "see who's ahead of you."
- **No engagement bait.** Sharing is learner-initiated; invites appear at post-value moments only.
- **No vendor-credential implication anywhere** — PRD-CREDENTIALS §2 applies verbatim to every
  card, caption, and channel description this PRD creates.
- **No Automatos agent in Discord** (tutor answering in-channel) — future note only (§4.3).

## 4. Design

### 4.1 S1 — Share cards (server-rendered, the `/cert` pattern)

**What exists (checked 2026-07-16):** `/cert/:payload` server-renders an OG page whose markup is
already on the periwinkle system (`academy.css`, `.cert-card`, `data-mood`) — but its `og:image`
is the static site-wide `/og-academy.png?v=2` ("Train your AI mind" brain, 1200×630). So the
*page* post-dates the retheme; the *unfurl image* is generic. PRD-CREDENTIALS §4 already lists
"dynamic OG image per certificate" as the v2 item — this slice builds it and generalises it.

**Card types (three, all 1200×630):**
- **(a) Streak milestone** — "30-day study streak · Automatos Academy". Milestone set (7/30/100…)
  aligned with PRD-MT-12's celebration tiers — reference only; MT-12 owns the celebration surface.
- **(b) Per-track readiness** — "68% readiness · GH-500 prep track". The number is the Academy
  readiness score and the card says so; it binds to the *prep track*, never to the exam ("ready
  for GH-500" as a pass prediction is banned copy — §2's honesty rules).
- **(c) Claimed certificate** — name + track + date, restyled from the existing cert model.

**Mechanics:**
- New share page `GET /s/:payload` + image `GET /s/:payload/card.png`, server-rendered exactly
  like `/cert` (OG tags, no-JS render, short cache; card images are immutable per payload → long
  cache). Payloads reuse the `engine/certificate.js` codec pattern (compact fields + checksum) with
  a card-type field; `decodeCert`-style validation before any render — the server never renders
  arbitrary strings.
- **Signing (progressive, honest):** where the Spine can attest the number (signed-in learner —
  streak from the `/api/me/state` rollup, readiness from the server rollup), `POST /api/badge/sign`
  extends to co-sign share payloads it can check against the DB, and the page shows the existing
  "Signed by the Academy" chip. Signed-out cards ship unsigned — same social-proof-not-verification
  posture as v1 certificates, and the word "verified" never appears (standing `server.js` rule).
- **Rendering:** no headless browser. One SVG template per card type with text slots, rasterised
  via a small pinned dependency (`@resvg/resvg-js`-class — pure wasm, no native toolchain).
  Fallback if the dependency is refused: static per-track OG images (the v1-certificate precedent).
- **Surfaces:** a share affordance on the profile's per-track panels and the readiness page (next
  to the existing claim panel), and on PRD-MT-12's celebration moments (streak toast → "share
  this"). `navigator.share` where available, copy-link fallback (the `certificate.js` pattern).
- **Privacy default: no name.** Streak and readiness cards carry no learner name unless the
  learner opts in at share time (D-C4). Certificate cards keep the name — the learner typed it at
  claim and the name *is* the artifact. As with certs today, the name lives in the URL itself and
  nothing is stored server-side; the share sheet reuses the existing honest copy ("your name goes
  into the link itself").
- **Every share page is a landing page:** track name, one-line honest description, "Start this
  track →", and the standard footer: *"Automatos Academy is independent training. Not affiliated
  with or endorsed by any certification body."*

### 4.2 S2 — Percentile lines (aggregate comparison, volume-gated)

One line, two placements: the profile's per-track panel and the readiness view —
*"Ahead of 60% of learners preparing GH-500"* (caption: *"among learners with synced progress ·
refreshed daily"*).

- **Source:** Spine SQL over the per-user track rollups the server already computes
  (`server/spine/rollups.js` weighted competence; `mock_attempts` for mock-based framing later).
  Population = signed-in learners active in the last 30 days on that track. Computed on read,
  cached in-process for the refresh window — no cron, no new table.
- **Honesty floor (D-C1):** below N distinct active learners on a track, the line is **absent** —
  never "top 40% of 5 users". This extends the Academy's standing real-numbers discipline (profile
  D-U4a "REAL DATA ONLY"; the cold-start rule that an empty state is an invitation, not a fake
  crowd) to any public count or comparison surface.
- **k-anonymity:** aggregate only. No rank ("#3"), no nearest-neighbour, no other user's existence
  exposed. Percentile is bucketed (nearest 5%, rounded **down**) so one learner's movement can't be
  read out of small shifts, and the viewer's line is about the viewer only.
- **Signed-out / local-only learners:** no line (there is no population data about them) — never a
  simulated one.
- **Below-median framing (D-C2):** "ahead of 10%" reads as a verdict. Recommended: below the
  median, anchor to the distribution instead — *"Track median readiness is 54% — you're at 41%"* —
  same data, no fake cheer, no league-table shame.
- Percentile-on-share-cards is explicitly **not** in S2 (cards stay milestone-shaped; revisit only
  if both S1 and S2 earn their keep).

### 4.3 S3 — Discord v0 (official server, zero product code)

PRD-GROWTH §6's deferral stands until S1 telemetry shows people actually share ("LinkedIn-native
first; a Discord only when a real cohort exists"). S3 is what v0 is when that day comes:

- **Channel map (proposal — launch small, collapse anything quiet):** `#start-here` (rules,
  intros, code of conduct), `#wins` (badges, certs, streak milestones — the celebration room, and
  where share cards get posted first), `#practitioner-lane` (S0–S5 cert tracks), `#operator-lane`
  (ABF), `#exam-day` (logistics and experiences — with a **hard no-braindump rule**: vendor exams
  are NDA'd; the Academy never hosts question dumps, in-product or off), `#academy-updates`
  (announce-only; Wire posts can be mirrored here by hand at first).
- **Moderation = code of conduct + a named owner.** Short CoC posted in `#start-here` and gated by
  Discord's native membership screening; AutoMod + slow-mode on from day one so machine tools
  absorb the first wave, not a human. Who holds the mop is D-C5 — Gerard solo is a real recurring
  time cost and should be decided, not defaulted into. An Automatos agent presence (tutor answering
  in `#practitioner-lane`) is a **future note only** — obvious dogfood later, out of scope now.
- **Invite surfacing (D-C6):** post-value moments only — the claim panel's success state (first
  badge), the streak-7 celebration (PRD-MT-12 hook), the certificate page — plus one low-key
  persistent link in the footer and on the profile. Never on the landing page, never an
  interstitial, never blocking.
- **Invite copy stays honest:** Discord is a separate platform under its own terms; the invite
  says so. The credential honesty rules (§2) extend to community spaces the Academy runs — no
  channel, pin, or bot copy may imply vendor certification.
- **Measure from day one** (it feeds S4's trigger): members, weekly organic (non-team) messages,
  wins posted per week.

### 4.4 S4 — PARKED: native in-product community

Marker only — nothing in this PRD builds it. Written down so the parking is a decision, not a drift:

**The real costs:** moderation labour + tooling (reports, blocks, bans, appeals); safety (harassment,
spam, minors); GDPR — user-generated content is a new personal-data category (retention, export,
erasure that reaches quoted/replied content); an abuse and security surface (UGC XSS, spam, scraping);
liability for what learners post under the Academy's domain (braindump hosting risk lands on *us*);
and the product risk that an empty forum is worse than none — the deadest thing on the internet.

**Revisit triggers (D-C7 — all three, not any one):** sustained organic Discord activity, an
Academy weekly-active floor, and a named moderation owner with real hours. If they fire, the first
native increment considered is the smallest one (e.g. an opt-in "wins wall" per PRD-CREDENTIALS §5,
already specced curated) — not forums.

## 5. User stories

- **US-C01** — A learner hits streak-30; the celebration offers "share this"; the card they post
  unfurls with a designed image, and a viewer who clicks lands on a page with "Start this track →".
- **US-C02** — A learner at 68% readiness shares a readiness card with no name on it (default);
  the card states the number, the prep track, and the Academy — and predicts nothing about the exam.
- **US-C03** — A learner preparing GH-500 sees "Ahead of 60% of learners preparing GH-500" on
  their profile; a learner on a 12-user track sees no percentile line at all — not a made-up one.
- **US-C04** — Claiming a first badge shows a one-time Discord invite; declining leaves only the
  footer link. No surface ever blocks on it.
- **US-C05** — No viewer of any card, page, or percentile line can identify another learner or
  their rank; export/delete semantics are unchanged (share payloads are self-contained; nothing new
  is stored server-side about anyone).
- **US-C06** — Someone asks "what was on the exam?" in `#exam-day`; the CoC forbids dumps; a mod
  removes it — the honesty rules hold in community spaces too.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1a | Dynamic certificate OG image | `/cert/...` unfurls with a per-cert periwinkle card (name/track/date); `og-academy.png` remains the site-wide fallback; grep for "verified" stays clean |
| S1b | Streak + readiness cards, `/s/:payload` page + share affordances | Cards render from checksummed payloads only; no-name default with opt-in; signed chip only when server-attested; landing CTA + independence footer on every share page; unfurl verified on LinkedIn and X |
| S2 | Percentile line on profile + readiness | Floor enforced (absent below N — test with a small seeded track); bucketed, rounded down; absent signed-out; refresh cadence + population caption match D-C1/D-C2 |
| S3 | Discord server + CoC + invite moments | Server live with the §4.3 map; CoC posted + screening on; invites appear only at D-C6 moments; metrics visible weekly; **zero product code beyond links** |
| S4 | Parked marker | This section exists; nothing is built; D-C7 reviewed when its numbers move |

S1a ships alone if S1b's renderer decision stalls — it is the smallest honest win.

## 7. Risks

- **Overclaiming cards.** A readiness card is one adjective away from "ready to pass GH-500".
  Mitigation: card copy is reviewed against PRD-CREDENTIALS §2 before ship; "readiness" always
  binds to the prep track; the footer rides every share page; "verified" is grep-banned.
- **Forgeable numbers.** Unsigned cards can be minted with any streak by anyone who reads the
  codec — same exposure v1 certificates accepted knowingly. Posture: cards are social proof; the
  signed chip marks the server-attested ones; we never claim more than that.
- **Small-N embarrassment or de-anonymisation** in percentiles → floor + 5% buckets + aggregate-only
  (§4.2). The floor number is boxed, not defaulted.
- **A dead Discord is anti-marketing** (PRD-GROWTH §6 was right). Mitigation: S3 waits for S1
  sharing evidence; launches with few channels; the team's learning-in-public activity
  (PRD-CREDENTIALS §6) seeds it; quiet channels get collapsed, and a quiet *server* gets closed
  honestly rather than left as a ghost town.
- **Moderation creep onto Gerard.** D-C5 forces the ownership decision before launch; Discord-native
  tooling absorbs the first line; the no-braindump rule is non-negotiable and enforced from day one.
- **Renderer dependency** on the deliberately-thin server. One pinned wasm rasteriser, or fall back
  to static per-track images — never a headless browser.
- **Names in URLs.** True of certificates today and true of cards: deleting your Academy data
  cannot recall links you already posted (nothing was stored to delete). The share sheet says so
  at the moment it matters, in the existing honest register.
- **Below-median discouragement.** Percentile lines can demotivate exactly the learners the Academy
  most wants to keep — D-C2's framing decision exists for this reason, not as polish.

## 8. Decision boxes

| # | Decision | Recommendation |
|---|---|---|
| D-C1 | Percentile volume floor N + bucket width | N = 50 learners active-in-30d per track; 5% buckets, rounded down |
| D-C2 | Percentile refresh cadence + below-median framing | Daily (in-process cache; caption "refreshed daily"); below median switch to the median-anchored line (§4.2) |
| D-C3 | Share-card art direction | Periwinkle-consistent with oversized numerals — the card is the brand in a feed; a bolder social-first look only if unfurl tests read as wallpaper |
| D-C4 | Learner name on streak/readiness cards | **No name by default**; opt-in toggle at share time; certificate cards keep the name (it is the artifact) |
| D-C5 | Discord moderation ownership | Gerard + AutoMod/screening at launch; recruit two mods from the first active members within a month; agent-assisted flagging is a future item, not a plan of record |
| D-C6 | Invite placement moments | First badge claim + streak-7 celebration + certificate page, plus footer/profile links; nothing on the landing page |
| D-C7 | S4 revisit thresholds | Discord ≥ 200 members with ≥ 300 organic messages/month for two consecutive months, AND ≥ 500 weekly-active learners, AND a named moderation owner — reviewed then, not auto-triggered |

## 9. Acceptance

S1: every live card type unfurls correctly (LinkedIn Post Inspector + X validator) · honesty copy
present on every share surface · "verified" grep stays clean · share pages carry the start-track
CTA · signed-out flows unchanged. S2: floor + bucket behaviour proven against a seeded small track
and a seeded large one · no endpoint or view exposes another user's position. S3: launched only at
the D-C6 moments with the CoC live — and only once S1 sharing data says people want a room.

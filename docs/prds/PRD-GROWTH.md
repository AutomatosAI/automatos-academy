# PRD — Growth: reach, measurement & the learning-in-public engine

**Status:** proposed · **Owner:** Academy (Gerard for §6) · **Last updated:** 2026-07-02
**Strategy context:** [STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md) §4 — the
marketing loop is Reach → Teach → Show → Share → Measure; Teach is built, Share is
[PRD-CREDENTIALS](./PRD-CREDENTIALS.md), **this PRD is Reach + Measure + the front door.**

## 1. Why

The academy's thesis — teach what AI can do, then offer the tool — currently has no way to be
found (hash-routed SPA, zero SEO, no distribution plan), no way to be measured (no analytics, no
attribution on "Apply it in Automatos" CTAs), and no owned audience (no email). A free product's
entire budget is distribution; right now the plan spends everything on content and nothing on
anyone seeing it.

## 2. Reach — make the content findable

Cert-prep is a **search category** ("GH-500 study guide", "AIGP practice questions", "CCA-F
exam blueprint"). The operator lane is a social/referral category. Serve both:

1. **Landing shells (v1, low-lift, keeps the no-build SPA intact).** For each track, a real
   static HTML page at a real path (`/tracks/gh-500/` etc.) — title, blueprint summary, what the
   track includes, FAQ, and a "Start free" link into the SPA. Generated at deploy from
   `manifest.json` + track.json by a small Node script (the repo already runs Node scripts +
   tests). Plus `sitemap.xml`, canonical tags, and **JSON-LD `Course` schema** per shell.
2. **Prerender (v2).** If shells prove search demand, prerender curriculum/lesson routes the
   same way (walk content JSON → emit HTML snapshots; History-API routing with `server.js`
   catch-all). Decide on data, not upfront.
3. **The two-door home (§5)** is also a reach feature: bounce is a distribution loss.
4. **YouTube decision (owner):** current videos are self-hosted MP4s. **Recommended: also
   publish to a public YouTube channel** — every module video ("GH-500 Secret Protection in 8
   minutes") becomes its own discovery surface with the academy in the description; self-hosted
   stays for the in-app experience. Trade-off honestly: public videos can be consumed without
   ever visiting — acceptable, because the videos carry the brand. **Verify NotebookLM output
   licensing permits public commercial publication before flipping this switch** (also flagged
   in [PRD-OPS-FRESHNESS](./PRD-OPS-FRESHNESS.md) watch-list).
5. **Listings & partnerships (cheap, credibility-weighted):** Anthropic community/education
   resource listings (CCA-F-holder-built prep is exactly what those lists want), GitHub
   education community, IAPP marketplace (note: official training-partner status is a paid
   program — flag only). One launch post each on the relevant subreddit/HN/Product Hunt when
   the operator lane ships (ABF is the PH-shaped product).

## 3. Measure — attribution or the thesis stays a guess

Privacy-clean analytics (Plausible-style, self-hostable — no cookies, no consent banner,
GDPR-comfortable; UK/EU audience). Events, not pageviews:

`track_start` · `module_complete` · `mock_start` / `mock_score` · `readiness_a_plus` ·
`badge_claim` · `badge_view` (the viral loop's input) · `cta_automatos_click` (every "Apply it
in Automatos"/"Do it now" link, **UTM-tagged per track+module**) · `tutor_message` ·
`notify_me` (§4) · landing-shell → SPA entry.

**The one dashboard question:** *academy visitors → track starts → completions → Automatos
platform clicks → platform signups* (needs a matching UTM report on the platform side). If that
funnel is flat after a quarter of real traffic, the strategy conversation changes — better to
know.

## 4. Own the audience — email, minimally

No accounts, ever (decided). Two honest capture moments:
1. **Badge claim** ([PRD-CREDENTIALS](./PRD-CREDENTIALS.md) §4) — "your certificate link +
   updates to tracks you finished."
2. **"Notify me"** on every `coming-soon` track card — highest-intent signal we can get, and it
   *prioritizes the backlog with real demand data* (if ai-security notify-mes triple gh-500's,
   that's the build order talking).

One list, one monthly send: **The Academy Brief** — what changed in the cert landscape (the
[PRD-OPS-FRESHNESS](./PRD-OPS-FRESHNESS.md) watch-list *is* the editorial calendar: GAIPS GA,
AIGP BoK bumps, GH refreshes), one new/updated module, one automation idea for operators.
Provider: any lightweight tool (Buttondown/Listmonk-class); double opt-in; unsubscribe honored
religiously — this list is borrowed trust.

## 5. The front door — two doors, one academy

Home currently leads with exam rigor ("A+ prep. Only top people qualify.") — right for the
practitioner lane, alienating for the operator described in the strategy review §3. Restructure
the landing (copy/IA, no engine change):

- **Door 1 — "Run your business with AI"** → ABF ([PRD-B1](./PRD-B1-AI-BUSINESS.md)). Plain
  promise: *free, no jargon, you'll ship one real automation.*
- **Door 2 — "Get certified in AI"** → the practitioner lane (persona paths from
  [roadmap/README](../roadmap/README.md): developer → CCA-F/GH-x; security → AI-Security;
  governance → AIGP).
- **Path finder (small, loved):** a 5-question "which track is yours?" quiz — role, goal,
  technical comfort → recommended path. Data-driven from the manifest; no engine surgery.
- **Tagline (owner decision):** keep "A+ prep…" inside exam-track surfaces; the global tagline
  must span both doors. Options: *"Learn AI properly. Prove it."* · *"From 'what is AI?' to
  certified architect."* · *"The free academy for people who run on AI."*
- **Who's behind this** section/page per [PRD-CREDENTIALS](./PRD-CREDENTIALS.md) §6 — the
  founder-teacher story is a trust feature, not vanity: *"Built by Gerard Kavanagh (CCA-F),
  founder of Automatos AI — walking the same roadmap we teach, in public."*
- **Dogfood callout** on the tutor: *"You're talking to an Automatos agent right now — build
  your own in APA module 01."* The strongest Show in the loop, currently unlabelled.

## 6. Learning-in-public — Gerard's cert journey is the content calendar

The S0–S5 roadmap is walked anyway; each stage throws off posts with zero extra study time.
Per stage, four beats (LinkedIn-first — that's where the audience and goal #5 live):

1. **Commit** — "I've booked GH-500 for <date>. Prepping in public; the whole prep is a free
   track." (The §C forcing-function day-1 post.)
2. **Study-along** (1–2/wk) — one distinction per post, straight from a module's video/debate
   ("Secret Protection vs push protection — the distinction the exam actually tests").
3. **Result** — pass post, honest readiness-score screenshot, what the mock got right/wrong.
4. **Launch** — "the track I built to pass is live, free." (Track ships within days of the pass
   while attention is warm.)

Team members walking tracks repeat the pattern (§ [PRD-CREDENTIALS](./PRD-CREDENTIALS.md) §6).
Operator-lane equivalent once ABF ships: one *"this week's automation"* post per week from ABF
module examples. Community: **LinkedIn-native first** (comments as the study group); a Discord
only when a real cohort exists — an empty server is anti-marketing.

## 7. Explicitly out of scope

Paid ads · paid tiers or any monetization (free is the strategy) · accounts/logins · a blog CMS
(posts live on LinkedIn; landing shells are generated) · Discord at launch (§6).

## 8. Legal/brand hygiene (do before the reach push)

Per-track + footer disclaimer: *"Independent training; not affiliated with or endorsed by
Anthropic, GitHub/Microsoft, IAPP, or Google."* · nominative use only — vendor names never in
the academy's own logo/lockups · link, never rehost, vendor PDFs (IAPP BoK) · verify NotebookLM
publication terms (§2.4) · UK/EU basics: privacy page naming the analytics tool + email
provider, no cookies claim kept true.

## 9. Acceptance

Landing shells live for every live track with valid `Course` JSON-LD + sitemap (validate with
Google's tooling) · analytics events flowing incl. UTM-tagged `cta_automatos_click` · the §3
funnel readable end-to-end in one view · notify-me capture on every coming-soon card · two-door
home shipped with the chosen tagline · disclaimers per §8 · first stage of §6 executed with the
S0 exam (the calendar exists and post 1 is published).

## 10. Open decisions (owner)

1. Tagline pick (§5) — three options offered.
2. YouTube public channel (§2.4 — recommended yes, pending NotebookLM terms check).
3. Analytics tool (Plausible-hosted vs self-hosted on Railway).
4. Email provider + "The Academy Brief" name.
5. LinkedIn attribution entity (shared with [PRD-CREDENTIALS](./PRD-CREDENTIALS.md) §9.4).

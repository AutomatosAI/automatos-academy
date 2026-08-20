# PRD-WAVE-LEARNER-UX — see what you've done, know what's next

**Status:** 2026-08-21 · drafted from the full-surface UX review (web DOM-probe audit at 1644/390, app code + both device-pass records) + Gerard's media-completion report · decision boxes §5
**Owner:** Academy (web + server) with three app stories; Gerard decides §5
**Grounding:** every claim verified against the live site or the code on 2026-08-21, not assumed. The review's evidence: 7 routes probed, screenshots per page, `store.js` / `sm2.ts` / sync seam read. File references are real paths.

---

## 1. The moment

Media went from mostly-dark to complete this week (10/10 podcasts, 96+ videos, 295 narrations, 22/23 overview cards). The content now outruns the experience around it in three ways:

1. **A learner cannot see what they've consumed.** Lessons track completion (`store.lessonDone` web, `lessonDone` in the app's SM-2 engine) — but the media we just shipped has **no watched/listened state anywhere**: not on video-hub cards, not on podcast rows, not on the narration player. Watch a video today and the UI forgets it happened. (Gerard's report, verified in code: no media events exist in either client.)
2. **The outside world can't see the product** (every route shares one title/OG/URL identity) **and we can't see the learner** (zero funnel events on web).
3. **The first-timer is unguided.** The pathfinder routes well, but after the first click a non-technical learner is on their own: no orientation, internal jargon on cards ("DIFF 3"), raw markdown on a deciding page, and "what should I do next?" answered only after completions, not on arrival.

One wave, one principle: **make the loop visible — done, next, and why come back.**

## 2. Principles (the non-techy first-timer lens)

- **Guide, don't gate.** Orientation is dismissible, shown once, never a tour you must click through.
- **One ✓ language.** Lessons, videos, podcasts, narrations share one completion visual. Seen at a glance, everywhere the thing is listed.
- **Done is sticky.** Rewatching never un-completes. Manual override always exists (mark done / not done).
- **Local-first, profile-true.** Track everything locally signed-out (the platform's standing PRD-U1/U2 pattern); mirror to the profile the moment they sign in. Nothing is lost for arriving anonymous.
- **Plain words.** No internal vocabulary on learner surfaces. If a label needs explaining, it's wrong.
- **Real numbers only** (the WAVE-ENGAGEMENT invariant) — no invented streaks, no faked social proof. Already policy; this wave extends it to completion stats.

## 3. Stories — Thread A · see what you've done (the completion bug)

### LX-1 · Media completion events `[server] [web] [app]`
**As a learner, when I finish a video, podcast, or narrated lesson, the Academy remembers.**

The web store and app engine gain one event shape: `{ kind: video|podcast|narration, mediaId, trackKey, at, how: auto|manual }`. It rides the **existing** sync seam (`store.js` sync emitter → `sync/syncer.js` → Spine; app `src/sync` queue) — no new transport, no new table family beyond one `media_completions` (user, kind, media_id, completed_at, how; PK user+media_id — idempotent, last write wins).

- [ ] Auto-complete fires per D-LX1's threshold (recommend: `ended` event OR ≥90% position, whichever first)
- [ ] Re-play of a completed item never clears it; position tracking (resume) stays local-only and separate
- [ ] Manual "Mark watched / Mark unwatched" on every media surface — override in both directions
- [ ] Signed-out: recorded locally, visible locally; sign-in flushes the backlog through the existing reconcile
- [ ] Idempotent server upsert; typecheck + repo tests green

### LX-2 · One ✓ language on the web `[web]`
**As a learner, I can see at a glance what I've done and what's left — and rewatch freely.**

- [ ] Video hub cards: completed shows a ✓ chip + quietly-done treatment (reduced emphasis, never hidden); uncompleted unchanged
- [ ] Podcast rows: played ✓ + "resume at 41:20" when part-played
- [ ] Lesson reader Listen player: narration marks listened at threshold; lesson "Mark complete" button (already exists at `lesson.js:83`) keeps its role and picks up the shared ✓ visual
- [ ] Track curriculum rows: media counts join lesson counts ("3/4 lessons · 1/1 video")
- [ ] Profile: per-track media totals (n of m watched) beside mastery — real numbers only
- [ ] Verify in browser (dev-browser) both themes, desktop + 390

### LX-3 · The same states in the app `[app]`
- [ ] Library items and podcast tab show the shared ✓ state; feed's "continue" honours it
- [ ] Events queue offline through `src/sync/queue.ts`; reconcile merges server + local (union, done wins)
- [ ] Device-pass check: watch on web signed-in → appears in app after sync, and vice versa

## Thread B · the review's ranked fixes

### LX-4 · Every page becomes its own page `[web]`
- [ ] `document.title` per route (track pages: "GH-500 — GitHub Advanced Security · Automatos Academy")
- [ ] Per-track share pages with real OG tags, server-emitted from the catalog (name, blurb, stats, brain art)
- [ ] Unknown-track error page speaks the written-404 voice, not `404 /api/catalog/...`
- [ ] (Stretch, own PR) History-API URLs so `/t/github/gh-500` is rankable; hash URLs 301-equivalent redirect

### LX-5 · First-party funnel events `[web] [server]`
Six events, one table, no third-party: `arrived`, `pathfinder_answered(door)`, `track_viewed`, `lesson_opened`, `first_question_answered`, `signed_in` — plus LX-1's media events. Anonymous id = the existing local-store id; joins to user on sign-in.
- [ ] Events post fire-and-forget (never block UI; the 1.5s-race discipline)
- [ ] One admin view or SQL notebook answering: activation rate, drop-off per step, door → track routing quality

### LX-6 · Markdown leak + corpus guard `[academy]`
- [ ] Domain/track overview fields render markdown (or the corpus strips it) — the GH-500 D1 `*place*` / `**…**` leak gone
- [ ] `validate-content.mjs` gains the check (the dead-link-guard pattern): flag raw markdown tokens in plain-text fields

### LX-7 · Voice + reach sweep `[web]`
- [ ] "DIFF 3" → plain words (Easy/Core/Hard or dots) everywhere learners see difficulty
- [ ] Tutor suggestion chips: sentence case, ≥12.5px, ≥44px hit area
- [ ] Padding pass on subnav tabs / footer links / chips to 44px targets (padding, not font-size)
- [ ] One visually-hidden skip-to-content link; lesson + videos templates drop their second `h1`
- [ ] Eyebrow/caption micro-text floors at 12px on phone widths

## Thread C · the first-timer who comes back

### LX-8 · First-run orientation, web `[web]`
**As someone non-technical arriving for the first time, I'm shown how this place works — once, briefly, in plain words.**
- [ ] After the pathfinder lands them on a track: a dismissible 3-point orient (this page = your course · start here → first lesson · your progress lives on this device until you sign in)
- [ ] Never shown again after dismissal (local flag); never shown to returning learners
- [ ] Microcopy pass on the first-session path: no jargon a non-techy can't parse (audit the words: "blueprint-weighted", "SM-2", "readiness" get plain companions or tooltips)

### LX-9 · First-run + findability, app `[app]`
- [ ] Existing onboarding extends: after first course added, one-time coach-marks on the three tabs (Today / Library / Profile), skippable
- [ ] AP-8 folds in here: Settings reachable from every tab (not only the feed burger)
- [ ] AP-6's cheat-sheet actions row ships in the same pass (the two week-one stranger-facing items)
- [ ] The polish rule becomes standing: every new feature's PR names its entry point (≤2 taps)

### LX-10 · "What's next" on arrival, not only on completion `[web] [app]`
The next-step selector (`next-step.js`, PRD-WEB-LOOP §4.4) already answers this after lessons/quizzes/exams.
- [ ] Track page top card for returning learners: "Continue → ⟨next smallest step⟩" from the same selector
- [ ] App feed leads with the same answer (it largely does — verify it uses the selector, not recency)

### LX-11 · Streak mercy `[server] [web] [app]`
- [ ] One missed day is repairable per D-LX3 (recommend: complete any lesson/review today to restore yesterday, once per week)
- [ ] Copy is honest about it ("streak repaired — 12 days") — real numbers, mercy visible, never silent

### LX-12 · The backup nudge `[web] [app]`
- [ ] On first domain completed signed-out: one card — "Everything you've done lives only on this device. Sign in and it's safe everywhere." Once, dismissible, at a moment of pride not a popup on arrival

### LX-13 · The certificate becomes shareable `[web] [server]`
- [ ] `/cert/:payload` page gets per-cert OG tags (badge name, track, A+ standard note) so a LinkedIn paste unfurls properly
- [ ] A visible "Share" affordance on completion + profile; the cert page renders signed-out (it's the ad)

### LX-14 · Exam eve is owned `[web] [app]`
- [ ] T-1 day (exam date known): the plan flips to final-review mode — weakest domains, no new content, and a written send-off
- [ ] Day after: one check-in — "How did it go?" Pass → congratulations + next-track suggestion + (only then) a review/testimonial ask. Not passed → re-plan without shame, retake pacing

## Thread D · the tutor becomes a member benefit

The tutor is the product's most expensive surface and its least controlled: the web
client POSTs **directly to the platform's widget endpoint** (`tutor.js:177` →
`{apiBase}/api/widgets/chat`, public key, SSE) — no auth, no metering, no ceiling on
what a free anonymous visitor can spend. Gating it is cost control AND the strongest
sign-in reason the product has (stronger than LX-12's backup nudge — this one gives
something, not just protects something).

### LX-15 · Sign-in gate + server-enforced quota `[server] [web] [app]`
**As the operator of a free app, I can bound what tutor chat costs; as a learner, I know exactly what I get.**

The academy server gains an authenticated proxy — `POST /api/tutor/chat` (Clerk-verified)
→ forwards to the platform widget endpoint → streams back. Both clients switch to it.
Enforcement lives server-side; client gating is UX, never the control.

- [ ] Signed-out request → 401 with a friendly body; signed-in over quota → 429 with reset time
- [ ] Quota per D-LX5 (recommend 10 questions/day), counted per user message, streamed reply counts once
- [ ] `tutor_usage` (user, day, count) upsert — resets by day boundary, no cron needed
- [ ] The public widget key moves server-side with the proxy (no longer shipped to every browser)
- [ ] Per-user and per-IP rate limits on the proxy independent of quota (abuse ≠ usage)
- [ ] App `tutor.tsx` switches to the proxy with the signed-in session; signed-out app users see the same gate
- [ ] The entitlement check is one function (`tutorAllowance(user)`) — the future paid-unlimited tier changes its return value, nothing else

### LX-16 · Quota that never surprises `[web] [app]`
**As a learner, I can see my allowance before I hit it, and hitting it feels like a boundary, not a wall.**

- [ ] Tutor surface shows the meter while composing ("7 of 10 questions left today") — visible before the first send, not after the last
- [ ] Signed-out: the tutor page stays visible (chips, examples — it is the ad); the composer is replaced by a sign-in card that names the deal: "Sign in free — 10 tutor questions a day"
- [ ] At zero: written in the house voice — when it resets, plus what's free right now (reviews, lessons, videos) with links; never a dead end
- [ ] Profile shows today's usage and the reset time; the app mirrors it
- [ ] Verify in browser (dev-browser): signed-out gate, meter states, zero state, both themes

### LX-17 · The feed the crawlers read `[server] [web]`
The Wire already ships the pattern site-wide SEO needs — `/wire/rss.xml`, `/wire/sitemap.xml`,
per-slug SEO shells (`server/wire/index.js:42-47`). Nothing else on the site is indexable.

- [ ] Site-wide `/sitemap.xml`: every live track's share page (LX-4), the Wire sitemap referenced, home + method
- [ ] `<link rel="alternate" type="application/rss+xml">` in the page head — the existing Wire RSS becomes discoverable by readers and crawlers instead of being a secret URL
- [ ] `robots.txt` states the map; the Wire teaser on home links the feed visibly ("Follow the Wire — RSS")
- [ ] Wire posts carry per-post OG (reuse LX-4's plumbing) so shared posts unfurl

## 4. Non-goals

- No third-party analytics SDKs; first-party only
- No autoplay-next / binge mechanics; completion is memory, not a treadmill
- No server-side resume positions (local only) and no watch-time surveillance beyond the completion event
- No un-completing on rewatch, ever
- No gamification beyond the existing streak + LX-11 mercy
- No billing in this wave: the paid-unlimited tutor tier is designed for (one entitlement function) but not built — no Stripe, no plans UI
- No tutor model/prompt changes — this wave meters access, it does not touch answer quality
- No other paywall/entitlement changes anywhere

## 5. Decision boxes (Gerard)

| # | Decision | Recommendation |
|---|---|---|
| D-LX1 | What auto-marks media complete | `ended` OR ≥90% position. Podcasts (60min): same rule — 90% of an episode is a real listen. Alternative: per-chapter, deferred until chapters exist |
| D-LX2 | Completion visibility signed-out | **Show locally signed-out, sync on sign-in** (platform's local-first pattern; nothing lost arriving anonymous). Alternative per the original ask: render ✓ only when signed in — cleaner profile story, but punishes the anonymous first-timer the wave is for |
| D-LX3 | Streak-mercy mechanic | **Repair-by-doing** (finish anything today → yesterday restored, 1×/week) over freeze tokens — no inventory to explain, keeps the habit honest |
| D-LX4 | History-API URLs now or later | Ship titles/OG now (LX-4); route migration as its own follow-up PR — it touches every internal link |
| D-LX5 | Tutor quota size + period | **10 questions/day, resets at midnight UTC, shown in the learner's local time.** Daily beats weekly: predictable cost ceiling, and a daily allowance is a return-visit reason. Weekly invites binge-and-vanish |
| D-LX6 | Signed-out tutor page | **Page visible, composer gated** with the deal named ("Sign in free — 10 questions a day"). The page is the ad; hard-hiding it kills the conversion it exists to drive. Alternative (fully hidden) only if abuse appears |
| D-LX7 | Where quota is enforced | **Academy-side authenticated proxy** (`/api/tutor/chat`). Alternative — platform-side per-widget-key metering — spans repos and can't see Academy identity; the proxy also stops shipping the widget key to every browser |

## 6. Sequencing

1. **LX-6** (half-day, trust on a deciding page) → **LX-1 → LX-2 → LX-3** (the reported bug; server first, clients ride the seam)
2. **LX-4 + LX-5** together (share pages and events share plumbing)
3. **LX-7 + LX-8 + LX-10** (the polish-and-guide pass) · **LX-9** in the app alongside
4. **LX-12 → LX-13** (nudge, then the growth loop; LX-13 reuses LX-4's OG work)
5. **LX-15 → LX-16** (the cost hole closes early — proxy first, then the meter UX; LX-15 can land right after LX-1's server work while the same files are open)
6. **LX-17** rides LX-4's share-page PR (same sitemap plumbing)
7. **LX-11 → LX-14** (mechanics last — they're policy, small code)

## 7. Success metrics

- Activation: median time to first question answered, and % of arrivals reaching it (baseline unknown today — LX-5 creates it)
- Visibility: % of watched videos showing ✓ within one sync (target: all)
- Return: D7 return rate of first-timers, before vs after LX-8/10
- Conversion: sign-in rate within 3 sessions of the LX-12 nudge (vs silent baseline)
- Reach: track-page impressions from search + share-link unfurls (LX-4/13) — any nonzero is new
- Cost: tutor spend per user per day is bounded by construction (quota × per-question cost); total tutor spend becomes forecastable
- Tutor conversion: sign-ins attributed to the tutor gate (the LX-5 `signed_in` event gains a `from` field) — expected to beat every other prompt
- Voice: zero internal vocabulary tokens (DIFF-n, raw API strings, raw markdown) on learner surfaces — checkable by the LX-6 guard

## 8. Open questions

- Narration "listened" per lesson: does it also count toward lesson completion, or stay a separate ✓? (Lean separate — reading and listening are both real completions of different things.)
- Do overview videos (v-ov-*) count in track media totals, or only teaching media? (Lean: count everything listed on the page; the totals must match what the eye sees.)
- "New feed" interpretation check: this PRD reads it as the Wire made publicly discoverable (LX-17) — RSS advertised, site-wide sitemap, posts unfurling. If a *new* feed surface was meant (e.g. a learner activity feed), that is a different story — confirm before LX-17 builds
- Does the tutor quota also meter the in-lesson "ask about this" entry points (question.js), or only the tutor page? (Lean: one allowance for all tutor entry points — one number a learner can hold in their head.)
- LX-5 storage: new table vs the Spine's existing event stream — whichever the Spine's owner prefers; the PRD only requires the six events be queryable.

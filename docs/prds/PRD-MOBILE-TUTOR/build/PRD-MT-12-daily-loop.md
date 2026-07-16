# PRD-MT-12 — The Daily Loop: Today mission, pacing, streak protection, nudges, widget

**Status:** DRAFT for review · **Repos:** `automatos-academy-app` (primary) + `automatos-academy` (one Spine addition: streak fold on `/api/me/state`) · **Wave:** 4 (engagement — after Stage-1 + U2)
**Depends on:** [MT-05](PRD-MT-05-feed.md) (Feed session loop, pinned sessions) · [MT-08](PRD-MT-08-notifications-settings-library.md) (nudge scaffold, settings, exam dates) · [U2](../../PRD-UNIFIED/PRD-U2-SHARED-PROFILES-PROGRESS.md) (server streak `{current,best}` on `GET /api/me/state`, profiles)
**Evidence:** [competitor-scan-2026-07-16](../../../research/competitor-scan-2026-07-16.md). This PRD builds the scan's gap cluster **#1** (a "today" surface with a due number), **#2** (streak protection + milestones), **#4** (exam-date → daily-quota pacing), **#5** (the widget as deadline theater), **#6** (notification craft), plus **weak-area drills** (Pocket Prep "Weakest Subject", Kodie weak-area quizzes) and celebration moments. Gap **#10** (progress-aware proactive tutoring) belongs to [PRD-TUTOR-LIVE](../../PRD-TUTOR-LIVE.md) phase 2 — referenced, not specced here.

## 1. Problem

The scan's verdict: Academy's **content and assessment stack is competitive; the daily-return stack is not.** The winning loop everywhere that wins daily engagement is: *a due number the learner can't unsee (widget + push) → a 3–10 minute session that clears it → visible protection and celebration → a pacing narrative tied to the exam date.* Every prerequisite already exists in this app and none of the surfaces do:

- **SM-2 computes a per-item due date on every answer** (`src/engine/sm2.ts`, mirrors reconciled per U2) and the selector already serves most-overdue-first (`fillDue`, `src/engine/selector.ts`) — but no screen ever shows the learner a due count. The single largest engine-built-but-invisible asset (scan gap #1).
- **Exam dates are settable per track** (`src/feed/examDate.ts`, written by Settings `ExamDateRows.tsx`) and drive selector urgency (`computeUrgency`, 42-day horizon) — but the date is never converted into "do N items today" or "on pace / behind" (gap #4; Pocket Prep's plan-from-exam-date is the category standard).
- **The streak exists twice** (local `src/feed/streak.ts`; server-derived `{current,best}` per U2 §4.3) and is a bare counter: one missed day wipes it. Duolingo's published numbers say protection and celebration are where the retention lives, not the counter — 2 equipped freezes alone +0.38% DAU, milestone animations +1.7% new-learner D7, a 7-day streak → 3.6× course completion (gap #2).
- **The widget is half-built**: `src/widget/snapshot.ts` publishes a versioned JSON snapshot (streak, due count, readiness headline, `asOf`) on every sync/session-end — the native half that renders it was explicitly deferred in MT-08 (gap #5).
- **Notifications ship** (MT-08: answerable nudge, in-context permission pitch, quiet hours, cancel-all-then-schedule) but fire at arithmetic slot times with static copy — no streak-at-risk timing near the learner's real study hour, no copy rotation (gap #6; Duolingo's copy program alone was +0.5% DAU / +2% new-user retention).

## 2. Goals

1. **Opening the app answers "what should I do right now?" in one tap.** A generated daily mission — load-balanced due reviews + one weak-domain drill + optional micro-content — sized to a daily goal, with the due number visible before the first scroll.
2. **The exam date becomes a daily verdict.** "23 days to CCA-F — you're 68% ready, on pace at your current rate." Honest math over data that exists; never a pass promise.
3. **One bad day stops costing the whole streak.** Earned freezes auto-cover a missed day; 7/30/100 milestones are celebrated moments, not silent ticks.
4. **≤ 1 streak-at-risk nudge per day, timed near the learner's habitual study hour**, inside quiet hours, fully opt-in, copy rotated.
5. **The home-screen widget ships**: streak + due count + at-risk state, one tap into Today.
6. **Effort gets a moment**: first lesson, milestones, domain mastered, mock passed — full-screen, typographic, reduced-motion-safe, zero new dependencies.

Instrumentation (F10/01 §9 discipline, day one): `mission_started/completed`, goal attainment, nudge + widget tap-through (extend MT-08 FR-2's `source:` tag with `today|drill|widget`), streak/freeze distribution.

## 3. Non-goals

- **No leagues/leaderboards** — 30-person weekly cohorts need a user volume the pilot doesn't have; revisit volume-gated (scan gap #7 stays open, deliberately).
- **No XP/points/levels economy** — D-U4 stands; the goal ring and streak are the only meters.
- **No social graph** — no friend streaks, no community comparison, profiles stay private (U2 non-goal stands).
- **No share cards / seasonal events** (scan gaps #8/#9) — cheap later on top of this wave's ledger; not now.
- **No bandit copy optimization** — template rotation v1; the Duolingo RDS bandit is a v2 candidate once there's volume to learn from.
- **No server push infrastructure** — local scheduling stands (MT-08 posture); no purchasable anything (freezes are earned, never sold).
- **No proactive tutor** — the tutor that opens with your state is PRD-TUTOR-LIVE phase 2; this PRD only leaves the door open (Today's drill row deep-links the tutor exactly as Feed cards already do).

## 4. Design

### 4.1 Today — the generated daily mission

A **Today strip** at the top of the Feed (v1 placement — D-121): due count, streak flame, pacing line, goal ring (small `RingSweep`), and a Start button. Tapping expands a **Today sheet** — the day's mission as launchable rows:

| Row | Contents | Launch |
|---|---|---|
| **Reviews** | `min(dueNow, reviewCap)` due items, most-overdue-first (`fillDue` order) | Feed session, `preset: 'reviews'` (due bucket only) |
| **Weak-domain drill** | 10 questions on the top domain from `weakSpotRank` ((1−effective)×blueprint-weight — `src/engine/selector.ts`), padded from the next-ranked domain when the pool is thin | Feed session pinned to that domain (the US-071 `pinDomain` param exists), quiz priorities from `src/engine/quiz.ts` |
| **Micro-content** (optional, skippable) | one cached video clip (`ClipCard` exists); a podcast segment only behind the MT-10 flag (`podcastEnabled()`) | existing card routes |

Sizing: the mission targets the **daily goal** (D-123; recommended: items, default 25). Presets shape the existing engine — `useFeedSession` gains a `preset` field that filters `buildSession`'s request; **no new session machinery**, no F11 violation (urgency + competence stay the only selector inputs; the preset narrows *which buckets serve*, it doesn't invent a pace model).

States: **all-done** (tick + tomorrow's forecast count — `countDue` at tomorrow-now, logic already in `src/notifications/forecast.ts`), **fresh user** (no dues yet → drill + micro only), **behind** (pacing line goes warn-toned, §4.2). The soft-stop stays sovereign: Today never overrides the 10-minute humane stop (`SOFT_STOP_MINUTES`).

### 4.2 Load balancing — no 200-card Mondays

Two pure mechanisms (the Anki pattern: balance at *schedule* time, cap at *serve* time):

1. **Write-time interval fuzz** (`src/engine/sm2.ts`): for intervals ≥ 3 days, `due += fuzz` where fuzz is **deterministic** — seeded by `hash(itemId, interval)`, range ±max(1 day, 5% of interval). Items answered together stop re-surfacing together. Wire shape unchanged (`dueAt` already rides the sync event; later-`answeredAt`-wins semantics untouched). Deterministic seed keeps engine tests and mirror reconciliation stable.
2. **Serve-time cap**: Today's Reviews row serves at most `reviewCap` (default 30, constant in `engine/constants.ts`), most-overdue-first. The overflow stays due and the copy stays honest: *"62 due — today's plan covers the 30 most overdue."* No silently vanishing backlog.

### 4.3 Pacing engine — exam date + readiness + volume → a daily verdict

One pure function (`src/engine/pace.ts`, constants in `engine/constants.ts`, worked example in tests — the 03 §5 pattern):

```
pace(examDateMs, readiness, dueNow, unseenInScope, activity, now) → {
  daysLeft        = ceil((examDateMs − now) / DAY_MS)
  readinessPct    = the SC5 headline (0.65·weighted effective competence + 0.35·best mock — readiness-gate.ts)
  requiredPerDay  = ceil((dueNow + unseenInScope) / max(1, daysLeft − MOCK_RESERVE_DAYS))   // reserve last 3 days for mocks
  observedPerDay  = trailing-14-day items/day (median over active days × active-day rate)
  verdict         = no-date | on-pace | close (< 20% under) | behind | exam-past
  quotaToday      = clamp(requiredPerDay, goalItems, 2·goalItems)
}
```

**Honesty rules (binding):** "on pace" is a *coverage* claim — "at your current rate you'll have seen everything in scope and cleared reviews before exam day" — never a pass probability (no learning-curve model exists; inventing one is fake precision). The weakest domain is always named beside the verdict, same rule as the readiness gate ("87% ready; weakest domain D2 (68%)"). Compliance copy register applies: "prepares you for", never "guarantees". `quotaToday` clamps at 2× goal — a behind verdict raises the ask honestly, it does not prescribe a death march. No exam date → no verdict, a set-your-date CTA (deep-link to Settings), and the selector's existing gentle default stands.

**`observedPerDay` needs history SM-2 doesn't keep** (item state stores only the last answer time). New local primitive: an **activity ledger** (`habit:activity:v1`, kv) — per local day: items answered + last session-end hour, ~90-day retention, written by the existing outcomes path. One primitive, three consumers: pacing velocity, habitual-hour (§4.5), studied-today/at-risk (§4.4).

Surfaces: the Today strip line, and the same line on the Readiness screen (SC5) under the headline ring.

### 4.4 Streak mechanics — protection, milestones, at-risk

**The 06 constraint, faced head-on:** `src/feed/streak.ts` deliberately ships *no loss mechanics* and MT-08 FR-1 bans shame copy ("you're losing your streak!" is out) — the 06 risk register's dark-pattern line. The scan's evidence is that **protection is the humane half of the mechanic**: freezes *remove* the punishment a bare counter already inflicts. Recommended stance revision (D-122 signs it): **no shame, no monetization — protection and factual deadlines allowed.** Freezes are free and earned; at-risk copy states a fact and the safety net, never fear.

**Freezes — a pure fold, no schema change.** Both streak and freezes derive from activity-day history the Spine already has (U2 S4 derives `{current,best}` from `progress.answered_at` + `telemetry.created_at` distinct days). One deterministic fold, walking days ascending:

- **Earn:** every 7th distinct active day mints a freeze (Brilliant's earned-by-studying model); **hold cap 2** (Duolingo free-tier parity); overflow is not banked.
- **Auto-cover:** a gap day consumes a held freeze (oldest first) and the streak *continues* (does not increment); no freeze held → the count resets, exactly today's behavior.
- Because consumption is derived, not written, the fold is idempotent, replayable, and cross-device consistent by construction — `GET /api/me/state` gains additive fields `streak{current, best, freezesHeld, frozenDays[]}`; U2's bare-`{current,best}` consumers are unaffected.

The identical fold ships app-side (`src/engine/streakFold.ts`, pure) over the local activity ledger for offline/signed-out display — server and app tested against **shared vectors** (the MT-02 US-024 pattern). The UTC-day (server) vs local-day (device) divergence is U2's accepted v1 trade; it stands here unchanged.

**Milestones:** 7 / 30 / 100 days. Crossing upward fires a celebration (§4.6) once per streak-run (ledger keyed by threshold + run-start day — a reset and re-climb celebrates again, a mere re-render never does).

**At-risk state (local, display + nudge input):** `streak > 0 && !studiedToday(localDay) && now ≥ habitualHour − 1h`. Copy is factual + protective: *"12-day streak · a freeze covers tonight if you rest — 3 minutes keeps it whole."*

### 4.5 Notification policy — one at-risk nudge, timed like a person would

All on the MT-08 scaffold (`src/notifications/`): prefs (frequency 1–3, default **1**; quiet hours 22:00–08:00 local wall-clock), planner (slot 1 = answerable question), scheduler (cancel-all-then-schedule; daily local-time triggers).

- **Habitual hour:** median session-end hour over the trailing 21 days from the activity ledger; cold start (< 5 sessions) falls back to the existing `planSlots` spread.
- **At-risk slotting:** when `streak > 0`, the day's **final** slot moves to the habitual hour (clamped inside the allowed window; quiet hours win) and carries the at-risk body. **Hard invariant: at most one at-risk nudge per day**, regardless of the frequency dial; the dial's other slots keep their existing behavior. Volume never increases — this PRD upgrades slot *content and timing*, not count.
- **Suppression:** ending a session reschedules (the existing `useNotificationLifecycle` + cancel-all idiom) so the at-risk nudge for a studied day is cancelled. Scheduled-content staleness (app killed all day → nudge fires anyway) is the same documented trade the MT-08 planner already carries.
- **Copy rotation, no bandit v1:** the at-risk register (`compliance/nudgeCopy.ts`) grows ≥ 6 templates; rotate by day-index with a no-repeat-within-last-3 memory in kv. Every string through the register — the planner still cannot invent copy.
- **Opt-in:** unchanged — the in-context pitch after the first completed session (`useNudgePitch`), never an OS prompt at onboarding (D-124). Denial respected, no re-nagging.

### 4.6 Home-screen widget — streak + due + at-risk, one tap into Today

**Platform reality (checked 2026-07):** the app is on Expo SDK 54. Expo's first-party **`expo-widgets`** (iOS home-screen widgets + Live Activities from Expo UI/SwiftUI-mapped JSX, App-Group data sharing, no hand-written Swift) shipped **alpha in SDK 55, stable in SDK 56** ([expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56)); it does not exist on 54. The SDK-54-native alternative is `@bacons/expo-apple-targets` + a hand-written Swift WidgetKit target. **Recommended path: upgrade SDK 54 → 56 as this slice's first PR, then `expo-widgets`** — we own a JSX timeline view instead of a Swift codebase. Either way: **dev-build only** (Expo Go cannot render widgets), CNG prebuild, App Group entitlement.

- **Data:** `src/widget/snapshot.ts` already publishes the contract; it gains `version: 2` fields `studiedToday`, `atRisk`, `daysToExam` and `publish()` additionally writes the same JSON into the App-Group container — exactly the seam the MT-08 deferral note reserved. Staleness stays a feature: the widget renders "as of {time}", never pretends to be live.
- **Render:** two data points + state, the Duolingo lesson (only streak + done-today moved retention): streak flame + due count; at-risk after the habitual hour tints the frame and flips the line to the protective copy. No character art, no mood theater — the honesty aesthetic is the brand (MT-11 §2.2).
- **Tap:** deep-link `coach://feed?today=1` → Feed opens with the Today sheet expanded (the root gate still guards pre-onboarding links).
- **CI (no local runs):** pure layers stay vitest; the native half gets an **EAS Build lane** (cloud) producing the dev-build artifact + widget screenshot evidence in the PR — plus the SDK-56 upgrade PR gating on the full existing suite before any widget code lands.
- **Android:** deferred (D-125). `react-native-android-widget` (JSX→RemoteViews config plugin) makes it plausibly cheap later, but the design package deferred Android and the pilot fleet is iOS-first.

**Size honestly: S8 is the largest slice in this PRD** — an SDK major-jump (reanimated/worklets churn expected) plus a native target plus an EAS lane. Everything else in this PRD ships without it; the widget is deliberately last.

### 4.7 Celebrations — typographic, earned, quiet

Four moments: **first lesson completed · streak milestone (7/30/100) · domain mastered** (effective competence crosses the 0.85 readiness floor) **· first mock passed** (per track). Full-screen overlay on session end / mock result: `RingSweep` to 100% + `CountUp` on the number + one `Pulse` on the flame/seal — serif-italic headline, mono kicker, **no confetti, no new dependencies** (MT-11 §2.2: "rewards are typographic, not slot-machine"; the motion kit's `useReduceMotion` already renders final states statically). One kv ledger (`celebrations:v1`) guarantees each moment fires once per achievement; dismiss is one tap, never blocking.

## 5. User stories

- **US-121 — Today strip + sheet:** opening the Feed shows due count, streak, goal ring and pacing line without scrolling; one tap starts the mission's next row. All-done / fresh-user / behind states render in both moods.
- **US-122 — No 200-card Mondays:** a learner who binges 200 items on Sunday sees bounded, honest review days after (fuzz spreads re-dues; serve cap + overflow copy handles the rest). Sync wire shape and engine tests unchanged.
- **US-123 — Pacing verdict:** with an exam date set, Today and Readiness both show "N days to {track} — X% ready, on pace/behind at your current rate", weakest domain named; with none set, a set-your-date CTA and no invented urgency.
- **US-124 — Weak-domain drill:** one tap runs 10 questions on my genuinely weakest blueprint-weighted domain; finishing it updates mastery and the drill row shows the domain's ring moving.
- **US-125 — Streak protection:** missing one day with a freeze held keeps the streak (visibly "frozen", not incremented) on app, web profile, and widget alike; freezes show as earned inventory (n/2) on Today and Profile; nothing about freezes is ever purchasable.
- **US-126 — Milestones celebrated:** hitting day 7 ends the session with a full-screen typographic moment; hitting it again after a reset celebrates again; reduced-motion users get the static version; no moment ever repeats for the same achievement.
- **US-127 — At-risk nudge:** a learner who usually studies at 21:00 and hasn't today gets exactly one factual, protective nudge near 21:00 (inside quiet hours' allowed window), with rotating copy; studying earlier cancels it; frequency dial and opt-in posture unchanged.
- **US-128 — Widget:** streak + due count on the home screen, at-risk tint after the habitual hour, "as of {time}" staleness copy, one tap landing on the expanded Today sheet. Ships from an EAS dev build off the SDK-56 upgrade.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | Activity ledger + `pace()` (pure) + constants | vitest worked example ("23 days · 68% · on pace"); no-date / exam-past / cold-start cases; ledger written by outcomes path, 90-day pruning proven |
| S2 | Load balancing: deterministic SM-2 fuzz + serve cap | 200-card-Monday test spreads re-dues; fuzz deterministic across runs; `events.ts` wire tests untouched and green |
| S3 | Today strip + sheet + session presets (reviews/drill) | strip + sheet screenshots both moods; reviews preset serves due-only most-overdue-first; drill pins `weakSpotRank` top domain × 10; `source: today|drill` telemetry lands |
| S4 | Streak fold (freezes + milestones) shared app/Spine + additive `/api/me/state` fields | server and app pass the **same** test vectors; `freezesHeld`/`frozenDays` additive (bare-streak clients unaffected — U2 S4 test extended); auto-cover proven idempotent |
| S5 | Celebrations overlay + ledger | four moments demoable from a dev screen; refire rules (once per achievement, re-climb re-fires milestones) tested; reduced-motion renders static |
| S6 | At-risk nudge: habitual hour, slot override, copy rotation | planner tests: ≤ 1 at-risk/day invariant under every frequency dial; habitual-hour clamped into allowed window; rotation no-repeat-within-3; register-only copy lint holds |
| S7 | Widget snapshot v2 + `coach://feed?today=1` deep link | snapshot v2 contract tests; deep link opens the Today sheet through the root gate |
| S8 | Widget native ship: SDK 54→56 upgrade PR, then `expo-widgets` target + App-Group publish + EAS lane | upgrade PR green on full existing CI **before** widget code; EAS dev-build artifact + on-device widget screenshot in PR; App-Group read/write verified on the build |

Order: S1→S3 are the spine (ship value alone); S4→S6 layer on; S7/S8 last and severable. Per index §4: CI is the only gate, engines ≥ 80% coverage, PRs per slice, Gerard merges.

## 7. Risks

- **Dark-pattern adjacency (06 register)** — the whole wave lives next to the line. Mitigations are structural: freezes free + earned + auto-applied, at-risk copy factual/protective through the register, ≤ 1/day, full opt-in, soft-stop sovereign, quota clamped at 2× goal. D-122 is the explicit, signed stance revision — nothing ships from §4.4/§4.5 before it.
- **SDK 54→56 jump** (RN minor bump; reanimated 4 / worklets majors expected to churn) — contained as S8's own first PR; every other slice is independent of it by design.
- **Scheduled-notification staleness** — content is fixed at schedule time; an all-day-killed app can fire a stale at-risk nudge. Same trade MT-08 documents; copy is written to be harmless when stale.
- **Server-UTC vs device-local streak days** — the fold inherits U2's accepted divergence; at-risk timing is local-only so a user near midnight UTC never gets nudged about a day the server already closed. One shared-vector case pins the behavior.
- **Web parity of the fuzz** — web `store.js` answers produce unfuzzed dues; harmless (per-item state, later-answer-wins) but Mondays stay lumpy for web-only learners until the U-series ports it. Flagged, not blocking.
- **Pacing trust** — a "behind" verdict that feels arbitrary burns trust; the verdict always shows its inputs (days left, due + unseen counts, your observed rate) so the learner can audit the arithmetic.
- **Quota gaming via micro-content** — clips count toward the goal only once per day; the goal is items-answered-first by construction.

## 8. Decision boxes (Gerard-owned; recommendations pre-loaded)

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| **D-121** | Today placement | **Feed header strip + expandable sheet v1, promote to a 5th tab when it earns it.** The tab dock (Feed/Library/Podcast/Profile) shipped 2026-07-16 (app PR #26); Today starts as the feed's header strip so the loop proves itself before claiming permanent chrome — promoting later is zero rework (the sheet becomes the tab body). | S3 |
| **D-122** | Freeze earn/equip rules **+ the 06 stance revision** | **Earn 1 per 7 distinct active days, hold cap 2, auto-cover oldest-first, never purchasable.** Signing this box amends the 06 "no loss mechanics" posture to: *no shame, no monetization; protection and factual deadlines allowed.* Decline it and S4/S6 reduce to milestones-only. | S4, S6 |
| **D-123** | Daily-goal unit | **Items** (presets 15/25/40, default 25). Items are the engine's native unit and can't be gamed by idling; minutes can. Precedents: Brilliant 3 problems, DataCamp 250 XP ≈ one lesson. Goal is a *target*, never a wall — under-goal days still credit the streak (one session-end = an active day, unchanged). | S1, S3 |
| **D-124** | Notification default at onboarding | **Keep full opt-in via the existing in-context pitch** (after first completed session, `useNudgePitch`), pitch copy extended with the streak framing. Default-on at onboarding converts worse and reads hostile; the register risk table already named fatigue the #1 risk. | S6 (only if overridden) |
| **D-125** | Widget platform order | **iOS first** via the SDK-56 `expo-widgets` path (first-party, JSX, no Swift to own). Android only if pilot pull earns it — `react-native-android-widget` makes it plausibly cheap, but the design package deferred Android and the fleet is iOS-first. | S8 |
| **D-126** | Today on WEB home too? | **Yes — phase 2, owned by the U-series (web repo), not this PRD.** The seed exists: the web home's welcome-back continue strip (`automatos-academy` `715d859`). Web Today = that strip + the due number + the pacing line over the U2 sync client's reconciled state. | — (no slice here) |

# PRD-WEB-LOOP — The web side of the daily habit: Today line, earned-value account ask, personalized home, session end-states

**Status:** DRAFT · gap PRD from the 2026-07-16 flow discussion · blocked on D-WL1..D-WL4 (§8) · **Owner:** Academy (Ralph kit `ralph/web-loop`, [execution plan](../EXECUTION-PLAN-2026-07-17.md) Wave B) · **Last updated:** 2026-07-17
**Repo:** `automatos-academy` only (no app, no platform work)
**Related:** PRD-MT-12 §4.1–4.3 + **D-126** (the explicit hand-off: "Today on web = the continue strip + the due number + the pacing line", owned by the web repo, not MT-12) ·
[PRD-U2](./PRD-UNIFIED/PRD-U2-SHARED-PROFILES-PROGRESS.md) (sync client, server streak, backfill prompt) ·
[PRD-WAVE-ENGAGEMENT](./PRD-WAVE-ENGAGEMENT.md) (cross-PRD invariants apply verbatim) · [PRD-DIGEST](./PRD-DIGEST.md) (consumes S1's exam date)

## 1. Problem

Mobile is getting the full daily loop (MT-12: Today mission, pacing verdict, freezes, widget). Web —
the surface every learner starts on — has only the seed, and four holes around it (all checked 2026-07-17):

1. **A due count with no plan and no clock.** The personal hero (`public/js/views/home.js` personal
   variant over `continue.js` selectors) already shows "N reviews due" chips and a due widget, but
   never "what does today ask of me" or "am I on pace" — and it can't: **exam dates exist nowhere on
   web** (grep `examDate` over `public/js/` is empty; mobile keeps them in `src/feed/examDate.ts`).
2. **The earned-value moment passes silently.** A signed-out learner finishes their first quiz and
   nothing ever mentions that an account would carry that progress across devices. U2 built the whole
   machinery (sign-in → `maybeOfferBackfill()` in `sync/syncer.js`); there is no doorway to it at the
   moment the learner has just created something worth saving.
3. **The pathfinder forgets.** `#/start` (`views/pathfinder.js`) collects answers, emits one
   `path_finder` analytics event, and discards them. A learner who said "I want AI running my
   business" gets both doors and the full undifferentiated grid on every later visit.
4. **Completion screens end the loop instead of continuing it.** Quiz finish offers
   Re-quiz/domain/readiness; mock results offer New exam/Readiness; a lesson just has its nav row.
   None offers the *next smallest step* — or permission to stop ("done for today, streak safe").

## 2. Goals

1. A signed-in returning learner's hero answers, in one line, *what today asks and whether they're on
   pace*: **"12 items today · on pace for Sep 12"** — MT-12's pacing math (§4.3), honestly ported.
2. A signed-out learner's **first** completed lesson/quiz/mock earns exactly one gentle, inline
   "save this progress across devices" prompt — never a modal wall, never nagging (D-WL1 cadence).
3. The `#/start` answers persist; home's track sections lead with the learner's lane thereafter —
   until real progress takes over (the personal hero always outranks the recommendation).
4. Every completion surface (`lesson.js`, `quiz.js`, `exam.js`, `scenario.js`) offers the next
   smallest step — next lesson · N more due · weakest-domain drill · "done for today, streak safe."
5. Signed-out behaviour stays local-first and never degrades; every new number shown is real
   (WAVE-ENGAGEMENT invariants).

## 3. Non-goals

- **No Today sheet / mission engine on web** — MT-12 owns the mission model; web v1 is the strip-level
  loop (line + links into surfaces that already exist). Promote later if the line earns it.
- **No web push/notifications** and no streak-freeze *mechanics* here — freezes are a fold on
  `/api/me/state` (MT-12 S4); web renders the additive fields when they exist, nothing more.
- **No new selector machinery in the hero path** — `continueData` stays one-localStorage-read-per-track
  cheap; the pacing tree fetch rides `heroReadiness`'s existing single-track load.
- **No signed-out fake urgency** — no exam date ⇒ no verdict, ever; no XP/points (D-U4a stands).
- **No account wall.** The ask is an invitation; every surface keeps working without it.

## 4. Design

### 4.1 Web Today — due count + pacing line in the personal hero (a)

- **Exam date setting (the flagged gap, spec'd here):** a per-track "Exam date" row on the readiness
  view (`views/readiness.js`, in the stats panel beside Mocks sat) — a plain `<input type="date">` +
  clear button, mirrored read-only on the profile's per-track panel. Storage:
  `automatos-academy:v1:exam-dates` → `{"{vendorId}/{trackId}": "YYYY-MM-DD"}` — device-local,
  matching mobile's posture (`examDate.ts` is local too; cross-device exam-date sync is flagged, not
  built — §7). When signed in, the setter ALSO fires a one-way push to `/api/me/prefs` **once
  PRD-DIGEST S1 ships it** (feature-detected via the existing 501 convention; local stays the truth).
- **Pacing engine:** `public/js/engine/pace.js`, a pure port of MT-12 §4.3's shape:
  `pace(examDateMs, dueNow, unseenInScope, observedPerDay, now)` → `{daysLeft, requiredPerDay,
  verdict: no-date|on-pace|close|behind|exam-past}`. `requiredPerDay = ceil((dueNow + unseenInScope)
  / max(1, daysLeft − 3))` (last 3 days reserved for mocks, same constant). Web inputs, honestly:
  `unseenInScope` = paced track's question total − answered (the total needs one tree — reuse the
  `heroReadiness` fetch: pacing binds to the same most-advanced started track); `observedPerDay` =
  items *touched* per day over the trailing 14 days from `q{}.at` timestamps (the store keeps only
  the last answer per item — an undercount of true throughput, so the copy says "at your recent
  rate", and for signed-in learners reconcile makes those timestamps cross-device).
- **The line:** rendered under the hero chips row (placement D-WL2) for any returning learner
  (chips-level gate — `continueData != null`, signed in or out): *"12 items today · on pace for
  Sep 12"*. Items today = `min(dueTotal, 30)` (MT-12's serve cap; overflow copy stays honest:
  *"62 due — today covers the 30 most overdue"*). Behind ⇒ *"behind — 18/day gets there"* (the
  verdict names its ask, clamped presentation only; no death-march quota engine on web). No exam
  date ⇒ due count only + a quiet *"Set your exam date →"* link to readiness. The same line renders
  on the readiness view under the verdict — beside where the date is set.
- **Honesty rules (binding, from MT-12):** "on pace" is a *coverage* claim, never a pass
  probability; exam-past says so plainly; every verdict can show its inputs on the readiness view.

### 4.2 Earned-value account ask (b)

- **Moment:** the session end-state, right after value was created — quiz `finish()` panel, mock
  `showResults()`, lesson "Mark complete" click, scenario debrief — when `isConfigured() && !user()`
  (`auth.js` seam). One inline house `.panel` line: *"Nice work — an account saves this progress
  across devices."* [Create free account] [Not now]. **Never a modal, never blocking, never a wall.**
- **Cadence:** at most once per N days (D-WL1, rec 14), tracked in
  `automatos-academy:v1:account-ask` → `{lastShownAt, dismissals}`; after 2 dismissals it retires
  permanently (the topbar Sign in affordance remains — the ask is a doorway, not the door).
- **Wiring:** [Create free account] → `openSignIn()`; on success U2's existing sign-in trigger runs
  `syncNow` + `maybeOfferBackfill()` — the backfill prompt is what actually saves the local history.
  Zero new sync code; this PRD ships only the doorway and its manners.
- **Badge-claim rider (D-WL3, rec yes):** the claim panel (`views/certificate.js`) is the highest
  earned-value moment on the site — signed out, one extra line under the existing "your name goes
  into the link itself" hint offers the same ask, same cooldown ledger.
- **Telemetry:** `account_ask_shown|clicked|dismissed` (+ `exam_date_set`, `pace_line_shown` for
  §4.1) join the single analytics vocabulary in `analytics.js`.

### 4.3 Pathfinder-personalized home (c)

- **Persist the walk:** `pathfinder.js result()` writes `automatos-academy:v1:pathfinder` →
  `{answers, recs, lane, at}`; `lane` = the first recommendation's manifest `lane`
  (foundations/operator/practitioner — the same field `doors()`/`onRamp()` already switch on).
  "Start over" overwrites; nothing is sent anywhere (local preference, not progress).
- **Home reads it:** `doors()` puts the learner's lane door first with a resume voice ("Pick up
  where the path finder left off: ⟨rec[0].name⟩"); the track grid sorts lane-matching tracks first;
  foundations-lane learners keep the on-ramp as their lead. **Real progress outranks it:** once
  `continueData` is non-null the personal hero leads and the lane ordering only shapes the sections
  below — the pathfinder recommendation never displaces "Continue ⟨track⟩".
- **Lifecycle (D-WL4):** expires 90 days after the last pathfinder run; cleared by "Reset my
  progress" and the GDPR wipe paths (it derives from answers about the learner — only theme survives
  a wipe, the U2/D-H1 keep-list philosophy).

### 4.4 Session end-states (d) — the inventory, then per-surface spec

Inventory of actual completion surfaces (checked 2026-07-17):

| Surface | Today's end state | Gap |
|---|---|---|
| `lesson.js` | no screen — the `lesson-nav` row (Prev · Mark complete · Next→ / "Quiz this domain →") | no due-count pull, no closure |
| `quiz.js` | `finish()` panel: score + Re-quiz / Back to domain / Readiness → | fixed links, state-blind |
| `exam.js` | `showResults()`: seal + verdict + New exam / Readiness → + full review | pass and fail get the same next steps |
| `scenario.js` | `finish()` debrief: seal + Re-run / All scenarios | no forward step |

One shared pure selector, `views/next-step.js`: `nextStep(ctx)` → ordered candidates
`{kind, label, href}` — **due reviews** (count + deep link, `continue.js`'s `dueSummary` math) →
**next lesson in scope** → **weakest-domain drill** (readiness `verdict().weakest`, exam tracks) →
**done-for-today**. Null-safe, cheap, never throws (the `continueData` discipline). Per surface:

- **lesson.js** — on Mark complete (and on last-lesson render), one line under the nav row: next
  lesson (the existing button already is it) or *"3 reviews due (~2 min) →"*; nothing due and
  nothing next ⇒ the closing line.
- **quiz.js** — `finish()`'s link row becomes state-derived: more due ⇒ *"Clear 3 more due →"*
  leads; else next unfinished lesson in the domain; else the closing line + Readiness. Re-quiz stays.
- **exam.js** — passed ⇒ Readiness/claim leads (the claim panel lives there); failed ⇒ *"Drill
  ⟨weakest domain⟩ →"* leads (from `res.perDomain`, the same framing readiness uses), then New exam.
- **scenario.js** — next unplayed scenario, else readiness; then the closing line.
- **The closing line:** signed-in with server streak (`syncStatus().profile.streak`): *"Done for
  today — 12-day streak safe."* Signed out: *"Done for today ✓"* — never an invented streak (real
  numbers only). The §4.2 ask composes into these same panels — one composition point, one moment.

## 5. User stories

- **US-WL1** — A signed-in learner with a Sep 12 exam date opens home: *"12 items today · on pace
  for Sep 12"* under the continue chips; tapping the chips lands quick practice, exactly as today.
- **US-WL2** — No exam date set: the hero shows the due count and a set-your-date link, no verdict;
  setting the date on readiness lights the pacing line on both surfaces on next render.
- **US-WL3** — A signed-out learner finishes their first quiz: the finish panel gains one inline
  save-progress line. Dismissing it ⇒ nothing for 14 days; twice ⇒ never again. Signing in later
  still triggers U2's backfill offer unchanged.
- **US-WL4** — A visitor answers `#/start` with "AI running my business": home leads with the
  operator door and operator tracks on every visit — until they start a track, when the personal
  hero takes over.
- **US-WL5** — Finishing a quiz with 3 items due elsewhere offers *"Clear 3 more due →"*; finishing
  with zero due says *"Done for today — streak safe."* and asks for nothing.
- **US-WL6** — Failing a mock leads with *"Drill ⟨weakest⟩ →"*, not a shrug; passing leads to the
  readiness verdict and (when earned) the claim panel.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | Exam-date setting (readiness + profile) + `engine/pace.js` (pure) | engine tests: worked example ("12 today · on pace"), no-date/exam-past/behind/cold-start cases; date CRUD survives reload; grep confirms no pass-probability copy |
| S2 | Hero Today line + readiness mirror | renders for returning learners both moods; signed-out unchanged when no progress; overflow + behind copy exact; `pace_line_shown` fires |
| S3 | `next-step.js` + four end-state integrations | selector unit-tested (due > lesson > drill > done ordering, null safety); each surface screenshot; closing line uses server streak only when present |
| S4 | Earned-value ask + badge-claim rider + cooldown ledger | shown at most once/N days across ALL surfaces (shared ledger test); 2-dismissal retirement proven; sign-in path lands in U2 backfill offer untouched |
| S5 | Pathfinder persistence + lane-led home | lane leads doors + grid ordering; started-track learners see personal hero unchanged; TTL + wipe clearing tested |

S1→S2 are the D-126 hand-off; S3–S5 are independent. Per house rules: PRs per slice, CI is the only
gate, no local runs.

## 7. Risks

- **Pacing trust** — an opaque "behind" burns trust: the readiness view always shows the inputs
  (days left, due + unseen, observed rate), the MT-12 rule.
- **`observedPerDay` undercount** — last-answer-per-item timestamps miss same-week repeats; copy
  says "recent rate", and the verdict is coverage-shaped so the error is conservative (never
  flatters). If it grates, MT-12's activity-ledger primitive ports later.
- **Exam date is per-device** — set it on web AND phone until a server home exists ([PRD-DIGEST]
  S1's `/api/me/prefs` is the natural one; one-way push wired here, sync flagged for the U-series).
- **Ask fatigue** — structural caps (once per N days, 2 lifetime dismissals, inline-only) rather
  than good intentions; the register never says "losing your progress" (no fear copy).
- **Lane lock-in** — a curious learner is not their first answer: "browse every track" stays on the
  result page, doors both remain visible, TTL expires, start-over overwrites.
- **Key sprawl** — three new localStorage keys, all under `automatos-academy:v1:*`, all enumerated
  in the wipe paths (the D-H1 lesson: wipes go through seams, keep-list is theme-only).

## 8. Decision boxes

| # | Decision | Recommendation |
|---|---|---|
| D-WL1 | Account-ask cadence | Once per **14 days**, max 2 lifetime dismissals, then permanent quiet (topbar Sign in remains the standing affordance) |
| D-WL2 | Pacing-line placement | Under the hero chips row (one `.ac-hero__pace` line) + mirrored under the readiness verdict; NOT a floating widget — the line is a verdict, not decoration |
| D-WL3 | Ask also at badge-claim? | **Yes** — the claim moment is peak earned value; same ledger so cadence still holds (a learner never sees two asks in a week) |
| D-WL4 | Lane persistence TTL | 90 days rolling from the last `#/start` run; cleared by progress reset + GDPR wipe; re-run overwrites |

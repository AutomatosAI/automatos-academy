# 01 — Vision & Use Cases

**Status:** Design draft — Week 1. Part of [00-INDEX](00-INDEX.md).

## 1. The insight

Two things are true: (a) the academy is a rich, desktop-first classroom you have to *remember to visit*; (b) most of us lose 30–60 minutes a day to doom-scrolling on autopilot. This app closes the gap by **hijacking the doom-scroll muscle memory** — the same full-screen vertical swipe, but every card is a micro-win of exam knowledge instead of outrage. The academy teaches; this **coaches you daily**, in the 5–10 minute gaps you already have.

## 2. Vision

A pocket coach that knows exactly where you're weak, nudges you at the right moment, and gets you honestly exam-ready — fed by the same living academy content that grows every week, so it never runs dry and never goes stale.

## 3. Positioning

- **Companion to Automatos Academy**, not a separate product — same brand, same identity, same content [D2].
- **Dynamic & always-growing** — a client of the academy content service; new tracks, courses and learning paths appear weekly with **no app release** [D3].
- **A coach, not a content dump** — grounded in exam knowledge graphs, it explains, quizzes and adapts; it doesn't just play you videos.

## 4. Product principles

1. **Active recall first.** Answering beats watching. Video/audio are the low-energy channel; retrieval practice is the default. (The testing effect is one of the most robust findings in learning science.)
2. **Dynamic & rich.** Nothing hardcoded to one track. Levels, learning paths, or free-select — mirror the academy's pathfinder, driven by data.
3. **Grounded & cited.** Every fact traces to an allowlisted primary source; the tutor cites, or says "I don't know."
4. **Humane habit.** Habit-forming, not habit-trapping — specific nudges, honest streaks, a soft daily stop.
5. **Offline-first.** Feed and cards work with no signal (gym, tube). The live tutor degrades gracefully.
6. **Self-maintaining.** Content freshness is the factory's job, not a human's.

## 5. Personas

**P1 — The slammed professional (primary).** 40–60 hr weeks, studies in gym/commute gaps. Needs 5–10 min sessions, hands-free audio, zero friction. *"Tell me what to study, poke me, don't waste my time."*

**P2 — The upskiller / career-switcher.** Motivated but needs structure and a path. Wants to see progress and a credible "you're ready" signal before booking the exam. *"Am I actually on track?"*

**P3 — The multi-cert learner.** Working through several tracks over time as the catalog grows. Wants the app to remember everything and keep strong areas warm while pushing new ones. *"Keep me sharp across everything I've earned."*

## 6. Use cases / user stories

| # | As a user, I want to… | Surface |
|---|---|---|
| U1 | get a specific nudge ("D2 recall slipping — 4 cards, 3 min") and answer from the lock screen | Feed + notifications |
| U2 | doom-scroll a feed that quietly targets my weak spots | Feed |
| U3 | at the gym, listen to a 40-min episode, then get 3 recall cards to lock it in | Podcast |
| U4 | when I get a card wrong, tap "explain" and get a grounded answer | Tutor |
| U5 | ask by voice "explain context windows" hands-free on a walk | Tutor |
| U6 | pick my level / learning path (or a specific track) when I start | Onboarding / Catalog |
| U7 | see an honest "you're 87% ready; weakest is D2" verdict | Readiness |
| U8 | see new content appear as the academy grows, without updating the app | Catalog / Feed |
| U9 | cram a one-page domain cheat-sheet the night before | Feed / Library |

## 7. The path & level model (dynamic)

The academy has a pathfinder (`pathfinder.js`) that today emits a rule-based *ordered list of track ids* — a track-sequence recommender. **Levels and learning paths are not yet first-class objects in the academy's files**; per **[D6]** they become **NEW content objects delivered by the academy file→DB migration** — real path/level objects the app mirrors, not reinvents ([02 §2] adds them to the Content API contract as new object types). Once the migration ships them, on first run you either pick a level/path or jump straight to a track; your selection scopes the mastery map and the feed. Because it's data-driven, when the academy adds a course, level or path it simply appears — no release needed. Paths can span multiple tracks/domains; the mastery map rolls up **per-path and per-track**, with the `path` roll-up sourcing its domain membership from the new path objects [03 §2].

## 8. Disclaimer & trust model

Non-negotiable, with three homes:

- **UI** — every tutor answer carries a *"verify against official docs ↗"* provenance link; a one-time onboarding acknowledgement; an honest footer. Trust you can see.
- **Compliance** — "prepares you for" **never** "guarantees you pass." A clear **non-affiliation** notice: Anthropic, Microsoft/GitHub, Google, IAPP are third-party marks; the app must not imply endorsement. (App-Store + trademark essentials — see `06-risks-compliance.md`.)
- **Positioning** — *we get you ready; the official practice exam confirms it.* The disclaimer is a feature, not an apology.

## 9. Success metrics

- **Habit:** D1/D7/D30 retention; sessions per week; nudge tap-through — not vanity installs. **Retention needs a defined pilot cohort + window to mean anything (F10)**: D1/D7/D30 must be measured against a named pilot cohort (who counts as "in the pilot," and from what start date) over a defined window, not derived from raw install counts — "installs" alone can't produce a D7/D30 figure that means what the label implies.
- **Learning — anchored to mock-exam score trajectory, not the app's own number (F10).** The headline learning metric is **mock-exam score trajectory**: the trend in `mock_attempts` (`02-architecture.md` §3) scores over time per user, per track. This is the one semi-objective signal in the package — everything else the app reports (readiness %, weak-domain closure) is the app's own competence model agreeing or disagreeing with itself, which is not the same as evidence of real learning. Weak-domain closure rate and % who reach the readiness gate before their exam date remain useful *secondary* signals (they explain *why* the trajectory moves), but the trajectory is the metric that answers "is this app actually working."
  - **Ground truth: an optional post-exam "did you pass?" prompt.** After a user's stated exam date passes (`05-ux-flows.md` SC7 target-exam-date field), the app can optionally ask a one-tap "did you pass?" question. This is the only point in the whole product where a real, external, ground-truth outcome is available — everything upstream of it (mastery map, readiness verdict, mock score) is a proxy. It's opt-in (a user may decline or ignore it), so it supplements the mock-trajectory metric rather than replacing it, but it's the one chance to check the app's internal signal against reality.
- **Trust:** provenance tap-through; tutor "was this helpful" rate; low content-error report rate.

## 10. Non-goals

- Not a replacement for the vendor's official practice exam — a complement to it.
- Not a brain-dump — original, source-grounded questions only.
- Not a passive video library — active recall is the point.

## Changelog — red-team fix-pass

Targeted edits applied from [`08-design-red-team.md`](08-design-red-team.md); good content preserved, rest of the doc unchanged.

- **F10** — §9 anchors the headline **learning** metric to **mock-exam score trajectory** (`mock_attempts`, `02-architecture.md` §3) — the one semi-objective signal — rather than the app's own readiness/competence number agreeing with itself; adds an optional post-exam "did you pass?" prompt as the one ground-truth checkpoint; and notes D1/D7/D30 retention needs a defined pilot cohort + window, not raw install counts. Closes **F10**.

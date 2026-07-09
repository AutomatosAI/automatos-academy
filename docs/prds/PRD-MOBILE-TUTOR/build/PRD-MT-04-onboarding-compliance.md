# PRD-MT-04 — Onboarding + scope + compliance (SC1/SC1b)

**Status:** ready after W0 · **Repo:** app · **Wave:** 1
**Depends on:** MT-01 (paths/levels live), MT-02 (users), MT-03 (scaffold/Clerk/content client).
**Source design:** [../05-ux-flows.md](../05-ux-flows.md) SC1/SC1b, [../06-risks-compliance.md](../06-risks-compliance.md) §3/§5, [../01-vision-usecases.md](../01-vision-usecases.md) §8.

## 1. Why

First-run carries every trust and compliance obligation in one flow: the disclaimer acknowledgement, the **16+ age gate (F15 — Stage-1 exit gate)**, sign-in, and the path/level chooser that scopes the mastery map. Get it wrong and either the App Store or GDPR blocks the pilot.

## 2. User stories

### US-041: Disclaimer + age gate (F15)
- [ ] First-launch sequence per 05 SC1: disclaimer screen (non-affiliation + "prepares you for, not guarantees" + tutor scope boundary + telemetry purpose statement per 06 §5) → one-time acknowledge → **"I am 16 or older" confirmation**.
- [ ] Under-16 → hard stop screen (no guardian-consent flow, no bypass, app unusable beyond it); state persisted so relaunch returns to the stop.
- [ ] Acknowledgement stored once (kv + synced to `telemetry` as consent event with timestamp + copy version id).
- [ ] Copy uses the sanctioned register only (06 §3): never "guarantees", vendor names plain-text.

### US-042: Clerk sign-in
- [ ] Email/password + **Sign in with Apple** (App-Store mandatory) + Google, via `@clerk/expo` on the D-R6 tenant; session persisted in secure store; returning user with valid session skips straight to Feed (05 SC1 re-entry rule).
- [ ] First authenticated call creates the Spine `users` row (MT-02 US-022); failure here is a blocking, retryable error screen — no half-onboarded state.

### US-043: Path/level chooser
- [ ] Three entry modes per 05 SC1: **pick a level** (from `GET /catalog/levels`), **pick a learning path** (`GET /catalog/paths`), or **free-select** from the full dynamic catalog (all live tracks; CCA-F *featured* ordering, nothing hardcoded — D3).
- [ ] Pathfinder-style 3-question helper (port `pathfinder.js` `QS` + `recommend()` — MT-03 fixture parity) offered as "help me choose".
- [ ] Confirm → writes `mastery_map` scope rows (`domain` rows for each in-scope track + `path` row when a path was chosen) via Spine; local mirror in kv.
- [ ] Chooser renders `coming-soon` tracks unpickable-but-visible ("Notify me" deep-link to academy behavior can defer).

### US-044: Prefetch on confirm (F16)
- [ ] On scope confirm (and on SC1b additions): fetch + cache the active track set — full domain-file set per in-scope track, **`blueprintWeight`-prioritized, ~25MB/track cap, text-only** (media excluded) — via MT-06's cache layer; progress indicator with skip ("finish in background").
- [ ] Cache failure degrades gracefully: Feed works online-only until retry succeeds; user told plainly.

### US-045: SC1b additive re-entry (F9)
- [ ] "Manage my tracks" (Settings row, MT-08 surface) and "Add a track/path" (Feed drill-in if no Catalog tab ships in Stage 1 — 05 §SC1b note) both open the chooser in **additive mode**: no disclaimer/age/sign-in repeat.
- [ ] Additive semantics: inserts new scope rows only; existing `mastery_map` rows, competence and `decay_at` untouched (F9); prefetch fires for the added tracks only.

## 3. Functional requirements

- FR-1: The whole flow completes offline-never (SC1 is the one hard-connectivity screen besides SC3, per 05 §offline table); airplane-mode first-run gets an honest "you need a connection to set up" screen.
- FR-2: Consent/acknowledgement copy versioned in one module (`src/compliance/copy.ts`) with ids — changing copy bumps the id, re-prompting only where legally required.
- FR-3: Every screen state reachable in a dev storybook-style route for screenshot review (D5 design-sync loop).
- FR-4: Analytics events: `onboard_start/ack/age_ok/age_blocked/signin_ok/scope_confirmed` (+ path/level ids) → telemetry.

## 4. Non-goals

No marketing/paywall beats, no push-permission ask here (MT-08 asks in-context later — better accept rates and cleaner App-Store review), no guardian-consent flow (deliberate F15 decision).

## 5. Success / exit

Compliance gate F15 demonstrably built (age stop screenshot + persisted-state test); a fresh install reaches a scoped Feed in under 2 minutes on a normal connection; SC1b adds a track without touching existing mastery rows (integration test).

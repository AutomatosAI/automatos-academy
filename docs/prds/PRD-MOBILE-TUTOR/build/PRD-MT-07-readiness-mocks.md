# PRD-MT-07 — Readiness + full mocks + pilot instrumentation (SC5)

**Status:** ready after W1 · **Repo:** app · **Wave:** 2
**Depends on:** MT-05 (Feed drill-in), MT-06 (sync), MT-03 (`readiness-gate.ts`, `exam.ts`).
**Source design:** [../03-mastery-engine.md](../03-mastery-engine.md) §4–§6, [../05-ux-flows.md](../05-ux-flows.md) SC5, [../01-vision-usecases.md](../01-vision-usecases.md) §9 (F10 metrics).

## 1. Why

The readiness verdict is the product's honesty. D7 locked it: **READY ⇔ every in-scope domain ≥ ~85% weighted competence AND a full mock ≥ the vendor pass mark.** This PRD builds the screen that says it plainly, the full-mock flow that feeds Part 2, and the instrumentation the whole pilot is judged by (F10: mock-score trajectory is the headline metric).

## 2. User stories

### US-071: Readiness screen (SC5)
- [ ] Per-track view: headline ring (weighted overall, decay-applied) + per-domain rings with the ~85% floor line marked; weakest domain named in words: *"87% ready; weakest domain D2 (68%)"* (03 §4 honest-output rule — never a bare tick).
- [ ] Two-part gate visualized: domain floor status + best-mock-vs-pass-mark status; both must be green for READY (scale-aware: 720/1000 CCA-F, 300/500 AIGP…, from `track.json.exam`).
- [ ] READY→NOT-READY decay transition renders the soft form: *"you were ready on {date}; a refresh is recommended"* naming the decayed domain (03 §2/F5) — never a bare red NOT READY after a former READY.
- [ ] Path scope: when the user's scope is a path, a path-level rollup view lists member tracks with their gates.
- [ ] Tap a weak domain → drill into a weak-spot session (selector call with domain pinned).

### US-072: Full mock flow
- [ ] Build from engine `exam.ts` (`buildMock` — blueprint-weighted Hamilton allocation, scenarios folded in per the engine); timed, exam-length from `track.json.exam` (`questionCount`, `durationMinutes`); pause = abandon (exam conditions, 03 §4 Part 2 is "under exam conditions").
- [ ] Score via `scoreMock` → scaled score + pass/fail vs vendor mark → written to `mock_attempts` (sync via MT-06); attempt history list with trajectory sparkline.
- [ ] Mock entry points: readiness screen CTA (primary), gated by a friendly "this takes ~{duration} minutes" interstitial; no mock spam — selector never auto-serves a full mock.
- [ ] Result screen: scaled score vs pass mark, per-domain breakdown, one next-action (weakest-domain drill), no celebratory overclaim below A+ ("prepares you for" register).

### US-073: F10 pilot instrumentation
- [ ] Metric events, named and versioned: `mock_attempt {scaled, passed, trackId}`, readiness-gate state transitions, weak-domain closure (domain crossing the floor), D1/D7/D30-computable session opens (cohort keyed by `users.created_at` week) — the 01 §9 set, nothing invented.
- [ ] **"Did you pass?"** one-tap prompt: if the user set an exam date (MT-08 Settings) and it has passed → next app open asks once (Passed / Not yet / Didn't sit); writes the ground-truth event; never re-asks after an answer.
- [ ] A `docs/PILOT-METRICS.md` in the app repo defining each metric's exact event + query so the Stage-1 gate read (07 §5 Gate 1→2) is mechanical, not archaeological.

## 3. Functional requirements

- FR-1: All verdict copy from one module (`src/compliance/verdictCopy.ts`) — the honest-output strings are product law (03 §4), not per-screen improvisation.
- FR-2: Readiness computation on-device from local state (works offline); flagged "as of last sync" when the queue is non-empty.
- FR-3: Ring visuals use the academy grade-ramp tokens (MT-03 theme) — the A+…F motif is the brand.
- FR-4: Mock in progress survives app background/kill ≤ duration (state snapshot); resume or expire honestly.

## 4. Non-goals

No predicted-pass-probability models, no comparative/percentile claims against other users, no schedule/pace commitments (F11), no partial-mock "readiness credit" (drills never flip Part 2 — 03 §4).

## 5. Success / exit

The 03 §5 worked example renders pixel-for-pixel as specified (87%/D2-68% → NOT READY); a full CCA-F mock round-trips to `mock_attempts` and moves the trajectory chart; every 01 §9 metric observable in telemetry with the documented query.

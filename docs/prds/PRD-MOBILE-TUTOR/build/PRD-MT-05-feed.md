# PRD-MT-05 — Feed: cards, session loop, soft-stop (SC2)

**Status:** ready after W0 · **Repo:** app · **Wave:** 1
**Depends on:** MT-03 (engines + content client + theme). Reads cache via MT-06 when it lands; ships against online fetch first.
**Source design:** [../05-ux-flows.md](../05-ux-flows.md) SC2, [../03-mastery-engine.md](../03-mastery-engine.md) §3, [../04-content-factory.md](../04-content-factory.md) §6 (labels/provenance).

## 1. Why

The Feed is the habit — the doom-scroll-shaped loop the whole MVP exists to validate. It is the home surface: sessions of 6–10 selector-served cards, answered in place, updating the same mastery map everything else reads.

## 2. User stories

### US-051: Card renderers
- [ ] Card types per 05 SC2: **Fact** (swipe-through) · **Question** (single + multi, options shuffled via engine `quiz.ts`) · **Micro-lesson** (markdown body, `estMinutes`) · **Scenario** (multi-step branching via engine `scenario.ts`, state in `scenario_progress`) · **Clip** (video/audio embed, on-demand load — never prefetched) · **Reward** (streak/summary beats).
- [ ] Every content card shows: domain chip, **provenance link "verify against official docs ↗"** (resolves `sourceRefs` → resource URL, opens in-app browser), and its **grounding label** (04 §6: "cited + entailment-checked" vs "expert judgment, panel-reviewed"; distinct audio/video label).
- [ ] Question flow: answer → immediate verdict + explanation → **"Explain this"** entry point (Stage 1: expands the explanation + source refs; becomes the SC3 tutor hook in Stage 2 — same affordance, upgraded target).
- [ ] Wrong answers enqueue re-serve via SM-2 (engine handles it; UI just reports the outcome).

### US-052: Session loop
- [ ] Feed refills from `selector.ts` (MT-03) with the 4-bucket mix; session = 6–10 cards; urgency read from exam date (Settings, MT-08) — no exam date set → low-urgency mix.
- [ ] **Lean-in default** (F14): active-recall density is the default experience; lean-back (fact-forward) only via explicit Settings toggle or high-confidence inference, and any inference failure degrades toward MORE recall, never less.
- [ ] Card outcomes write through the engine to kv + MT-06's outbound queue in one place (`recordOutcome()`), so offline/online behavior is identical at the call site.
- [ ] Domain interleave preserved from the selector; no client-side re-sorting.

### US-053: Ethical soft-stop
- [ ] At ~10 min active use (constant in `engine/constants.ts`): soft-stop card — "keep going, or bank it for tomorrow?" — with genuine stop affordance (05 SC2); dismissible, never auto-locks; telemetry `soft_stop_shown/continued/banked`.

### US-054: Reward + streak beats
- [ ] Session-end summary card: cards cleared, domains touched, competence deltas (small, honest numbers — no fake confetti inflation); streak counter with **no loss-shaming copy** (06 risk register: notification fatigue/dark-pattern adjacency).

### US-055: Feed states
- [ ] Empty/edge states: nothing due (back-off maintenance-drip message per 03 §3 back-off — "you're ready; I'll stop nagging"), offline-with-cache (badge "offline — synced later"), offline-without-cache (retry state), scope-empty (deep-link to SC1b).

## 3. Functional requirements

- FR-1: 60fps scroll on a mid-range device with 10-card session (FlashList or equivalent; perf budget in CI is aspirational, manual profiling in PR).
- FR-2: All copy through the compliance register (no "guarantees"); vendor names plain text.
- FR-3: Card render is pure f(card, engineState) — no fetching inside cards; the session is assembled before render.
- FR-4: Deep links: `coach://feed`, `coach://card/{vendor}/{track}/{item}` (notifications, MT-08, land here).
- FR-5: Analytics per card: served/answered/correct/latency + session summary events (feeds F10 metrics).

## 4. Non-goals

No infinite doom-scroll past the soft-stop pattern (deliberate cap), no social/leaderboards, no lean-back autoplay video feed, no tutor chat (Stage 2), no local notifications logic (MT-08).

## 5. Success / exit

A scoped user opens the app → answers a full session offline → outcomes reflected in readiness ring (MT-07) after sync. Session-build + render meets the F10 instrumentation needs (every metric event firing, verified in telemetry inspector).

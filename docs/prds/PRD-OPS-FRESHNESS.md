# PRD — Ops: content freshness, re-verification cadence & the cert-watch agent

**Status:** proposed (runbook starts when 2+ tracks are live) · **Owner:** Academy · **Last updated:** 2026-07-02
**Strategy context:** [STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md) §5, §7.4
**Extends:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) §5 (verification discipline) — from authoring-time rule to operating cadence.

## 1. Why

The academy's differentiator is that its facts are **live-verified, cited, never asserted from
memory** (roadmap §5 — the rule that caught two false "doesn't exist" claims). But verification
is currently a *point-in-time authoring act*, and this space moves under us on a known schedule:
GH-300's objectives changed Jan 2026; GH-500's July-2026 refresh **renamed the product's core
features**; GAIPS goes GA 2026-07-28; IAPP versions its BoK; Google is mid-rebrand on the very
pages S4 cites. A cert-prep site teaching last quarter's feature names is the exact "worse than
useless" failure BUILD_BRIEF warns about. Freshness must become an **operating loop with a
cadence, a diff, and a visible timestamp** — and it's also a marketing asset: no competitor can
honestly show "every fact re-verified on <date>."

## 2. Surface it — `verifiedAt` as a trust feature

- `track.json` gains `verification{verifiedAt, sourceOfTruth[], notes}` (data-only; engine
  renders a small chip on track home + exam surfaces: *"Exam facts verified <date> against
  <source>"* linking the official page).
- The chip is honest both ways: if a track slips past its review window, it shows the *old*
  date — visible staleness is the incentive that keeps the runbook alive.
- Landing shells ([PRD-GROWTH](./PRD-GROWTH.md) §2.1) include the same line — it's a
  differentiator exactly where searchers compare us to stale prep sites.

## 3. The quarterly runbook (manual v1)

Per live track, quarterly (or event-driven from the §4 watch-list):

1. Re-fetch the track's `sourceOfTruth` URLs (study guide, cert page, BoK/exam-guide PDF).
2. **Diff the load-bearing facts:** question count · duration · passing score/scale · domain
   list, titles & weights/ranges · feature/product *names* (the GH-500 rename precedent) ·
   price · languages · registration path.
3. No drift → bump `verifiedAt`, log one line. Drift → file the change, edit content (weights
   and exam facts are data, so corrections are edits, not rebuilds), bump `verifiedAt`,
   changelog entry.
4. Append to `docs/research/verification-log.md` — date, track, verdict, what moved. The log
   feeds **The Academy Brief** ([PRD-GROWTH](./PRD-GROWTH.md) §4) — freshness ops *is* the
   newsletter's editorial calendar.

## 4. The standing watch-list (event triggers, consolidated from the PRDs)

| Watch | Trigger date / signal | Action (owning PRD) |
|---|---|---|
| **GIAC GAIPS GA** | after **2026-07-28** | Re-fetch; if MCQ mechanics published → promote S2 to exam-anchored ([PRD-S2](./PRD-S2-AI-SECURITY.md) §2) |
| GH-500 question count | before S0 launch | Confirm ~60 assumption on cert page ([PRD-S0](./PRD-S0-GH500.md) §2) |
| AIGP BoK version + term length | each cycle | v2.0.1 currently; term length still unverified ([PRD-S3](./PRD-S3-AIGP.md)) |
| Gen-AI-Leader passing score | each cycle | Unpublished; `passingScore` stays null until stated ([PRD-S4](./PRD-S4-CROSS-VENDOR.md) §7) |
| OpenAI credential activation | any of the three triggers | Un-park per [PRD-OPENAI-PARKED](./PRD-OPENAI-PARKED.md) §3 |
| **Anthropic next tiers** (developer / advanced architect / seller) | announced for later 2026 | New flagship-lane tracks; CCA-F holder early-access angle (master roadmap §F) |
| Vertex/Gemini doc-path rebrand | at S4 authoring | Pin canonical URLs ([PRD-S4](./PRD-S4-CROSS-VENDOR.md) footer) |
| CCA-F blueprint | each cycle | Verified 27/18/20/20/15 (2026-06); re-confirm — it's the flagship |
| NotebookLM output/publication terms | before YouTube-public switch | Gate on [PRD-GROWTH](./PRD-GROWTH.md) §2.4 |
| Platform drift vs APA/ABF content | each Automatos release | First-party tracks rot too — screenshot/steps check for every **🛠 Do it now** |

## 5. Retirement policy

An exam retires or is replaced (precedent: AWS ML Specialty retired Mar 2026; AI-900 → AI-901
Jun 2026): banner the track ("this exam retires <date> — successor: <x>") → author successor per
[PRD-EXPANSION](./PRD-EXPANSION.md) mechanics → move the old track to an `archived` status
(visible, labelled, excluded from the default list). Never silently delete — learners mid-track
deserve the exit ramp.

## 6. The cert-watch agent (dogfood v2 — the showcase)

Once the manual runbook has run twice (so the checks are proven), automate it **on Automatos**:

- A **scheduled mission** ("cert-watch", quarterly + weekly for dated watch-list rows): fetch
  each `sourceOfTruth` URL → extract the §3.2 fact set → diff against the stored copy → produce
  a drift report (deliverable/document) → notify. Human applies content edits — the agent
  watches, it doesn't rewrite the curriculum.
- Budget-capped, approval on the report only — i.e., exactly the Module 05 guardrail pattern
  ABF teaches. **Label it publicly:** *"This academy's facts are watched by an Automatos agent
  — here's how it's built"* — a live case study usable as an APA/ABF lesson artifact and a
  LinkedIn post ([PRD-GROWTH](./PRD-GROWTH.md) §6).

## 7. Acceptance

`verification{}` present + chip rendered on every live exam track · verification-log exists with
an entry per live track per cycle · watch-list reviewed at every cycle (the §4 table lives at the
top of the log file) · zero live tracks past their review window at any release · retirement
policy applied to the first retiring exam we encounter · (v2) cert-watch mission running with
budget + approval, drift reports archived, public write-up published.

## 8. Open decisions (owner)

1. Cadence: quarterly across the board, or monthly for tracks with a dated trigger in-window
   (GAIPS July–Aug 2026)? Recommended: quarterly + event-driven overrides.
2. Chip copy/placement (design pass with [PRD-GROWTH](./PRD-GROWTH.md) §5's front-door work).
3. When to flip cert-watch from manual to agent (recommended: after two clean manual cycles).

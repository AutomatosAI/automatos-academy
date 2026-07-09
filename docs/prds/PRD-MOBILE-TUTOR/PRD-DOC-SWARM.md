# PRD — Mobile Tutor Design-Doc Swarm

**Status:** Ready to execute. Part of [00-INDEX](00-INDEX.md).
**Type:** Meta-PRD — the deliverable is the design package itself (docs 02–08). Stories = docs.

## Goal

Produce the remaining Mobile Tutor design docs as a **parallel, reviewed swarm** — each story in fresh context, bound to a shared constitution, with acceptance criteria and a review gate — and end up with a package that is coherent *despite* fresh-context agents.

## The constitution (required reading for EVERY story)

Every story agent MUST read and conform to:

- [`00-INDEX.md`](00-INDEX.md) — locked decisions (D1–D5), glossary, dependencies, artifact map
- [`01-vision-usecases.md`](01-vision-usecases.md) — personas, use cases (U1–U9), principles, trust model
- `02-architecture.md` — three tiers, Content API, data model, stack *(Wave 0 — locked before the swarm)*

**Rules for every agent:** conform to the constitution's decisions and vocabulary; do **not** re-litigate D1–D5; do **not** unilaterally descope; if you find a conflict, **flag it** in a `## Open conflicts` section rather than resolving it yourself; output markdown + mermaid only, **no code**.

## Waves (dependency order)

| Wave | Stories | Mode |
|---|---|---|
| **0 — Foundation** | S02 | solo, locked before swarm (gates everything) |
| **1 — Swarm** | S03, S04, S05, S06 | parallel, fresh context each |
| **2 — Sequence** | S07 | after 01–06 exist |
| **3 — Review** | S08 | red-teams 00–07 |

## Stories

Each: **Owns** (scope) · **Excludes** (hand-offs, to prevent overlap) · **AC** (acceptance criteria) · **Lens** (review perspective).

### S02 — Architecture · Wave 0
- **Owns:** three-tier model (Factory/Spine/Surfaces) + diagram; academy **Content API** contract (preserves today's JSON schema); Postgres data model (users, mastery_map, progress, content_cache, telemetry); Clerk auth (plan-capable, free-through-pilot, Sign-in-with-Apple); offline/sync; stack (Expo recommendation + rationale + Capacitor alternative); key decisions & rationale.
- **Excludes:** selector math (→S03), factory internals (→S04), screen layouts (→S05).
- **AC:** mermaid three-tier diagram + 2 data-flow diagrams; data model as tables; API contract explicitly references `manifest.json`/`track.json`/domain schema; every locked decision reflected; ≤ ~220 lines; no code.
- **Lens:** architect.

### S03 — Mastery engine · Wave 1
- **Owns:** mastery model (item-level SM-2 → domain rollup + decay); adaptive selector (4 buckets: due-review / weak-spot / new / stretch, weighted by exam date); spaced repetition; readiness gate ("you're ready" = all domains ≥ threshold AND mock ≥ real pass mark); per-path & per-track rollup.
- **Excludes:** storage (→S02), readiness *screen* (→S05).
- **AC:** selector as plain numbered steps (no code); readiness-gate formula; worked example ("87% ready, weakest D2"); grounds itself in existing `store.js` (SM-2) + `readiness.js`.
- **Lens:** product + learning-science.

### S04 — Content factory · Wave 1
- **Owns:** Automatos playbooks + cadence (nightly feed / weekly podcast / quarterly graded-bank); full content-type catalogue; NotebookLM pipeline (clips, podcast, mind-maps, carousels); the **verification gate** (cite-*supports* not cite-*exists*; independent + adversarial validator; source-drift auto-invalidation via KG); source **allowlist** (per-track, from `track.json.verification.sourceOfTruth`; security-sensitive, versioned); draft→published promotion; factory observability/alerting.
- **Excludes:** how the app renders content (→S05); app data model (→S02).
- **AC:** factory data-flow diagram (playbook → gate → published → app); cadence table; content-type table; the gate's explicit pass/fail rules; allowlist governance; reliability/alerting section (references the silent-playbook-failure lesson).
- **Lens:** security + architect.

### S05 — UX flows · Wave 1
- **Owns:** screen inventory; **every screen-flow diagram** (onboarding + path/level select, Feed, Voice Tutor, Podcast, Readiness, Library/cheat-sheets, Settings/frequency, Notifications); per-persona user journeys; the three surfaces; lock-screen widget + answerable notifications; the ethical soft-stop.
- **Excludes:** hi-fi visuals (later phase); engine math (→S03).
- **AC:** box-and-arrow mermaid flow for every screen; one journey each for P1/P2/P3; every screen mapped to use cases U1–U9; offline behavior noted per screen. Fidelity = flow diagrams (D4).
- **Lens:** UX.

### S06 — Risks & compliance · Wave 1
- **Owns:** risk register (notification fatigue, auto-content quality, factory reliability, scope creep, token cost, voice latency); disclaimers (three homes); IP/trademark + **non-affiliation**; App-Store review gotchas (Sign-in-with-Apple, "prepares you for" not "guarantees"); privacy/GDPR (Clerk, telemetry, age gating); security (allowlist governance, KG/PII).
- **Excludes:** gate mechanics (→S04, reference only).
- **AC:** risk register table (risk / likelihood / impact / mitigation / owner); compliance checklist; App-Store gotcha list; references the disclaimer model in 01.
- **Lens:** security + compliance.

### S07 — Roadmap · Wave 2
- **Owns:** staged plan (MVP → v1 → factory-on); milestones; review gates; in/out per stage; the academy file→DB migration as a sequencing dependency.
- **AC:** stage table with entry/exit criteria; explicit MVP cut; sequences S02–S06; calls out the academy-DB dependency and the Expo build path.
- **Lens:** architect + product.

### S08 — Design red-team · Wave 3
- **Owns:** multi-perspective critique of 00–07 (architect / security / product / UX); cross-doc consistency, contradiction & duplication check; gap list; go/no-go for hi-fi + build.
- **AC:** findings table (doc / issue / severity / fix); consistency matrix; explicit "ready to proceed to Claude Design + build?" verdict.
- **Lens:** this IS the review.

## Whole-swarm success criteria

- All 7 docs exist, each meeting its AC.
- **Zero contradictions** across docs (S08 confirms).
- Every locked decision (D1–D5) honored; no unilateral descoping.
- Markdown + mermaid only — **no code**.

## Execution (pick one)

- **In-session Workflow (recommended for docs):** Wave 0 solo → Wave 1 parallel (fresh context each) → Wave 2 → Wave 3 review. Runs live; outputs return for immediate reconciliation. Pin the model explicitly.
- **Ralph (overnight):** convert this PRD to `prd.json` (ralph skill); human launch. The right tool when we build the *app*; heavier than needed for markdown.

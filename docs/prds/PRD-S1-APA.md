# PRD — S1: Automatos Platform Architect (APA) track

**Status:** planning · **Owner:** Academy · **Last updated:** 2026-07-01
**Parent:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) · **Shape modelled on:** [PRD-S0-GH500.md](./PRD-S0-GH500.md)

## 1. Why

**Free training on Automatos — for self-learning and awareness, not a sales funnel.** APA teaches
people to actually *use* Automatos end to end. It exists to (a) help people build real AI skills and
(b) pull awareness to Automatos AI. The academy is a **free** marketing + community + self-learning
asset — **there is no paid tier to convert to.** It activates the existing
`automatos/platform-architect` manifest stub (code **APA**). First-party means we own the whole
curriculum, derived from the real capabilities across **all the `automatos-*` repos** (see §3) — teach
what the platform actually does today.

> This track is also the deepest expression of the academy-wide **"apply it in Automatos"** thread:
> every *other* track teaches an external skill, then shows how to do it with Automatos; APA is that,
> end to end.

## 2. Training model — no exam, no A+ gate (skills-track shape)

APA uses the **skills-track shape** (like [S4](./PRD-S4-CROSS-VENDOR.md)), not the exam engine:
- **No `track.exam{}`, no mock exam, no A+ readiness gate.** Progress = modules completed + the
  capstone build, not a scaled score. Optional per-module *ungated* knowledge checks for
  self-assessment — never pass/fail.
- **Completion = "Automatos-ready":** the learner can build and run real work on Automatos. A
  completion badge is a shareable proof of skill — no conversion metric; it's a free academy.
- `blueprintNote`: "Free first-party platform-training track — capability curriculum derived from the
  `automatos-*` repos; no proctored exam."

**Hands-on by design:** every module ends in a *do-it-in-Automatos* step on the free platform, and the
capstone is the learner's first real build. The goal is a capable, confident user who becomes an
advocate — skill and awareness, not a sales funnel.

## 3. Capability curriculum (from the `automatos-*` repo survey — no weights, no exam)

> **Being rebuilt from a live survey of every `automatos-*` repo** (in progress). The table below is a
> first sketch only; a no-exam training track needs no weights (ignore the weight column — it will be
> dropped). These are **curriculum sections**, not weighted exam domains, and will be replaced by the
> real capability map + the canonical vocabulary from `automatos-gitbook`.

| d | Domain | Weight | slug |
|---|---|---|---|
| d1 | Platform foundations & the operating model (Learn→Build→Decide→Prove→Ready; agents vs recipes vs missions vs playbooks — when to use which) | 0.16 | `d1-foundations` |
| d2 | Agents, orchestration & the agentic loop (agent design, chatbot/recipe execution paths, tool routing) | 0.18 | `d2-agents` |
| d3 | The operating graph & tools (capability selection, Composio, MCP, hint/routing services) | 0.16 | `d3-tools-operating-graph` |
| d4 | Knowledge — RAG, knowledge & code graphs, NL2SQL | 0.16 | `d4-knowledge` |
| d5 | Memory & context (memory, field memory, context management) | 0.12 | `d5-memory-context` |
| d6 | Deliverables & workspace (documents, templates/block editor, generation) | 0.10 | `d6-deliverables` |
| d7 | Governance & operations (budgets, blueprints, approvals, RBAC/tenancy, observability, local + SaaS deploy) | 0.12 | `d7-governance-ops` |

Sum = 1.00 ✓. (7 domains — the engine is domain-count-agnostic, like GH-300's 6.)

## 4. Content plan (per domain — match CCA-F depth)

Each domain: 3–4 lessons (+ knowledge checks), ≥18–20 questions, 1–2 scenarios, 1–2 labs, resources,
video placeholders. The signature asset is the **reference build** (Gerard's S1 "Prove"): one real
application shipped on Automatos, doubling as the track's capstone lab. Teach *judgment* — when to use
an agent vs a recipe vs a mission; how the operating graph selects the right tools; how budgets and
blueprints enforce safety as policy.

## 5. Research / source library (first-party — internal, not web-scraped)

Unlike the vendor tracks, sources are **internal**: the `automatos-ai` platform docs, the current core
PRDs (the recent 100+ cluster; the operating-graph / routing PRDs 122/64/68; 141 vertical-agnostic;
105 budgets; 121 self-learning), and the platform's own graphify graph. No Firecrawl; no external
exam material. Every question grounds in a platform doc/PRD/`file:line` (same provenance discipline).

## 6. Videos

~10–12 NotebookLM videos from platform docs + lesson bodies, per [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md).
Placeholders first.

## 7. Key risk / dependency (flag to owner)

**The platform is mid-evolution.** Gerard is running an "Automatos OS" coherence review (Auto-as-
orchestrator, real agentic loop, policy plane, the three graphs). Authoring APA content against a
moving target risks churn. **Recommendation:** finalize the APA *blueprint* now (this PRD), but author
the *content* against the platform model once the OS-coherence direction settles — or scope APA v1 to
the **stable** capabilities (agents, tools/operating-graph, RAG, memory, governance) and version it.
Owner's call on timing.

## 8. Acceptance (Ready gate)

`npm run validate` green (weights = 1.0) · renders on all eight surfaces · A+ readiness reachable ·
every question grounded in a live platform doc/PRD · the reference-build capstone lab is real and
shippable · blueprint reconciled against the platform's current capabilities at authoring time.

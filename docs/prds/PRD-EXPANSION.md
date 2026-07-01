# PRD — Multi-Vendor Expansion

**Status:** approved · **Owner:** Academy · **Last updated:** 2026-07-01
**Related:** [AUTHORING.md](../AUTHORING.md) · [BUILD_BRIEF.md](../BUILD_BRIEF.md) · [VIDEO_PIPELINE.md](../VIDEO_PIPELINE.md) · [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md)

## 1. Why

Automatos Academy ships one live track today — Anthropic **CCA-F**. The engine is
**content-driven**: a track is data under `public/content/`, not code. That makes "repeat CCA-F
for another vendor" a *content* exercise with **zero engine changes**. This PRD is the umbrella
for adding vendor tracks and the sequencing behind them.

The manifest already carries `coming-soon` stubs for three future vendors:
`automatos/platform-architect`, `openai/foundations`, `github-copilot/foundations`.

## 2. Outcome

A repeatable, documented pipeline — **research → PRD → author → validate → deploy** — that turns a
real certification blueprint into a full track (curriculum, source library, videos, scenarios, mock
exam, readiness gate, register, resources), each grounded in official sources.

## 3. Sequencing (decided)

| Order | Vendor / track | Exam | Why | This-pass deliverable |
|---|---|---|---|---|
| **1** | **GitHub Copilot** `github-copilot/gh-300` | **GH-300** (real, published, 6-domain weighted blueprint) | Only non-Anthropic vendor with a mature, self-enrollable, blueprinted exam | Full planning layer: [PRD-COPILOT-GH300](./PRD-COPILOT-GH300.md), source library, video prompts |
| **2 (parked)** | OpenAI `openai/foundations` | none yet (pilot "AI Foundations", no published weights) | No exam to prep against; can't honestly build exam-prep | [PRD-OPENAI-PARKED](./PRD-OPENAI-PARKED.md) + provisional blueprint + activation criteria |
| later | Automatos `automatos/platform-architect` | internal | Own-platform credential | out of scope here |

**Scope of the current pass = PRDs + research + NotebookLM prompts.** The ~5,200 lines of authored
domain JSON per track is the *next* execution phase, driven by these PRDs.

## 4. The add-a-track playbook (reuse, don't reinvent)

Every track is the same six moves (confirmed against [AUTHORING.md](../AUTHORING.md) and the live
CCA-F files). **No engine rebuild.**

1. **Register** in `public/content/manifest.json` — flip the vendor's stub `status` to `"live"` when
   authored, set `code`, `domains`, and `exam{}`.
2. **Create dirs** — `public/content/<vendor>/<track>/`, plus `…/videos/` and `…/docs/` as needed.
3. **`track.json`** — `exam{questionCount,durationMinutes,passingScore,scoreScale,proctored,
   closedBook,scenarioPool,scenariosPresented,recommendedPrep}`, `blueprintNote`, `domainFiles[]`,
   `officialResources[]`, track-level `videos[]`. Copy the shape from
   `public/content/anthropic/cca-f/track.json`.
4. **Domain files `d1..dN.json`** — each bundles `lessons[]` (+ inline `knowledgeCheck[]`),
   `questions[]`, `scenarios[]`, `labs[]`, `resources[]`, `videos[]`. **`weight` fields sum to 1.0.**
5. **Videos** — produce per [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md); register in `videos[]`.
6. **Validate** — `npm run validate` (`scripts/validate-content.mjs`): weights sum to 1.0, unique
   IDs, every question answerable, every scenario has a `best`, `sourceRefs` resolve.

Canonical examples to copy: `public/content/anthropic/cca-f/track.json` and
`public/content/anthropic/cca-f/d1-agentic-architectures.json`.

The engine is **domain-count-agnostic** — CCA-F has 5 domains, GH-300 keeps its **6**. Just set
`domains` in the manifest and list all six in `domainFiles[]`.

## 5. The eight track surfaces → engine reality

The user-facing flow (Curriculum · Source library · Videos · Scenarios · Mock exams · Readiness ·
Register · Resources) maps to existing engine routes and data — all auto-generate from content:

| Surface | Engine route | Backed by |
|---|---|---|
| Curriculum | `#/t/<v>/<t>` + `…/domain/:d` + `…/lesson/:d/:l` | domain `lessons[]`, `objectives` |
| Source library / Resources | `…/library` | track `officialResources[]` + domain `resources[]` |
| Videos | `…/videos` | track + domain `videos[]` |
| Scenarios | `…/scenarios` + `…/scenario/:s` | domain `scenarios[]` (branching `verdict` drills) |
| Mock exam | `…/exam` | `track.exam{}` + all `questions[]` + `scenarios[]`, weighted by domain |
| Readiness | `…/readiness` | mastery math (35% coverage + 65% knowledge) → A+ gate |
| **Register** | *(new, small)* | proposed track field `registration{url,cost,proctor,eligibility}` |

**Register is the one possible small engine touch.** CCA-F treats registration as marketing copy on
the reference site; to make it a first-class per-track surface we add a `registration{}` block to
`track.json` and a small view/CTA. **Spec'd in each track PRD; not built this pass.**

## 6. Research method (applies to every track)

Follow [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md). **Firecrawl** the vendor's **official** docs,
blueprint, and repos into the knowledge base; extract the blueprint (domains + weights); build the
annotated source library (`resources[]`); author original questions *to* the blueprint.

**Hard guardrail (from [AUTHORING.md](../AUTHORING.md)):** official docs & blueprints only. **Never
scrape or reproduce real exam questions / third-party braindumps** — it violates exam terms and the
"original questions only" rule, and produces brittle prep. Every question carries `sourceRefs` to an
official doc.

## 7. Quality bar (inherited, non-negotiable)

- Original questions only, every option explained, every answer grounded in `sourceRefs`.
- Current, verified facts — re-check APIs/features/model IDs against live docs at authoring time.
- Weights sum to 1.0 (`npm run validate` enforces).
- Blueprint verified against the **live** vendor study guide before launch (same discipline as the
  CCA-F "verify blueprint weights" open item).

## 8. Acceptance (per track)

`npm run validate` green · renders on all eight surfaces · readiness **A+ gate reachable** ·
every source in the library is an official primary source · tutor agent
([ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md)) re-pointable at the new corpus.

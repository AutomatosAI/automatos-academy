# Automatos Academy

**A+ prep. Only top people qualify.** — the Automatos learning model, applied to AI-architecture certifications.

> Deployed at **learning.automatos.app**. Flagship track: **Anthropic Claude Certified Architect — Foundations (CCA-F)**.

Automatos teaches one way, everywhere: a repeatable pedagogy —

**Learn → Build → Decide → Prove → Ready**

Tutorials → hands-on labs → scenario drills → full timed mock exams → an honest, graded readiness score. The same engine renders any vendor/track; today the Anthropic CCA-F track is fully authored, with Automatos-platform, OpenAI, and Copilot tracks as designed-in slots.

## Run it

```bash
npm install        # express + compression
npm start          # → http://localhost:4321
```

There is **no build step**. It's a vanilla-JS SPA (ES modules) with JSON content, served by a tiny Express server. Progress is **local-first** (localStorage) — no backend, no login required for Phase 1. `npm run validate` checks every content file against the schema.

## What's here

| Surface | Route | What it does |
|---|---|---|
| Catalog / method | `#/`, `#/method` | The learning model + track catalog |
| Curriculum | `#/t/anthropic/cca-f` | Weighted domain map (blueprint weights) |
| Lesson | `…/lesson/:domain/:lesson` | MDX-style reader + inline knowledge check |
| Domain quiz | `…/quiz/:domain` | Prioritised questions, immediate feedback |
| Scenario sim | `…/scenario/:id` | Branching architecture decisions, graded rationale |
| Mock exam | `…/exam` | 60 Q · 120 min · 720/1000 to pass · 4-of-6 scenarios |
| Readiness | `…/readiness` | Grade seal (A+ gate), per-domain mastery, review queue |
| Library / Videos | `…/library`, `…/videos` | Annotated sources + NotebookLM video hub |

## Architecture

- `public/index.html` — SPA shell · `public/learn.css` — design system (Automatos tokens: Instrument Serif / Geist, bone+pitch themes, grade-seal motif)
- `public/js/engine/` — `quiz` · `exam` · `scenario` · `readiness` (pure, framework-free)
- `public/js/{content,store,router,markdown,ui}.js` — content loader, local-first progress store, hash router, tiny markdown, DOM helpers
- `public/js/views/` — one renderer per surface
- `public/content/<vendor>/<track>/` — `track.json` + one JSON per domain (the vendor-agnostic content model)

**Vendor-agnostic by construction:** the engine never references a vendor by name. Adding OpenAI/Copilot/Automatos is a content-authoring task — see [docs/AUTHORING.md](docs/AUTHORING.md). The full vision spec is [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md); deployment is [docs/DEPLOY.md](docs/DEPLOY.md); growing the video library is [docs/VIDEO_PIPELINE.md](docs/VIDEO_PIPELINE.md).

## Status

Phase 1: engine + all surfaces working; Anthropic CCA-F track authored (D1 hand-written as the reference; D2–D5 authored against it). The blueprint weights (27/18/20/20/15) are reconstructed from public sources — **verify against the official Anthropic Academy page before launch** (the engine reads weights from data, so a correction is a one-line edit). Practice questions are **original**, written to the blueprint and grounded in the official docs — never scraped exam content.

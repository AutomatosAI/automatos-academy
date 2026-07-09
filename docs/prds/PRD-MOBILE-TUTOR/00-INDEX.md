# PRD — Mobile Tutor (Automatos Academy companion)

**Status:** Design — Week 1 (plan → design → review). **No code until the package is reviewed.**
**Owner:** Gerard Kavanagh
**Created:** 2026-07-04
**Working title:** Academy Coach (placeholder — see open decisions)

---

## Goal (one line)

A pocket coach for the Automatos Academy: a doom-scroll-shaped daily habit that focuses your weak spots, a voice tutor grounded in exam knowledge graphs, and gym-ready podcasts — all fed by an Automatos content factory that keeps itself fresh.

## The reframe (why this is smaller than it looks)

The academy already contains the tutor's **brain** as pure functions: SM-2 spaced repetition (`store.js`), blueprint-weighted readiness (`readiness.js`), a graded question bank with provenance, and branching scenarios. This project is **~70% delivery layer, ~30% new invention**. The genuinely new parts are three: the **daily nudge**, **voice/audio**, and an **adaptive session scheduler**. Everything else is porting engine logic you already own onto a phone.

## One engine, three surfaces

| | | |
|---|---|---|
| **Feed** | doom-scroll habit loop (home) | primary |
| **Voice Tutor** | KG-grounded office hours | the depth |
| **Podcast** | gym/commute audio + recall bridges | the passive channel |

All three read and write the **same mastery map**, so studying anywhere updates everything.

---

## Locked decisions (from 2026-07-04 review)

| # | Decision | Choice | Consequence |
|---|---|---|---|
| D1 | Monetization | **Clerk auth (plan-capable) from day one; pilot ships FREE; plans post-pilot** | Build auth + plan hooks now; no paywall/IAP UI in pilot |
| D2 | Brand | **Academy companion** | Reuse academy brand tokens, fonts, identity; shared auth |
| D3 | Launch scope | **Dynamic, academy-fed catalog** — all tracks + learning paths + levels, grows weekly; CCA-F *featured* for the pilot but nothing hardcoded | App is a catalog-driven client of the academy content service; must mirror the path/level selector |
| D4 | Design fidelity (Week 1) | **Flow diagrams first** | Box-and-arrow every screen; hi-fi mockups a later phase |
| D5 | Design tooling | **Flows → Claude Design (claude.ai/design) → `/design-sync` during build** | This week's flows become a Claude Design system; DesignSync keeps code ↔ design in lockstep, one component at a time |
| D6 | Paths & levels | **First-class NEW content objects, delivered by the academy file→DB migration** (resolves red-team F1) | App mirrors real path/level objects; `mastery_map` `path` scope has real source data; the O5 contract must include them |
| D7 | Readiness gate | **Every in-scope domain ≥ ~85% weighted competence AND a full mock ≥ vendor pass mark** — NEW logic on top of `readiness.js`, not "reuse" (resolves red-team F2) | Matches the "competent in all areas" goal; selector + readiness screen build to this one definition |

## Open decisions (settle during design)

| # | Question | Recommendation |
|---|---|---|
| O1 | Cross-platform stack | **Expo / React Native** (pure-function engines port directly). Capacitor only if we want a throwaway habit-validation prototype. |
| O2 | Audio in the pilot, or v2 | Lean **v2** for full podcast surface; prototype one D-level episode + recall bridge on the side during the pilot. |
| O3 | Product name | Placeholder "Academy Coach". Decide before hi-fi. |
| O4 | Progress model at pilot | **Local-first cache + Clerk-account sync** (not local-only — Clerk is in from day one). |
| O5 | Content API contract | Design the app against the current academy JSON schema as the contract; have the **file→DB migration preserve/expose it** as the Content API. Coordinate the two, don't fork them. |

---

## Dependencies

- **Academy file→DB migration.** The app consumes academy content, which is moving from static JSON to a DB-backed **Content API**. The app is a *client* of that API; today's JSON schema (`manifest.json`, `track.json`, domain files) is the de-facto contract the migration should preserve. Coordinate the two so the contract is shared, not forked.
- **Academy path selector / pathfinder** (`pathfinder.js`) — the app mirrors the academy's learning-path + level selection, consumed dynamically rather than reimplemented.
- **Content Factory** (Automatos playbooks) — feeds the academy DB weekly; the app simply sees new published content appear. See `04-content-factory.md`.

## Artifact map (the design package)

Under `docs/prds/PRD-MOBILE-TUTOR/`. Many small files by design.

| Phase | Doc | Covers | Status |
|---|---|---|---|
| **Plan** | `00-INDEX.md` | this file: goal, decisions, artifact map, cadence | ✅ draft |
| **Design** | `01-vision-usecases.md` | positioning, personas, use cases, disclaimer/trust model | ✅ draft |
| | `02-architecture.md` | three tiers, academy Content API, data model, Clerk auth, offline/sync, stack | ✅ draft |
| | `03-mastery-engine.md` | mastery model, adaptive selector, spaced repetition, readiness gate | ✅ draft |
| | `04-content-factory.md` | Automatos playbooks, content types, NotebookLM pipeline, validator/gate, cadence | ✅ draft |
| | `05-ux-flows.md` | screen inventory, every screen-flow diagram, three surfaces, user journeys | ✅ draft |
| | `06-risks-compliance.md` | risk register, disclaimers, IP/trademark, App Store, privacy/GDPR, security | ✅ draft |
| **Review** | `07-roadmap.md` | staged MVP → v1 → factory-on, milestones, review gates | ✅ draft |
| | `08-design-red-team.md` | red-team of 00–07: **GO-WITH-FIXES**, 17 findings + 15 open decisions (§4) | ✅ done |
| **Fix-pass** | `01–07` | red-team fixes applied + independently verified — **package verdict: GO** (17/17 swept) | ✅ done |

## Week-one cadence

1. **Plan** — this index + the four locked decisions. ← *review point*
2. **Design** — docs 01–07 drafted with diagrams. ← *review per doc or in batches*
3. **Review** — doc 08: red-team the whole package (your code-review discipline, applied to the design) before a single line of code.

## Glossary

- **Factory** — Automatos agents/playbooks that generate and maintain content.
- **Spine** — Postgres + Clerk auth + published-content API + per-user mastery map.
- **Surfaces** — the mobile app: Feed, Voice Tutor, Podcast.
- **Verification gate** — the validator that grounds every published item against an allowlisted primary source before it goes live.
- **Mastery map** — per-user, per-domain competence vector that drives what gets served.
- **Readiness gate** — the honest "you are ready for this exam" verdict (all domains clear threshold **and** a full mock ≥ the real pass mark).

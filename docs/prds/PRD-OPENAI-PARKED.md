# PRD — OpenAI track (PARKED)

**Status:** ⏸ parked · **Owner:** Academy · **Last updated:** 2026-07-01
**Related:** [PRD-EXPANSION.md](./PRD-EXPANSION.md) · [research/openai-provisional-blueprint.md](../research/openai-provisional-blueprint.md)

> **Why parked, not built:** as of mid-2026 OpenAI has **no self-enrollable proctored exam and no
> published blueprint**. Its credential program ("AI Foundations") is an employer-gated pilot with
> in-app, scenario-based assessment and a Credly badge — not an exam you can honestly build
> exam-prep against. Building a full track now would mean inventing a blueprint and asserting weights
> that don't exist, which breaks the Academy quality bar. Copilot GH-300 goes first
> ([PRD-COPILOT-GH300](./PRD-COPILOT-GH300.md)); OpenAI waits behind a clear activation trigger.

## 1. Current state (verified 2026)

- Program: **OpenAI AI Foundations Certification** — pilot, launched early 2026, delivered with
  Coursera / ETS / Pearson / Credly. Source: `https://openai.com/index/openai-certificate-courses/`,
  `https://academy.openai.com/`.
- Structure: three course tiers — **AI Foundations**, **Applied AI Foundations**, **Agents and
  Workflows** (advanced).
- Assessment: **scenario-based tasks inside ChatGPT** + a **Credly badge** on completion. **No
  traditional proctored MCQ exam, no published question count / passing score / domain weights.**
- Access: **employer-sponsored pilots only** (Walmart, Accenture, BCG, John Deere, et al.); **not
  open to individual self-enrollment.** A broader proctored "OpenAI Certification" (ETS + Pearson)
  is announced but unspecified; exam development typically runs 12–24 months.

The manifest keeps `openai/foundations` at `status: "coming-soon"`.

## 2. What exists now (this pass)

- This parked PRD.
- A **provisional, clearly-flagged-unofficial** blueprint:
  [research/openai-provisional-blueprint.md](../research/openai-provisional-blueprint.md) —
  constructed from the pilot's three tiers + the OpenAI platform docs, so we can move fast the day
  an official blueprint drops.

**No** source-library crawl, **no** video prompts, **no** domain authoring until activation.

## 3. Activation criteria (any one triggers un-parking)

1. OpenAI (or ETS/Pearson) publishes an **exam blueprint** with domains + weights, **or**
2. the credential becomes **self-enrollable** with a defined assessment, **or**
3. a stable proctored exam code + skills-measured page goes live.

## 4. On activation — the playbook

Run the standard [PRD-EXPANSION](./PRD-EXPANSION.md) pipeline:
1. Re-derive the blueprint **from the official guide** (discard the provisional weights).
2. Firecrawl the official docs → source library ([KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md)).
3. Fill the video-prompt pack from [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md).
4. Author domains → `npm run validate` → flip manifest to `live`.

## 5. Watch list

- `https://academy.openai.com/` and the OpenAI certificate announcement page for a published
  blueprint / self-enrollment.
- Pearson VUE and ETS listings for an OpenAI exam code.

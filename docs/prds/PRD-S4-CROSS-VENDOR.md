# PRD — S4: Cross-Vendor Fluency track

**Status:** approved to author (skills shape) · **Owner:** Academy · **Last updated:** 2026-07-01
**Parent:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) · **Shape modelled on:** [PRD-S0-GH500.md](./PRD-S0-GH500.md)
**Cross-refs:** [PRD-OPENAI-PARKED.md](./PRD-OPENAI-PARKED.md) (the OpenAI *exam* track stays parked — this PRD does not duplicate it)

## 1. Why

Enterprises increasingly want **provider-agnostic architects** — people who reason about *build-vs-buy*
and *portability* across model providers, not partisans of one vendor. The value is strategic: choosing
hosted vs open-weight per workload, avoiding lock-in, negotiating cost/capability/data-residency
trade-offs, and being able to move the *same* application between OpenAI, Google, and open weights when
price or policy shifts. No other stage teaches this cross-cutting judgement; every other track is
single-vendor by design. This track fills that gap.

## 2. Shape decision — SKILLS track (with one optional real-exam sub-track)

**Primary shape: a SKILLS track — no mock exam, no A+ readiness gate.** Most of the field this track
covers has **no self-enrollable proctored exam**, so it does not fit the mock-exam engine:

- **OpenAI — no exam (verified live 2026-07-01).** OpenAI Academy is *courses* (AI Foundations,
  Applied AI Foundations, Agents and Workflows) with in-app/scenario assessment and Credly badges;
  no proctored MCQ exam, no published blueprint/weights/passing score, and the certificate program is
  an **employer-gated pilot**, not open self-enrollment. Sources: `https://academy.openai.com/`,
  `https://openai.com/index/openai-certificate-courses/` (403 to our fetcher on 2026-07-01 — corroborated
  via `academy.openai.com` + the standing findings in PRD-OPENAI-PARKED.md). This matches the parked PRD;
  **do not build an OpenAI exam track here.**
- **Open-weight (Llama / Ollama / Hugging Face) — no exam, by nature.** Pure skills content.

**Exception — one credential IS a real exam.** **Google Cloud "Generative AI Leader"** is a **real,
self-enrollable, proctored certification** as of 2026 (an offline agent claimed it "doesn't exist" —
**false**, live-verified below). It has a published exam guide with four weighted domains summing to 100%.
So S4 ships as a skills track **plus an OPTIONAL real-exam sub-track** for Gen-AI-Leader, which *does* fit
the mock-exam + Ready gate engine.

> **Owner decision needed:** ship the Gen-AI-Leader sub-track as a **full exam-prep mini-track**
> (blueprint below → mock exam → A+ gate) alongside the skills track, or keep S4 skills-only for now and
> spin Gen-AI-Leader out as its own stage later? Recommendation: **include it** — the blueprint is
> already verified, weights are official, and it's a low-lift, business-audience differentiator that
> reuses the exact GH-500/AIGP authoring flow.

**Not here:** **Google Professional ML Engineer** is real but **cloud/ML-heavy** — it belongs to the
**deferred S5 cloud stage**, not this cross-vendor fluency track. Noted, not built here.

## 3. Skills-track outline (in place of a weighted blueprint)

The skills track uses the engine's Learn→Build→Decide→Prove flow **without** the Ready/mock-exam gate.
Modules (each = lessons + knowledge checks + a lab; no scored exam):

| m | Module | Focus | slug |
|---|---|---|---|
| m1 | **OpenAI — API + Agents** | Responses/Chat API, function calling, structured outputs, the Agents SDK (agents, handoffs, guardrails, tracing) | `m1-openai` |
| m2 | **Google Gemini / Vertex AI** | Gemini models, Vertex AI Studio, Model Garden, grounding/RAG, Agent Builder | `m2-google-vertex` |
| m3 | **Open-weight literacy** | Llama family, Ollama (local serving), Hugging Face (Hub, Transformers, Inference) | `m3-open-weight` |
| m4 | **Cross-provider comparison** | Cost/capability/latency/data-residency matrix; hosted vs open-weight decision framework | `m4-comparison` |
| m5 | **Portability build (capstone)** | Ship the *same* small app on **≥2 providers** behind one interface; swap providers via config | `m5-portability` |

## 4. Content plan (per module)

Match CCA-F/GH-500 lesson depth; labs produce real artifacts (the "Prove" portfolio piece).

- **m1 OpenAI:** platform mental model; Responses API + function calling + structured outputs; Agents SDK
  loop (tools, handoffs, guardrails, tracing). Lab: a tool-using agent. *No exam — OpenAI has none.*
- **m2 Google Gemini/Vertex:** Gemini model family (Pro/Flash), Vertex AI Studio, Model Garden (incl.
  partner models — Claude/Llama/Mistral on Vertex), grounding + RAG APIs, Agent Builder. Lab: a grounded
  Gemini call on Vertex.
- **m3 Open-weight:** why open weights (control, residency, cost-at-scale, offline); Llama licensing
  reality; **Ollama** local run; **Hugging Face** Hub + Transformers + Inference. Lab: run an open model
  locally via Ollama and call it behind an OpenAI-compatible endpoint.
- **m4 Comparison:** the decision framework — **cost / capability / data-residency** trade-offs; *when to
  use hosted vs open-weight* (latency SLAs, compliance/residency, unit economics, fine-tune ownership,
  model-update risk); a filled provider comparison matrix as the artifact.
- **m5 Portability (capstone):** provider-portability patterns — an adapter/interface over ≥2 providers,
  config-driven model routing, prompt/tool parity, eval harness to catch behavioural drift on swap. Ship
  the same app on OpenAI **and** (Gemini/Vertex or an open-weight Ollama endpoint).

## 5. Research / source library (official only — Firecrawl seeds)

Per [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md); docs & official guides only, **no exam dumps**.
All live-checked 2026-07-01 (status noted where a fetch was blocked):

- **OpenAI platform docs** — `https://platform.openai.com/docs/` (API, models, function calling,
  structured outputs). *Verified reachable via search; direct fetch 403'd — Firecrawl with a browser UA.*
- **OpenAI Agents SDK** — `https://openai.github.io/openai-agents-python/` (**verified live**: agents,
  handoffs, guardrails, tracing, agent loop) + repo `https://github.com/openai/openai-agents-python`.
- **OpenAI Academy** — `https://academy.openai.com/` (**verified live**: courses, not an exam — context only).
- **Google Vertex AI gen-AI docs** — `https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview`
  (**verified live**, 301 from `cloud.google.com/...`; covers Gemini, Model Garden, Vertex AI Studio /
  Agent Builder, grounding/RAG, partner models incl. Claude/Llama/Mistral).
- **Open-weight setup** — **Ollama** `https://ollama.com/` + `https://github.com/ollama/ollama`;
  **Hugging Face** `https://huggingface.co/docs` (Hub, Transformers, Inference); Llama model cards on HF.
- **Gen-AI-Leader sub-track only** — cert page `https://cloud.google.com/learn/certification/generative-ai-leader`
  + **official exam guide PDF** `https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf`
  (**verified live** — see §7) + registration `https://cp.certmetrics.com/google/en/login`.

Deliverable: a drafted `resources[]` (id/title/url/kind/annotation/moduleIds) like
[copilot-gh300-source-library.md](../research/copilot-gh300-source-library.md).

## 6. Videos (NotebookLM plan)

~8–10 NotebookLM videos, authored from [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md); ships as
placeholders first (same as GH-500). Weight to m4/m5 (the judgement modules). Anchor piece is a
**Debate: "Hosted vs open-weight for enterprise"** — one host argues managed APIs (velocity, frontier
capability, no ops), the other argues open weights (data residency, cost-at-scale, control, no lock-in),
converging on a per-workload decision rule. Plus short explainers: OpenAI Agents SDK, Vertex grounding,
Ollama local serving, and the portability-adapter pattern.

## 7. Gen-AI-Leader sub-track — verified exam facts (live 2026-07-01)

Source of truth: the **official exam guide PDF** (fetched and read directly, 2026-07-01) + the cert page.
The offline "doesn't exist" claim is **refuted**.

- **Google Cloud Certified — Generative AI Leader.** Foundational, business-audience, **no prerequisites**.
- **$99 · 90 minutes · 50–60 multiple-choice questions · online- or onsite-proctored · valid 3 years.**
  Languages: English, Japanese, Spanish, Portuguese. Register via Google's CertMetrics.
- Passing score **not published** on the page/guide (Google norm) — leave `passingScore` unset / flagged;
  confirm on the cert page before launch.
- **Blueprint (verbatim section titles + official weights, from the PDF) — sums to 100%:**

  | d | Section (official title) | Weight | slug |
  |---|---|---|---|
  | d1 | Fundamentals of gen AI | 0.30 | `d1-fundamentals` |
  | d2 | Google Cloud's gen AI offerings | 0.35 | `d2-google-offerings` |
  | d3 | Techniques to improve gen AI model output | 0.20 | `d3-improve-output` |
  | d4 | Business strategies for a successful gen AI solution | 0.15 | `d4-business-strategy` |

  Sum = 1.00 ✓. `track.exam{}`: `questionCount 60, durationMinutes 90, proctored true, passingScore null (unverified)`.
  Note *(corrected by the 2026-07-02 re-verify)*: the guide carries **no "recently updated to reflect
  branding changes" statement** — current branding is simply present in the domain text, and
  **"Vertex AI"/"Agent Builder" appear nowhere** in the guide or cert page. Logistics
  ($99/90 min/50–60 Q/3-yr) live on the **cert page**; the PDF carries only the weighted blueprint.
  Teach current names (*Agent Platform / Gemini Enterprise Agent Platform*, *Agent Studio*).
  Passing score still unpublished → the Academy mock uses its own 70/100 training bar, labelled as such.

## 8. Acceptance

**Skills track (m1–m5) — a skills Ready gate, NOT a proctored/mock-exam gate.** The learner is "Ready"
when they can:
1. **Articulate the trade-offs** — produce the filled cost/capability/data-residency matrix (m4) and
   correctly justify hosted-vs-open-weight for ≥3 given workloads.
2. **Ship the portability build** — the m5 capstone runs the same app on **≥2 providers** behind one
   interface, provider selectable by config, with an eval that flags drift on swap.
3. Every module's lessons/labs render on all eight surfaces; `npm run validate` green (unique IDs,
   answerable knowledge checks); **every source official**.

**Gen-AI-Leader sub-track (if built) — standard A+ Ready gate.** Blueprint weights = 1.0, mock exam
reachable, A+ readiness gate reachable, facts current to the 2026 branding refresh — identical to the
GH-500/AIGP acceptance bar. Manifest: skills track `live` on ship; Gen-AI-Leader entry `coming-soon`
until its blueprint content is authored.

## 9. Out of scope

Authoring module/domain JSON, recording videos, and building the OpenAI *exam* track (stays parked —
[PRD-OPENAI-PARKED.md](./PRD-OPENAI-PARKED.md)). Cloud/ML-heavy credentials (Google PML Engineer, AWS/Azure
equivalents) are **S5**, not here. This pass produces the PRD + verified facts + research seeds only.

---

### Verification footer (per roadmap §5)

- **File:** `/Users/gkavanagh/Development/Automatos-AI-Platform/automatos-academy/docs/prds/PRD-S4-CROSS-VENDOR.md`
- **Is "Generative AI Leader" a real exam?** **YES — real, self-enrollable, proctored** (the offline
  "doesn't exist" claim is false). Verified live 2026-07-01 from the cert page
  `https://cloud.google.com/learn/certification/generative-ai-leader` and the official exam-guide PDF
  `https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf` (read directly):
  $99, 90 min, 50–60 MCQ, no prerequisites, 3-yr validity; four official domains 30/35/20/15 (=100%).
- **Verified live 2026-07-01:** Gen-AI-Leader cert page + exam-guide PDF; OpenAI Academy (courses, no exam);
  OpenAI Agents SDK docs; Google Vertex AI gen-AI overview (via 301 to `docs.cloud.google.com`).
- **Unverified / flagged:** Gen-AI-Leader **passing score** (not published — left unset). OpenAI
  `platform.openai.com/docs` and `openai.com/index/openai-certificate-courses/` returned **403** to our
  fetcher — the no-exam conclusion rests on `academy.openai.com` (live) + PRD-OPENAI-PARKED.md; re-fetch
  with a browser UA at authoring time. Vertex canonical URL is mid-rebrand (Vertex AI ↔ "Gemini Enterprise
  Agent Platform") — pin the exact doc path when building the source library.

# PRD — S2: AI Security track

**Status:** approved to author (skills-track shape) · **Owner:** Academy · **Last updated:** 2026-07-01
**Parent:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) · **Shape modelled on:** [PRD-S0-GH500.md](./PRD-S0-GH500.md) (adapted: **no mock exam** — see §2)
**Seeds from:** GH-500's secure-SDLC mindset → LLM-specific application security.

## 1. Why

GH-500 (S0) teaches secure SDLC for *code* — secret scanning, supply chain, CodeQL, remediation.
S2 continues that thread into the part GH-500 never covers: **the LLM itself is now attack surface.**
Prompt injection, poisoned training/RAG data, over-agentic tool use, model/plugin supply chain — none of
these are in a traditional AppSec cert. Demand is loud and 2026 is the inflection: **ISC2** folded AI
security across all nine certs (Apr 2026), **ISACA** shipped AAISM / SecAI+, **CompTIA** launched SecAI+
(Feb 2026), and **SANS/GIAC** are releasing four AI certs through 2026. This is the underserved,
high-signal track that pairs naturally with the platform's own agent/RAG stack.

## 2. Credential decision — **owner's call (recommendation first)**

**Recommendation: build S2 as a SKILLS TRACK (no mock exam / no readiness gate), not exam-anchored — for now.**
Then upgrade to exam-prep the moment a target cert publishes usable exam mechanics (see trigger below).

Why not anchor to an exam today — both realistic candidates were **verified live 2026-07-01** and both fail
the mock-exam engine's needs for different reasons:

| Candidate | Live status | Blocker for our MCQ mock-exam engine |
|---|---|---|
| **GIAC GAIPS** (AI Platform Security) — [giac.org/…/gaips](https://www.giac.org/certifications/ai-security-platform-security-gaips) | **Not GA until 2026-07-28.** 8 published domains **with descriptions** (good). But **CyberLive hands-on** (VM labs, not multiple-choice), and GIAC has **not published** question count, duration, passing %, or price. | No disclosed exam mechanics → can't seed `track.exam{}`; hands-on format ≠ our MCQ mock. |
| **Practical DevSecOps CAISP** — [practical-devsecops.com/…/caisp](https://www.practical-devsecops.com/certified-ai-security-professional/) | **Available now.** $1,099 (reg $1,199). Lifetime validity, 36 CPE. | Exam is **5 challenges in 6h + 24h report** (task-oriented lab, no MCQ) and the "domains" are **7 course chapters, not weighted exam objectives.** Nothing to normalize to weights. |

Neither gives the clean, weighted, proctored **MCQ blueprint** that made GH-500 and AIGP anchorable. The
honest move — consistent with §5 of the roadmap (we got burned asserting from memory) — is **not to fake a
blueprint.** A skills track fits the engine fine: lessons (Learn), labs (Build), quizzes/scenarios (Decide/
Prove) — just **no mock exam and no A+ readiness gate**, exactly the shape the roadmap reserves for S4.

**Reference frame while skills-track:** use **GAIPS's 8 published domains** as the de-facto industry
skeleton (they're descriptive and current) and **CAISP's chapter list** as a cross-check. This means an
upgrade to exam-prep is a *re-weighting*, not a rewrite.

**Upgrade trigger (owner-visible):** re-fetch the GAIPS page **after 2026-07-28**. If GIAC publishes
question count + duration + passing score, and if a proctored MCQ path exists, promote S2 to exam-anchored
by adding `track.exam{}` + a readiness gate and normalizing the 8 domains to weights. If GAIPS stays
hands-on-only, keep skills-track and re-evaluate CompTIA SecAI+ / ISACA SecAI+ MCQ blueprints instead.

*(Owner may override and target CAISP now as a paid hands-on capstone — but that's a lab credential, not a
mock-exam fit; flagging, not deciding.)*

## 3. Domain outline (skills track — mirrors GAIPS's 8 published domains)

Descriptions quoted/condensed from the **live GAIPS objectives** (2026-07-01). No weights (no exam);
ordering is teaching order. If/when exam-anchored, normalize to weights per the published ranges.

| d | Domain (GAIPS-aligned title) | Scope | slug |
|---|---|---|---|
| d1 | AI & LLM Foundations | GenAI capabilities, limits, **attack surface** map | `d1-llm-foundations` |
| d2 | LLM Application Threat Model (OWASP LLM Top 10) | the 10 risks end-to-end (§4) | `d2-owasp-llm-top10` |
| d3 | App Architecture & Dev Frameworks | GenAI arch best practice; supply-chain & integration-layer flaws | `d3-app-architecture` |
| d4 | Knowledge Augmentation & Retrieval (RAG) | retrieval arch; vector-DB / embedding risks; RAG poisoning | `d4-rag-security` |
| d5 | Agentic Systems & AI Integrations | inter-agent comms, context mgmt, protocol-level security, excessive agency | `d5-agentic-security` |
| d6 | Infrastructure, Deployment & the LLM Gateway | hosting risks + controls; **hardening an LLM gateway** (§4) | `d6-gateway-hardening` |
| d7 | Pipelines & MLOps/MLSecOps Security | training pipelines, model lifecycle, poisoning defenses | `d7-mlops-security` |
| d8 | AI Risk Mgmt, Threat Modeling & Red-Teaming | structured threat modeling (MITRE ATLAS), red-teaming, governance/NIST | `d8-risk-redteam` |

`track.exam{}`: **omitted** (skills track). `track.readiness`: **omitted** (no A+ gate). Add both on upgrade.

## 4. Content plan (per domain — CCA-F/GH-500 depth: 3–4 lessons, knowledge checks, 1–2 labs)

- **d1 Foundations:** how LLMs work at the level attackers exploit; the trust-boundary shift (prompt =
  data *and* control); the full LLM attack-surface map (input → context → model → tools → output).
- **d2 OWASP LLM Top 10 (2025) — the spine.** Verified live from [genai.owasp.org](https://genai.owasp.org/llm-top-10/):
  **LLM01 Prompt Injection** (direct *and* indirect), **LLM02 Sensitive Information Disclosure**,
  **LLM03 Supply Chain**, **LLM04 Data & Model Poisoning**, **LLM05 Improper Output Handling**,
  **LLM06 Excessive Agency**, **LLM07 System Prompt Leakage**, **LLM08 Vector & Embedding Weaknesses**,
  **LLM09 Misinformation**, **LLM10 Unbounded Consumption** (model theft / DoS / cost). One lesson-cluster
  per risk: mechanism → real example → mitigation. *(This is the "map OWASP LLM Top 10 from memory"
  deliverable — content authored from the official list above, not recalled.)*
- **d3 Architecture:** insecure output handling downstream (XSS/SSRF/RCE from LLM output), plugin/tool
  supply chain, model provenance & signing, prompt/template management.
- **d4 RAG:** embedding-store poisoning, false-RAG-entry injection (indirect injection via retrieved docs),
  cross-tenant retrieval leakage (tie to the platform's own KG/RAG ACL work), citation integrity.
- **d5 Agentic:** excessive agency → least-privilege tools, human-in-the-loop gates, inter-agent trust,
  tool-output validation, confused-deputy across MCP/tool protocols.
- **d6 Gateway hardening (flagship lab):** build/harden an LLM gateway — input/output filtering, injection
  detection, allow-listed tools, rate/cost limits (LLM10), secret isolation, egress control, structured
  output validation, logging/observability. One reference architecture, hardened step by step.
- **d7 MLOps/MLSecOps:** poisoning defenses at pipeline stages, dataset/lineage integrity, model registry
  security, eval gates in CI (bridges directly to GH-500's shift-left mindset).
- **d8 Threat modeling & red-teaming:** MITRE ATLAS tactics/techniques as the adversary language; STRIDE-
  for-LLM; red-team a chatbot (prompt-injection, jailbreak, exfiltration attempts); NIST AI 600-1 risk
  areas as the governance overlay (hands to S3 AIGP).

## 5. Research / source library (official only — Firecrawl seeds · **no exam dumps, no CAISP courseware**)

Per [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md). All verified reachable 2026-07-01.
- **OWASP Top 10 for LLM Applications (2025)** — `https://genai.owasp.org/llm-top-10/` (OWASP Gen AI
  Security Project) + per-risk pages. **Primary spine for d2.**
- **MITRE ATLAS** — `https://atlas.mitre.org/` (living matrix; Spring-2025 release added GenAI techniques:
  RAG Poisoning, False RAG Entry Injection, LLM Prompt Crafting) + fact sheet PDF. **Adversary language for d8.**
- **NIST AI RMF + Generative AI Profile (NIST AI 600-1)** — `https://www.nist.gov/itl/ai-risk-management-framework`
  and the profile at `https://doi.org/10.6028/NIST.AI.600-1` (12 risk areas, 200+ actions). **Governance overlay.**
- **GAIPS objectives page** — `https://www.giac.org/certifications/ai-security-platform-security-gaips`
  (the 8-domain skeleton; **re-fetch after 2026-07-28** for the upgrade trigger).
- *(Framework-only, fold as content — none are certs we prep for here.)*

Deliverable: a drafted `resources[]` (id/title/url/kind/annotation/domainIds), like
[copilot-gh300-source-library.md](../research/copilot-gh300-source-library.md), mapped to d1–d8.

## 6. Videos — NotebookLM plan

~8–10 videos, one anchor per domain + an overview, authored from [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md).
Ships as placeholders first (same as GH-300/GH-500). Format picks:
- **Debate format** for the tentpole: *"Is prompt injection actually solvable, or only mitigable?"* —
  the honest, unsettled state of the art; pairs perfectly with d2/d6.
- Second debate candidate: *"Is autonomous agency worth the excessive-agency risk?"* (d5).
- Deep-dive (single-narrator) for d6 gateway hardening and d8 ATLAS walkthrough; overview = the LLM
  attack-surface map.

## 7. Acceptance / Ready gate (skills-track adaptation)

`npm run validate` green (unique IDs, answerable quizzes, scenarios have a `best`) · renders on all eight
surfaces · **every source official** (OWASP / MITRE / NIST / GIAC; **no exam dumps, no CAISP courseware**) ·
d2 maps 1:1 to the **live OWASP LLM Top 10 (2025)** identifiers · d8 references **current MITRE ATLAS**
tactics.
**Skills-track specifics:** **no mock-exam block, no A+ readiness gate** (both omitted by design). Each
domain instead ends on a **lab/scenario** as its "prove" artifact (gateway-hardening lab is the capstone).
**Upgrade checklist (deferred, not now):** after 2026-07-28, if GAIPS (or CompTIA/ISACA MCQ) publishes
question count + duration + passing score → add `track.exam{}` + readiness gate + normalize d1–d8 to weights.

---

### Summary for the owner

- **File:** `/Users/gkavanagh/Development/Automatos-AI-Platform/automatos-academy/docs/prds/PRD-S2-AI-SECURITY.md`
- **Recommended credential:** **none as an exam anchor yet → ship as a SKILLS TRACK.** Frame on the
  **GIAC GAIPS** 8-domain skeleton ([giac.org/…/gaips](https://www.giac.org/certifications/ai-security-platform-security-gaips))
  + **OWASP LLM Top 10 2025** ([genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/)) +
  **MITRE ATLAS** + **NIST AI 600-1**. Upgrade to exam-prep when GAIPS goes GA (2026-07-28) and publishes
  exam mechanics; CAISP ($1,099, hands-on) is an optional paid capstone, not a mock-exam fit.
- **Could not verify live:** GAIPS **question count, duration, passing score, and price** (GIAC has not
  published them pre-GA — marked *not stated*); GAIPS domain **weights** (none published — skills track
  needs none). CAISP **passing score** not published. All corrected facts above were WebFetched from the
  official pages on 2026-07-01, not recalled.

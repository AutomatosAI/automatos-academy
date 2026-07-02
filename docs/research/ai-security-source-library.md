# AI Security (LLM & Agent Security) — research & source library

**For:** [PRD-S2-AI-SECURITY.md](../prds/PRD-S2-AI-SECURITY.md) · **Last updated:** 2026-07-02
**Method:** [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md) (official docs only) · **Guardrail:**
official primary sources only — **no third-party braindumps, no CAISP courseware, no exam items**
([AUTHORING.md](../AUTHORING.md)).

> **Skills track, no exam anchor — by design.** There is no mock exam and no A+ readiness gate. Framing is
> **defensive education**: you learn the attacks in order to build the controls. GAIPS is used only as a
> descriptive **8-domain skeleton**, never as an exam to prep.

## A. Credential status (verified 2026-07-02) — why there is no exam anchor yet

| Attribute | Value |
|---|---|
| Reference credential | **GIAC GAIPS** — AI Platform Security ([giac.org/…/gaips](https://www.giac.org/certifications/ai-security-platform-security-gaips)) |
| GA status | **Not yet GA.** General purchase **opens 2026-07-28** (currently **bundled with SANS SEC545 only**) |
| Exam mechanics | **NOT published** pre-GA — **question count, duration, and passing score are not stated by GIAC** |
| Format signal | GIAC lists a **hands-on / CyberLive** style (VM labs), **not** a clean weighted MCQ blueprint |
| Domains | **8 published domains with descriptions** — used here as the teaching skeleton (consolidated into 6 modules) |
| Cross-check | Practical DevSecOps **CAISP** (available now, $1,099) is a **task-lab** credential, not an MCQ fit — **not** prepped for, courseware **not** used |

> **Unverified — do NOT assert as fact:** GAIPS **question count, duration, passing score, or price** (GIAC
> publishes none pre-GA — marked *not stated* everywhere and never referenced as a claim in content) and any
> GAIPS **weights** (none published; a skills track needs none).

**Upgrade trigger (PRD-S2 §2, owner-visible):** re-fetch the GAIPS page **after 2026-07-28**. If GIAC
publishes question count + duration + passing score **and** a proctored MCQ path exists, promote this track
to exam-anchored — add `track.exam{}` + a readiness gate and normalize the 8 domains to weights. If GAIPS
stays hands-on-only, keep it skills-track and re-evaluate CompTIA SecAI+ / ISACA SecAI+ MCQ blueprints.
Because the modules are already built on the GAIPS skeleton, **the upgrade is a re-weighting, not a rewrite.**

**Source-of-truth URLs (live-checked 2026-07-02):**
- OWASP Top 10 for LLM Applications (2025): `https://genai.owasp.org/llm-top-10/` (+ per-risk pages)
- GIAC GAIPS objectives (skeleton reference): `https://www.giac.org/certifications/ai-security-platform-security-gaips`

## B. Framework backbone — the three primary sources

The track is grounded on three official frameworks; every module cites the specific page behind each claim.

### B.1 OWASP Top 10 for LLM Applications (2025) — the risk spine

Confirmed **current** 2026-07-02, all ten titles as written:

| Risk | Title (verbatim) | Taught in |
|---|---|---|
| **LLM01** | Prompt Injection (direct **and** indirect) | M2 |
| **LLM02** | Sensitive Information Disclosure | M4 (via disclosure/agency) |
| **LLM03** | Supply Chain | M3 |
| **LLM04** | Data & Model Poisoning | M3 |
| **LLM05** | Improper Output Handling | M2 |
| **LLM06** | Excessive Agency | M4 |
| **LLM07** | System Prompt Leakage | M2 |
| **LLM08** | Vector & Embedding Weaknesses | M3 |
| **LLM09** | Misinformation | M4/M5/M6 |
| **LLM10** | Unbounded Consumption (model theft / DoS / cost) | M4/M5 |

The **per-risk pages** (`genai.owasp.org/llmrisk/llmNN-…/`) are the source of truth for each definition and
mitigation set — the modules concretely source mitigations to these pages.

### B.2 MITRE ATLAS — the adversary map (verify against the data, not the site)

ATLAS is an **ATT&CK-style** knowledge base of real-world tactics/techniques against AI systems (the
ATLAS-is-modelled-on-ATT&CK relationship is confirmed in the official `atlas-navigator-data` README; ATLAS
has 14 tactics incl. Exfiltration/Impact). Technique IDs/names taught (all verified from the data):

| Technique | ID | Note |
|---|---|---|
| **LLM Prompt Injection** | `AML.T0051` | direct + indirect |
| **RAG Poisoning** | `AML.T0070` | canonical corpus-contamination entry |
| **Retrieval Content Crafting** | `AML.T0066` | canonical corpus-contamination entry |

> **CRITICAL — the site is not machine-fetchable.** `atlas.mitre.org` is a **JS-rendered SPA**: the
> homepage returns only a title and technique/matrix subpages **404** to WebFetch. All ATLAS facts were
> therefore verified from the **authoritative machine-readable** `dist/ATLAS.yaml` in the official
> **`mitre-atlas/atlas-data`** GitHub repo (the source the site renders from). The learner-facing resource
> still points to the **human-browsable** `atlas.mitre.org` matrix, which is correct — just **verify IDs
> against the data**, never from blogs.
>
> **PRD/roadmap drift — corrected in content.** "**False RAG Entry Injection**" is named in the roadmap and
> PRD as a Spring-2025 ATLAS GenAI technique but is **NOT** present in the canonical ATLAS data under that
> name (or as a "False RAG"/"Entry Injection" substring). The canonical entries are **RAG Poisoning
> (AML.T0070)** and **Retrieval Content Crafting (AML.T0066)** — taught as such, with M6 Lesson 2 flagging
> the discrepancy and a question (`q-m6-12`) teaching learners to verify IDs against the official data.
> ATLAS **mitigation** IDs (`AML.M####`) were **not** reachable (the mitigations section is truncated by the
> fetcher; the standalone data path 404'd) — so **no ATLAS mitigation ID is asserted anywhere**; concrete
> mitigations are sourced to the OWASP per-risk pages instead. Only fully-verified ATLAS **tactic** and
> **technique** names/IDs appear.

### B.3 NIST AI RMF + Generative AI Profile (NIST AI 600-1) — the governance overlay

- **NIST AI RMF 1.0** — the parent frame: **GOVERN / MAP / MEASURE / MANAGE** functions.
- **NIST AI 600-1** — the Generative AI Profile, **published July 2024**. Exact title:
  *"Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile."*
  **Twelve** GenAI risk areas (including the verbatim **"Harmful Bias and Homogenization"**); suggested
  actions are keyed by ID (**GV-/MP-/MS-/MG-**).

> **Verification & drift.** The DOI/HTML landing pages expose only the **abstract**, so the title, July-2024
> date, and the 12 risk-area names were verified by parsing the official **`nvlpubs.nist.gov` PDF** locally
> (`pdftotext`/`pypdf`; the `csrc.nist.gov/pubs` path 404'd). The PDF does **not** state an explicit
> **"200+ suggested actions"** headline count (that number is on the NIST landing page / PRD) — so the
> **action-ID structure** (GV-/MP-/MS-/MG-) is taught and learners are told to cite **specific action IDs**
> rather than any round total; no unverified count is asserted in content.

## C. Domain skeleton → 6 teaching modules

GAIPS's 8 published domains (descriptive, no weights) are consolidated into the 6 authored modules:

| GAIPS domain (skeleton) | Module |
|---|---|
| d1 AI & LLM Foundations · d2 LLM Application Threat Model | **M1 — The LLM threat model & the OWASP Top 10** |
| d2 (OWASP LLM01/05/07) | **M2 — Prompt injection & improper output handling** |
| d3 App Architecture · d4 RAG · d7 MLOps/MLSecOps | **M3 — Poisoning, supply chain & RAG security** |
| d5 Agentic Systems & AI Integrations | **M4 — Excessive agency & agentic-system security** |
| d6 Infrastructure, Deployment & the LLM Gateway | **M5 — The LLM gateway & red-teaming your own app** |
| d8 AI Risk Mgmt, Threat Modeling & Red-Teaming | **M6 — MITRE ATLAS & NIST (adversary map + governance)** |

Two capstone labs anchor the "prove" artifacts: the **gateway-hardening** lab and the
**red-team-your-own-app** lab (both in M5).

## D. Consolidated `resources[]` (as authored across the six modules)

Split across `track.json → officialResources[]` (the `off-*`) and each module's `resources[]` (the `r-*`).
`kind` uses the engine's label convention (`spec | reference | official-doc`). The OWASP top-10 hub, the
per-risk pages, MITRE ATLAS, NIST AI RMF, and NIST AI 600-1 recur across modules as the per-claim anchors.

### track.json → officialResources[]

```jsonc
[
  { "id": "off-owasp-llm-top10", "kind": "spec",
    "url": "https://genai.owasp.org/llm-top-10/",
    "annotation": "The risk backbone: the ten LLM-application risks (LLM01…LLM10) with definitions, examples, mitigations. Every module maps to these by name and number." },
  { "id": "off-owasp-llm01", "kind": "spec",
    "url": "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
    "annotation": "Entry to the per-risk pages (the source of truth for each definition/mitigation). M2→LLM01/05/07, M3→LLM03/04/08, M4→LLM06/08/10." },
  { "id": "off-mitre-atlas", "kind": "reference",
    "url": "https://atlas.mitre.org/",
    "annotation": "The adversary map (ATT&CK-style). Browse the matrix here; verify technique IDs against the machine-readable mitre-atlas/atlas-data repo — the site is a JS app the fetcher cannot render." },
  { "id": "off-nist-ai-rmf", "kind": "reference",
    "url": "https://www.nist.gov/itl/ai-risk-management-framework",
    "annotation": "The parent frame: GOVERN/MAP/MEASURE/MANAGE. Orientation and vocabulary, not a checklist to certify against." },
  { "id": "off-nist-ai-600-1", "kind": "reference",
    "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf",
    "annotation": "The GenAI governance overlay (July 2024): 12 risk areas (incl. 'Harmful Bias and Homogenization') + actions keyed GV-/MP-/MS-/MG-. Cite action IDs, not a round total." },
  { "id": "off-giac-gaips", "kind": "reference",
    "url": "https://www.giac.org/certifications/ai-security-platform-security-gaips",
    "annotation": "Skeleton reference only: the 8-domain scaffold this track consolidates. Not GA (opens 2026-07-28); exam mechanics unpublished — a descriptive map, not an exam to prep." }
]
```

### Per-module `resources[]` (the `r-*`, all official, all cited by real `sourceRefs`)

- **M1 — The LLM threat model & the OWASP Top 10:** `r-owasp-llm-top10`, `r-owasp-llm01`, `r-owasp-llm05`,
  `r-owasp-llm06`, `r-owasp-llm07`, `r-owasp-llm08`, `r-mitre-atlas`, `r-nist-ai-600-1`, `r-giac-gaips`
  (9 — the GAIPS resource here is annotated as the descriptive skeleton, not an exam anchor).
- **M2 — Prompt injection & improper output handling:** `r-owasp-llm01`, `r-owasp-llm05`, `r-owasp-llm07`,
  `r-owasp-llm-top10`, `r-mitre-atlas`, `r-nist-ai-600-1`, `r-automatos-about` (7).
- **M3 — Poisoning, supply chain & RAG security:** `r-owasp-llm03`, `r-owasp-llm04`, `r-owasp-llm08`,
  `r-owasp-llm-top10`, `r-mitre-atlas`, `r-nist-ai-600-1`, `r-gitbook-knowledge`, `r-gitbook-roles` (8).
- **M4 — Excessive agency & agentic-system security:** `r-owasp-llm-top10`, `r-owasp-llm06`, `r-owasp-llm02`,
  `r-owasp-llm07`, `r-owasp-llm09`, `r-owasp-llm10`, `r-atlas-home`, `r-atlas-matrix`, `r-nist-genai-profile`,
  `r-automatos-tools-assigning`, `r-automatos-tool-security`, `r-automatos-missions` (12 — no specific ATLAS
  sub-technique ID is asserted; the client-rendered technique subpages 404'd).
- **M5 — The LLM gateway & red-teaming your own app:** `r-owasp-llm-top10`, `r-owasp-llm01`, `r-owasp-llm10`,
  `r-owasp-llm06`, `r-owasp-llm05`, `r-owasp-llm07`, `r-owasp-llm02`, `r-mitre-atlas`, `r-nist-ai-rmf` (9 —
  one over the 5–8 soft band because the module teaches 6 named OWASP risks + ATLAS + NIST, each a real
  `sourceRef`; trimming would orphan a reference).
- **M6 — MITRE ATLAS & NIST:** `r-mitre-atlas`, `r-atlas-data`, `r-nist-airmf`, `r-nist-600-1`,
  `r-owasp-top10`, `r-owasp-llm01`, `r-owasp-llm04`, `r-owasp-llm06` (8 — includes `r-atlas-data` pointing at
  the machine-readable YAML that grounds every ATLAS ID).

## E. Notes for the authoring phase

- **Defensive framing is non-negotiable.** Attacks are taught to build controls; GAIPS is a skeleton, not
  an exam; the badge states "defensive skills, no vendor credential implied."
- **Verify ATLAS against the data.** `atlas.mitre.org` is a JS SPA — never assert a technique/mitigation ID
  from the site or a blog. Use `mitre-atlas/atlas-data` (`dist/ATLAS.yaml`). "False RAG Entry Injection" is
  **not** canonical — teach **RAG Poisoning (AML.T0070)** / **Retrieval Content Crafting (AML.T0066)** and
  flag the naming drift. Assert **no** `AML.M####` mitigation IDs (not reachable) — mitigations come from OWASP.
- **NIST: cite action IDs, not counts.** The "200+ actions" figure is not in the PDF; teach the GV-/MP-/MS-/MG-
  action-ID structure and the 12 risk areas (title/date verified from the `nvlpubs.nist.gov` PDF).
- **OWASP per-risk pages are the mitigation source of truth.** Map each module 1:1 to the live 2025 risk
  identifiers; the per-risk page (not the hub) grounds each definition and fix.
- **Validator note (track wiring).** The repo validator (`scripts/validate-content.mjs`) discovers a track
  only via its `track.json → domainFiles[]`. The six modules were authored before this `track.json` existed
  (each individually validated against the identical rule set — unique ids, answerable questions,
  `domainId==module id`, scenario `best`, resolvable `sourceRefs`, skills-track no-weight shape). With
  `cross/ai-security/track.json` now in place, `npm run validate` walks all six.
- **Re-point the tutor agent** ([ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md)) at this corpus for an
  AI-Security tutor (OWASP LLM Top 10 + ATLAS + NIST; skills-track pedagogy, no exam framing).

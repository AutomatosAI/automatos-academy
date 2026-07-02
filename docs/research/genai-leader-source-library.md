# Generative AI Leader (Google Cloud) — research & source library

**For:** [PRD-S4-CROSS-VENDOR.md](../prds/PRD-S4-CROSS-VENDOR.md) (§2 exception, §7 blueprint) · **Last updated:** 2026-07-02
**Method:** [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md) (official docs only) · **Guardrail:**
official primary sources only — **no third-party braindumps / real exam items** ([AUTHORING.md](../AUTHORING.md)).

> An offline agent once claimed this certification "doesn't exist." **That is false.** Generative AI
> Leader is a real, self-enrollable, proctored Google Cloud certification with a published exam guide —
> **live-verified 2026-07-02** against both official pages below.

## A. Exam facts (verified against live Google Cloud, 2026-07-02)

| Attribute | Value |
|---|---|
| Exam | **Generative AI Leader** (Google Cloud Certified) |
| Audience | **"Anyone in any job role, with or without hands-on technical experience"** — a business-leader credential |
| Prerequisites | **None** (stated on the cert page) |
| Duration | **90 minutes** (stated on the cert page) |
| Questions | **50–60 multiple-choice** (stated on the cert page) — Academy models **60** in `track.exam.questionCount` |
| Passing score | **NOT published** by Google (absent from the cert page **and** the exam guide PDF) — Academy uses its own **70/100** training bar, A+ at **80/100**; these are **not** Google's cut score |
| Registration fee | **$99** (plus tax where applicable) |
| Delivery | **Online-proctored or onsite-proctored** |
| Languages | English, Japanese, Spanish, Portuguese |
| Validity | **3 years** (renewal within the eligibility period) |
| Question format | Multiple choice; **no** scenario/case-study format is described on either official surface |

> **Unverified — do NOT assert as fact:** any **official passing score** (Google publishes none — the
> 70/100 on this track is the Academy's own bar) and any **scenario/case-study question structure** (the
> branching drills on this track are an Academy training device, not an official Gen-AI-Leader question type).

**Source-of-truth URLs (live-checked 2026-07-02):**
- Certification page: `https://cloud.google.com/learn/certification/generative-ai-leader`
- Official exam guide (PDF): `https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf`
- Registration (Google cert portal / CertMetrics): `https://cp.certmetrics.com/google/en/login`

## B. Blueprint — 4 sections (official weights → track weights, verbatim, un-normalized)

The exam guide PDF is a **5-page** document. Its four section titles and weights read **verbatim** below
(extracted with `pdftotext -layout` — WebFetch cannot parse the compressed PDF). The weights already sum to
**100%**, so no normalization is needed — the track weights are the official percentages as decimals.

| d | Section (verbatim official title) | Official weight | Weight | slug |
|---|---|---|---|---|
| d1 | Section 1: **Fundamentals of gen AI** (~30% of the exam) | ~30% | **0.30** | `d1-fundamentals` |
| d2 | Section 2: **Google Cloud's gen AI offerings** (~35% of the exam) | ~35% | **0.35** | `d2-google-offerings` |
| d3 | Section 3: **Techniques to improve gen AI model output** (~20% of the exam) | ~20% | **0.20** | `d3-improve-output` |
| d4 | Section 4: **Business strategies for a successful gen AI solution** (~15% of the exam) | ~15% | **0.15** | `d4-business-strategy` |

Sum = **1.00** ✓ (`npm run validate` enforces this on exam tracks). No weight was moved — these are the
guide's own percentages.

### Section contents (from the guide's task statements, as taught)

- **D1 Fundamentals** — what gen AI is; models vs traditional ML; capabilities *and* limits (fluency ≠
  correctness). **Scope note:** the guide places **hallucinations** and other foundation-model limitations
  formally in **Section 3 (3.1)**, not Section 1 — D1 teaches hallucination only as a "why fluent answers
  can be wrong" concept and sends learners to Section 3 for the fixes.
- **D2 Google Cloud's gen AI offerings** — Gemini, **Gemini Enterprise**, the **Customer Engagement Suite**
  (Conversational Agents / Agent Assist / Conversational Insights / CCaaS), **Agent Platform**, **Agent
  Studio**, **Model Garden**, **NotebookLM**. The heaviest domain (~35%).
- **D3 Techniques to improve output** — prompting (the guide names **zero-shot / one-shot / few-shot**,
  **role prompting**, **prompt chaining**, **chain-of-thought**, **ReAct** in §3.2), model parameters,
  **grounding**, **RAG**, **tuning**, and **evaluation**; responsible-AI as a quality lever.
- **D4 Business strategies** — value framing, **KPIs/ROI**, risk & responsible AI (**SAIF**, **Model
  Armor**, **Security Command Center**, Google's **AI Principles**), and choosing where gen AI fits.

## C. Currency trap — current branding (confirmed 2026-07-02)

The exam guide PDF uses **current** product names throughout — **Gemini / Gemini Enterprise / Agent
Platform / Agent Studio / Model Garden** — and contains **zero** occurrences of **"Vertex AI"** or
**"Agent Builder"** and **zero** occurrences of "recently updated" / "branding" / "rebrand" / "renamed".

> **PRD-S4 §7 drift — corrected in content.** The "**recently updated to reflect branding changes**"
> statement lives on the **certification page**, **not** inside the exam-guide PDF. The PDF simply *uses*
> the current names. Teach the current names as primary; treat **"Vertex AI"** and **"Agent Builder"** as
> **dated distractors** the exam is likely to test against. Note the gen-AI **docs** are mid-rebrand too —
> the overview page now surfaces as "Gemini Enterprise Agent Platform," and some doc side-navs still show
> legacy "Vertex AI" labels — so anchor product claims on the guide's names, and flag doc-nav drift where
> it appears.

## D. Consolidated `resources[]` (as authored across the track)

Split across `track.json → officialResources[]` (the `off-gal-*`) and each domain's `resources[]` (the
`r-*`). `kind` uses the engine's label convention (`official-doc | spec | learning-path | reference`).
The exam guide is registered once at track level (`off-gal-exam-guide`) and appears in every domain file
as the per-section task-statement anchor (`r-exam-guide`).

### track.json → officialResources[]

```jsonc
[
  { "id": "off-gal-cert", "kind": "official-doc",
    "url": "https://cloud.google.com/learn/certification/generative-ai-leader",
    "annotation": "Exam overview: 90 min, 50-60 MCQ, $99, online/onsite-proctored, no prerequisites, 3-year validity, business-leader audience; states NO passing score; carries the 'branding changes' note (the guide does not)." },
  { "id": "off-gal-exam-guide", "kind": "spec",
    "url": "https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf",
    "annotation": "The authoritative blueprint: four sections and verbatim weights — D1 ~30% / D2 ~35% / D3 ~20% / D4 ~15%; current product names only (no 'Vertex AI'/'Agent Builder')." },
  { "id": "off-gal-registration", "kind": "official-doc",
    "url": "https://cp.certmetrics.com/google/en/login",
    "annotation": "Google's certification portal (CertMetrics/Kryterion) — where you schedule and sit the exam." },
  { "id": "off-gal-vertex-genai-docs", "kind": "official-doc",
    "url": "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview",
    "annotation": "Gen-AI docs root: Gemini models, model selection, Model Garden, grounding/RAG. Mid-rebrand ('Gemini Enterprise Agent Platform')." },
  { "id": "off-gal-ml-crash-course", "kind": "learning-path",
    "url": "https://developers.google.com/machine-learning/crash-course",
    "annotation": "Clean official grounding for D1's ML/AI definitions where the marketing 'what-is' pages 404'd/truncated." }
]
```

### D1 — Fundamentals of gen AI (weight 0.30)

- `r-exam-guide` — Generative AI Leader exam guide (§1) — the D1 task statements.
- `r-what-is-ml` / `r-supervised-ml` — Google ML Crash Course — supervised learning, models, training
  (the marketing `cloud.google.com/discover/what-is-a-foundation-model` + `/use-cases/foundation-models`
  URLs **404'd**; `learn/what-is-machine-learning` and `/what-is-artificial-intelligence` truncated — **not
  cited**; definitions grounded on the Crash Course + the Vertex overview, which rendered cleanly).
- `r-vertex-overview` — Vertex generative-AI overview — the platform framing.
- `r-model-selection` — Google model-selection docs — capability/limit framing.
- `r-gemini` / `r-gemma` / `r-imagen` / `r-veo` — the model families named in the guide.

### D2 — Google Cloud's gen AI offerings (weight 0.35)

- `r-exam-guide` — exam guide (§2, quoted verbatim 2.1–2.5).
- `r-agentplatform-overview` — Agent Platform overview.
- `r-model-garden` — Model Garden.
- `r-grounding` — grounding / RAG.
- `r-notebooklm` — NotebookLM (Enterprise).
- `r-ai-studio` — AI/Agent Studio.
- `r-gemini-cloud` — Gemini on Google Cloud.
- `r-cert-page` — cert page (for the "current names" framing).

> Several Google **marketing** SPA pages (`/gemini-enterprise`, `/products/agent-builder`,
> `/conversational-agents`, `/notebooklm`) returned truncated/JS-only content or 404 — **not relied on**.
> Every D2 claim is grounded in the guide's own Section 2 wording + the cert page + the NotebookLM
> Enterprise and Agent Platform **docs** pages. The agent internals (ADK / Agent Engine / Agent Garden /
> A2A) are **out of scope** — the guide names only "Agent Platform … to build custom agents" and "Agent
> Studio," so they are not taught.

### D3 — Techniques to improve gen AI model output (weight 0.20)

- `r-exam-guide` — exam guide (§3, incl. the verbatim technique list in 3.2).
- `r-prompt-intro` — introduction to prompting.
- `r-parameters` — model parameters.
- `r-grounding` / `r-rag` — grounding + RAG.
- `r-tuning` — model tuning.
- `r-evaluation` — evaluation.
- `r-responsible-ai` — responsible AI as a quality lever.

> The named techniques (**one-shot, role prompting, prompt chaining, chain-of-thought, ReAct**) are
> **verbatim in the guide's §3.2** but Google Cloud's docs do **not** serve a dedicated leaf definition
> page for each (the prompt-strategies pages are JS shells; only `introduction-prompt-design` and
> `few-shot-examples` expose body text). Taught from the guide's wording + the introduction-to-prompting
> page — **no fabricated product-specific definitions**.

### D4 — Business strategies for a successful gen AI solution (weight 0.15)

- `r-exam-guide` — exam guide (§4 task statements + section titles + weights, from the pypdf extraction).
- `r-kpi-framework` — Google Cloud KPI/ROI editorial (tagged `reference`, it is editorial, not product docs).
- `r-saif` — Secure AI Framework (SAIF).
- `r-scc` — Security Command Center.
- `r-model-armor` — Model Armor.
- `r-ai-principles` — Google's AI Principles.
- `r-model-selection` — foundation-model doc (mid-rebrand: body uses current names, side-nav still shows
  some legacy "Vertex AI" labels — **flagged in the annotation**; current names taught).
- `r-cert-page` — cert page.

## E. Notes for the authoring phase

- **No passing score to seed.** Google publishes none — `track.exam.passingScore` is the Academy's
  **70/100** bar and `aPlusScore` is **80/100**; the blueprintNote states this explicitly so nobody reads
  it as Google's cut score. `scoreScale` is **100** (percentage), so `aPlusScore` must sit in
  `(passingScore, scoreScale]` — the validator's A+ range check enforces `70 < 80 ≤ 100`.
- **Question count is modeled.** The cert page says **50–60 MCQ**; the Academy models **60** — this is
  inside the stated range (unlike GH-500, where the count was unstated). Still, re-check on any guide refresh.
- **Weights need no correction.** The four section percentages sum to 100% and are used as-is (0.30 / 0.35 /
  0.20 / 0.15) — a re-weight would only ever be a content edit if Google reweights the guide.
- **Teach current names, test the old ones.** Gemini / Gemini Enterprise / Agent Platform / Agent Studio /
  Model Garden are primary; **"Vertex AI"** and **"Agent Builder"** are the distractors. The "branding
  changes" note is a **cert-page** artifact, not in the guide.
- **Scenario drills are an Academy device.** Neither official surface describes a scenario/case-study
  format — the four branching scenarios (one per domain) are training scaffolding, presented all four
  (`scenariosPresented 4` of a pool of `4`).
- **Re-point the tutor agent** ([ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md)) at this corpus for a
  Gen-AI-Leader tutor (swap the exam name, four sections, and 30/35/20/15 weights; keep the pedagogy).

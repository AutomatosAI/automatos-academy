# IAPP AI Governance Professional (AIGP) — research & source library

**For:** [PRD-S3-AIGP.md](../prds/PRD-S3-AIGP.md) · **Last updated:** 2026-07-02
**Method:** [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md) (official primary sources only) · **Guardrail:**
the IAPP BoK PDF is copyright — **linked, never rehosted**; no third-party braindumps / real exam items
([AUTHORING.md](../AUTHORING.md)).

## A. Exam facts (verified against live IAPP pages, 2026-07-02)

| Attribute | Value |
|---|---|
| Exam | **AIGP — Artificial Intelligence Governance Professional** (issued by the IAPP) |
| Questions | **100** (stated on the certification FAQ) |
| Duration | **2.75 hours = 165 minutes** (+ a 15-minute break; stated on the FAQ / store) |
| Scoring | **Scaled score on a 100–500 range**; **300 to pass** — IAPP explicitly notes *"the passing score … is 300 (which does not represent 60%)"* |
| Delivery | Proctored via **Pearson VUE** (test center) or **OnVUE** (online); closed-book |
| Price | **799 USD** non-member / **649 USD** member (plus CMF / membership bundle options) |
| Certification term | **Two years**, *"beginning the day after you pass your exam"* — **store page only** (see note) |
| Exam-purchase validity | Exam **"must be completed within one year of purchase"** (distinct from the 2-yr cert term) |
| Body of Knowledge | **v2.1** — effective **2 February 2026**, approved 9 September 2025, *"Supersedes: 2.0.1"* (linked off the cert page) |

> **Term-length nuance:** the two-year certification term is stated **only on the exam store page**
> (`store.iapp.org/aigp-exam`), **not** on the certification FAQ — the FAQ references a generic
> "certification term" with no duration. Cite the **store page** for the two-year figure.

> **EU AI Act timeline is in flux — do NOT assert a specific phase-in date as settled.** A "Digital
> Omnibus" simplification package may revise the high-risk application dates, and the official
> `artificialintelligenceact.eu/implementation-timeline` (older) and European Commission pages
> currently **disagree**. Ground EU AI Act content on the stable elements (four-tier risk structure,
> Article 3 definitions, the Art 9–15 high-risk obligations) and **re-verify the live timeline /
> legislative status** before teaching any date.

**Source-of-truth URLs (live-checked 2026-07-02):**
- Certification page: `https://iapp.org/certify/aigp`
- Certification FAQs (exam format & scaled scoring): `https://iapp.org/certify/faqs`
- Exam store (price, term, validity): `https://store.iapp.org/aigp-exam/`
- BoK & Exam Blueprint PDF (**link only, never rehosted**): `https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf` (v2.0.1, superseded — the cert page now links the v2.1 contentstack PDF)

## B. Blueprint — 4 domains (BoK question ranges → normalized PEDAGOGY weights)

The AIGP Body of Knowledge does **not** publish domain percentages. It publishes a **min/max number of
scored questions per domain**. The weights below are **normalized from the midpoints** of those
published ranges — they are an **Academy pedagogy device, NOT IAPP-published percentages.** The engine
reads weights from data (`npm run validate` enforces the sum = 1.000), so a correction is a content edit.

| d | Domain (verbatim BoK title) | BoK question range | Midpoint | Weight | slug |
|---|---|---|---|---|---|
| d1 | Understanding the foundations of AI governance | 16–20 | 18 | **0.21** | `d1-foundations` |
| d2 | Understanding how laws, standards and frameworks apply to AI | 19–23 | 21 | **0.25** | `d2-laws-standards` |
| d3 | Understanding how to govern AI development | 21–25 | 23 | **0.27** | `d3-govern-development` |
| d4 | Understanding how to govern AI deployment and use | 21–25 | 23 | **0.27** | `d4-govern-deployment` |

Midpoints **18 / 21 / 23 / 23 = 85**; each weight = midpoint ÷ 85 → **0.21 / 0.25 / 0.27 / 0.27**.
Sum = **1.00** ✓. **Scoring** is modeled on the real IAPP scheme: scaled **100–500**, **300** to pass
(`scoreFloor 100`), with the Academy's A+ margin bar at **`aPlusScore 340`** (pass 300 + 10% of the
400-point span). The engine + validator support these fields (validator checks `aPlusScore` sits between
`passingScore` and `scoreScale`).

> **Scenario drills are an Academy training device.** The AIGP is a knowledge exam; IAPP does not
> describe a scenario/case-study question format. Each domain authors 2 branching scenarios
> (`scenarioPool = 8`, `scenariosPresented = 4`) purely as a teaching aid — not represented as an
> official AIGP question type.

## C. BoK version drift (found live 2026-07-02) — vs PRD-S3-AIGP.md §2–3

1. **BoK version is outdated in the PRD.** PRD cites **v2.0.1 / effective 3 Feb 2025**. The cert page now
   links **v2.1 / effective 2 Feb 2026 / approved 9 Sep 2025 / "Supersedes: 2.0.1"** (contentstack PDF,
   footer on every page; metadata title `2025_Cert_CoverUpdates_BOK_FINAL_24nov2025`). **The four domain
   titles are verbatim-identical and all four question ranges are identical between v2.0.1 and v2.1**
   (D1 16–20, D2 19–23, D3 21–25, D4 21–25) → **weights unchanged.** *Action:* bump the PRD's cited BoK
   version/date/PDF-link and the Acceptance gate (§7) that pins "match BoK v2.0.1". Content-level refresh
   worth folding into D2: v2.1 adds new-law examples (e.g. South Korean AI Basic Law) and D1/III/IV bodies
   now use "AI system" language — but titles/ranges/weights are unaffected.
2. **Term length is now verifiable.** PRD says the term is "not stated on the FAQ → unverified." The
   **store page** now states the **two-year** term. *Action:* update the PRD to assert the two-year term
   citing the **store page** (not the FAQ), and capture the "one year of purchase" exam validity.

**No other drift:** exam format (100 Q / 2.75h = 165 min / scaled 300 on 100–500 / Pearson VUE + OnVUE)
confirmed on the live FAQ; price (799 / 649, + CMF / membership) confirmed on the live store; domain
titles verbatim-correct; midpoint weights recompute exactly.

## D. Consolidated `resources[]` (as authored across the four domain files)

Split across `track.json → officialResources[]` (the `off-*` cross-domain anchors) and each domain's
`resources[]` (the per-domain `r-*`). `kind` uses the engine's label convention
(`official-doc | spec | learning-path | learning-module`). The EU AI Act (`eur-lex.europa.eu/eli/reg/2024/1689/oj`),
NIST AI RMF, ISO 42001/22989 and the OECD Principles recur across domains; they are registered once at
track level and cited per-domain where a question hangs on them.

### track.json → officialResources[]

```jsonc
[
  { "id": "off-aigp-cert",  "kind": "official-doc", "url": "https://iapp.org/certify/aigp",
    "annotation": "The credential's home page: what the AIGP certifies, the BoK/blueprint link, study guide, how-to-prepare, buy-the-exam. Stable anchor to re-verify the current BoK version (as of 2026-07-02 it links v2.1)." },
  { "id": "off-aigp-bok",   "kind": "spec", "url": "https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf",
    "annotation": "The blueprint: four domains, sub-domain outlines, and per-domain min/max question ranges (D1 16–20, D2 19–23, D3 21–25, D4 21–25) the pedagogy weights normalize from. LINK ONLY — IAPP copyright, never rehosted. v2.0.1 is superseded by v2.1 (identical titles/ranges)." },
  { "id": "off-aigp-faq",   "kind": "official-doc", "url": "https://iapp.org/certify/faqs",
    "annotation": "Where IAPP states the exam facts: 100 Q / 2.75h, scaled 100–500, 300 to pass ('does not represent 60%'), Pearson VUE / OnVUE. Does NOT state the certification term length." },
  { "id": "off-aigp-store", "kind": "official-doc", "url": "https://store.iapp.org/aigp-exam/",
    "annotation": "Exam purchase page: price (799/649 + CMF/membership), the two-year certification term ('beginning the day after you pass'), and the 'must be completed within one year of purchase' exam validity." },
  { "id": "off-eu-ai-act-oj", "kind": "spec", "url": "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    "annotation": "Canonical legal source for every EU AI Act claim (risk tiers; Art 3 definitions; Arts 9–15 high-risk; Art 50 transparency; Arts 51/53/55 GPAI; Arts 72/73 post-market/incidents). ELI page renders empty to a headless fetch — read article text via the artificialintelligenceact.eu mirror, cite this OJ URL as source of truth." },
  { "id": "off-eu-ai-act-timeline", "kind": "official-doc", "url": "https://artificialintelligenceact.eu/implementation-timeline/",
    "annotation": "Phase-in dates (prohibitions, GPAI, high-risk, full applicability), maintained by the Future of Life Institute. Timeline is in flux (Digital Omnibus) — re-verify live before asserting any date." },
  { "id": "off-nist-ai-rmf", "kind": "spec", "url": "https://www.nist.gov/itl/ai-risk-management-framework",
    "annotation": "AI RMF 1.0 (Jan 2023): the four core functions (Govern/Map/Measure/Manage), trustworthiness characteristics, companion Playbook, GenAI Profile. The primary non-EU governance framework the AIGP tests." },
  { "id": "off-iso-42001", "kind": "spec", "url": "https://www.iso.org/standard/81230.html",
    "annotation": "ISO/IEC 42001 (2023) — the certifiable AI management-system (AIMS) standard; the organisational wrapper for accountability/monitoring/supplier controls. Named in BoK Domain II.D. iso.org returns HTTP 403 to fetchers — confirm title/scope/edition via the catalogue entry; don't quote clause-level text." },
  { "id": "off-iso-22989", "kind": "spec", "url": "https://www.iso.org/standard/74296.html",
    "annotation": "ISO/IEC 22989 (2022) — AI concepts and terminology; the shared vocabulary the other AI standards build on. Named alongside 42001 in BoK Domain II.D. iso.org returns HTTP 403 — confirm via the catalogue entry." },
  { "id": "off-oecd-ai-principles", "kind": "spec", "url": "https://oecd.ai/en/ai-principles",
    "annotation": "The first intergovernmental AI standard (2019, updated May 2024): five values-based principles + five policy recommendations, and the OECD AI-system definition the EU/CoE/US/UN adopted." }
]
```

### D1 — Understanding the foundations of AI governance (weight 0.21)

- `r-iapp-bok` — IAPP AIGP Body of Knowledge & Exam Blueprint — `https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf` — the Domain I outline (title/range 16–20 confirmed stable across v2.0.1↔v2.1). Link only, copyright.
- `r-oecd-principles` — OECD AI Principles — `https://oecd.ai/en/ai-principles` — values-based principles + the OECD AI-system definition; the shared international baseline.
- `r-nist-rmf` — NIST AI Risk Management Framework (AI RMF 1.0) — `https://www.nist.gov/itl/ai-risk-management-framework` — voluntary US framework; four core functions + trustworthiness lens.
- `r-nist-rmf-characteristics` — NIST AI RMF — Characteristics of Trustworthy AI (AIRC KB) — `https://airc.nist.gov/AI_RMF_Knowledge_Base/AI_RMF/Foundational_Information/3-sec-characteristics` — the seven trustworthiness characteristics (valid & reliable, safe, secure & resilient, accountable & transparent, explainable & interpretable, privacy-enhanced, fair with harmful bias managed).
- `r-eu-ai-act-article-3` — EU AI Act — Article 3 (Definitions) — `https://artificialintelligenceact.eu/article/3/` — provider / deployer / GPAI and the "AI system" definition (stable regardless of timeline).
- `r-eu-ai-act-summary` — EU AI Act — high-level summary — `https://artificialintelligenceact.eu/high-level-summary/` — the four-tier risk structure and obligation split at a glance.
- `r-eu-commission-framework` — European Commission — Regulatory framework for AI — `https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai` — the Commission's own framing; flagged as one side of the live timeline disagreement.
- `r-iso-42001` — ISO/IEC 42001 — AI management system (AIMS) — `https://www.iso.org/standard/81230.html` — named-only at foundation level (iso.org 403 — verify via catalogue).
- `r-iso-22989` — ISO/IEC 22989 — AI concepts and terminology — `https://www.iso.org/standard/74296.html` — named-only at foundation level (iso.org 403 — verify via catalogue).

### D2 — Understanding how laws, standards and frameworks apply to AI (weight 0.25)

- `r-aigp-bok` — IAPP AIGP Body of Knowledge & Exam Blueprint — `https://iapp.org/certify/aigp/` — Domain II task statements (cert-page anchor records the v2.1 supersession).
- `r-eu-ai-act-oj` — Regulation (EU) 2024/1689 — OJ (EUR-Lex) — `https://eur-lex.europa.eu/eli/reg/2024/1689/oj` — the canonical legal text (source of truth; article text read via the mirror).
- `r-eu-ai-act-art3` — EU AI Act — Article 3 (Definitions) — `https://artificialintelligenceact.eu/article/3/`.
- `r-eu-ai-act-art5` — EU AI Act — Article 5 (Prohibited AI practices) — `https://artificialintelligenceact.eu/article/5/`.
- `r-eu-ai-act-art6` — EU AI Act — Article 6 (Classification of high-risk AI) + Annex III — `https://artificialintelligenceact.eu/article/6/`.
- `r-eu-ai-act-art10` — EU AI Act — Article 10 (Data and data governance) — `https://artificialintelligenceact.eu/article/10/`.
- `r-eu-ai-act-art12` — EU AI Act — Article 12 (Record-keeping / logging) — `https://artificialintelligenceact.eu/article/12/`.
- `r-eu-ai-act-art14` — EU AI Act — Article 14 (Human oversight) — `https://artificialintelligenceact.eu/article/14/`.
- `r-eu-ai-act-art50` — EU AI Act — Article 50 (Transparency obligations) — `https://artificialintelligenceact.eu/article/50/`.
- `r-eu-ai-act-art51` — EU AI Act — Article 51 (Classification of GPAI with systemic risk) — `https://artificialintelligenceact.eu/article/51/`.
- `r-eu-ai-act-art53` — EU AI Act — Article 53 (Obligations for providers of GPAI models) — `https://artificialintelligenceact.eu/article/53/`.
- `r-eu-ai-act-art55` — EU AI Act — Article 55 (Obligations for GPAI models with systemic risk) — `https://artificialintelligenceact.eu/article/55/`.
- `r-eu-ai-act-timeline` — EU AI Act implementation timeline — `https://artificialintelligenceact.eu/implementation-timeline/` — in flux; re-verify before asserting dates.
- `r-nist-ai-rmf` — NIST AI RMF (AI RMF 1.0) — `https://www.nist.gov/itl/ai-risk-management-framework`.
- `r-nist-ai-rmf-core` — NIST AI RMF — Core (the four functions) — `https://airc.nist.gov/airmf-resources/airmf/` — Govern / Map / Measure / Manage, verified verbatim on AIRC.
- `r-iso-42001` — ISO/IEC 42001 — AIMS — `https://www.iso.org/standard/81230.html` — grounded on the BoK's own naming (iso.org 403).
- `r-iso-22989` — ISO/IEC 22989 — AI concepts and terminology — `https://www.iso.org/standard/74296.html` — grounded on the BoK's own naming (iso.org 403).
- `r-oecd-principles` — OECD AI Principles — `https://oecd.ai/en/ai-principles`.

### D3 — Understanding how to govern AI development (weight 0.27)

- `r-bok` — IAPP AIGP BoK & Exam Blueprint (Domain III) — `https://iapp.org/certify/aigp/` — III.A/III.B/III.C outline; cert-page anchor (v2.1 supersession recorded).
- `r-euaiact` — EU AI Act — Regulation (EU) 2024/1689 — `https://eur-lex.europa.eu/eli/reg/2024/1689/oj` — canonical text.
- `r-euaiact-art6` — EU AI Act Article 6 — Classification rules for high-risk AI — `https://artificialintelligenceact.eu/article/6/`.
- `r-euaiact-art9` — EU AI Act Article 9 — Risk management system — `https://artificialintelligenceact.eu/article/9/`.
- `r-euaiact-art10` — EU AI Act Article 10 — Data and data governance — `https://artificialintelligenceact.eu/article/10/`.
- `r-euaiact-art11` — EU AI Act Article 11 — Technical documentation (Annex IV) — `https://artificialintelligenceact.eu/article/11/`.
- `r-euaiact-art12` — EU AI Act Article 12 — Record-keeping (logging) — `https://artificialintelligenceact.eu/article/12/`.
- `r-euaiact-art13` — EU AI Act Article 13 — Transparency & information to deployers — `https://artificialintelligenceact.eu/article/13/`.
- `r-euaiact-art14` — EU AI Act Article 14 — Human oversight — `https://artificialintelligenceact.eu/article/14/`.
- `r-euaiact-art15` — EU AI Act Article 15 — Accuracy, robustness and cybersecurity — `https://artificialintelligenceact.eu/article/15/`.
- `r-euaiact-art17` — EU AI Act Article 17 — Quality management system — `https://artificialintelligenceact.eu/article/17/`.
- `r-euaiact-art43` — EU AI Act Article 43 — Conformity assessment — `https://artificialintelligenceact.eu/article/43/`.
- `r-euaiact-art53` — EU AI Act Article 53 — Obligations for providers of GPAI models — `https://artificialintelligenceact.eu/article/53/`.
- `r-euaiact-art55` — EU AI Act Article 55 — Obligations for GPAI models with systemic risk — `https://artificialintelligenceact.eu/article/55/`.
- `r-nist-rmf` — NIST AI RMF (AI RMF 1.0) + Playbook — `https://www.nist.gov/itl/ai-risk-management-framework` — Map/Measure map onto the development-side controls.
- `r-iso42001` — ISO/IEC 42001:2023 — AIMS — `https://www.iso.org/standard/81230.html` — the management-system wrapper (iso.org 403; titles/edition via official search snippets, not full-text).
- `r-iso22989` — ISO/IEC 22989:2022 — AI concepts and terminology — `https://www.iso.org/standard/74296.html` — (iso.org 403; as above).
- `r-oecd` — OECD AI Principles — `https://oecd.ai/en/ai-principles`.
- `r-euaiact-timeline` — EU AI Act implementation timeline — `https://artificialintelligenceact.eu/implementation-timeline/`.

### D4 — Understanding how to govern AI deployment and use (weight 0.27)

- `r-aigp-bok` — IAPP AIGP BoK & Exam Blueprint (Domain IV) — `https://iapp.org/certify/aigp/` — IV.A–IV.C outline; cert-page anchor (v2.1 supersession recorded).
- `r-euaiact-text` — EU AI Act — Regulation (EU) 2024/1689 (OJ, EUR-Lex) — `https://eur-lex.europa.eu/eli/reg/2024/1689/oj` — canonical text.
- `r-euaiact-art3` — EU AI Act — Article 3 (Definitions) — `https://artificialintelligenceact.eu/article/3/`.
- `r-euaiact-art4` — EU AI Act — Article 4 (AI literacy) — `https://artificialintelligenceact.eu/article/4/`.
- `r-euaiact-art6` — EU AI Act — Article 6 (Classification of high-risk AI) — `https://artificialintelligenceact.eu/article/6/`.
- `r-euaiact-annex3` — EU AI Act — Annex III (High-risk AI systems) — `https://artificialintelligenceact.eu/annex/3/`.
- `r-euaiact-art25` — EU AI Act — Article 25 (Responsibilities along the AI value chain) — `https://artificialintelligenceact.eu/article/25/`.
- `r-euaiact-art26` — EU AI Act — Article 26 (Obligations of deployers of high-risk AI) — `https://artificialintelligenceact.eu/article/26/`.
- `r-euaiact-art27` — EU AI Act — Article 27 (Fundamental rights impact assessment) — `https://artificialintelligenceact.eu/article/27/`.
- `r-euaiact-art50` — EU AI Act — Article 50 (Transparency obligations) — `https://artificialintelligenceact.eu/article/50/`.
- `r-euaiact-art53` — EU AI Act — Article 53 (Obligations for providers of GPAI models) — `https://artificialintelligenceact.eu/article/53/`.
- `r-euaiact-art72` — EU AI Act — Article 72 (Post-market monitoring by providers) — `https://artificialintelligenceact.eu/article/72/`.
- `r-euaiact-art73` — EU AI Act — Article 73 (Reporting of serious incidents) — `https://artificialintelligenceact.eu/article/73/`.
- `r-euaiact-timeline` — EU AI Act — implementation timeline — `https://artificialintelligenceact.eu/implementation-timeline/`.
- `r-nist-rmf-core` — NIST AI RMF — Core (Govern/Map/Measure/Manage) — `https://www.nist.gov/itl/ai-risk-management-framework` — Manage/Govern map onto post-deployment monitoring & accountability.
- `r-iso-42001` — ISO/IEC 42001 — AIMS — `https://www.iso.org/standard/81230.html` — treated only at the organisational-wrapper level the other sources support (iso.org 403; no verbatim scope quoted).
- `r-oecd-principles` — OECD AI Principles — `https://oecd.ai/en/ai-principles`.

## E. Notes for the authoring / refresh phase

- **Weights are pedagogy, not published percentages.** The AIGP BoK publishes **question-count ranges**,
  not percentages. This track normalizes the **midpoints** (18/21/23/23 = 85 → 0.21/0.25/0.27/0.27). If
  IAPP ever publishes real percentages, re-derive and edit the domain `weight` fields; `npm run validate`
  enforces the sum = 1.000.
- **Scoring is scale-aware.** IAPP scales **100–500** with **300 to pass** (explicitly *not* 60%). The
  track sets `scoreFloor 100`, `passingScore 300`, `scoreScale 500`, and the Academy A+ bar
  `aPlusScore 340` (pass + 10% of the 400-pt span). The validator errors unless `aPlusScore` sits strictly
  between `passingScore` and `scoreScale`.
- **BoK version currency.** Author to **v2.1** (effective 2 Feb 2026). Titles and question ranges are
  identical to v2.0.1, so the outlines drafted against v2.0.1 are still valid — but re-point PRD version
  citations and fold v2.1's new-law examples (e.g. South Korean AI Basic Law) into D2 prose at refresh.
- **EU AI Act timeline discipline.** Do **not** teach a specific phase-in date as settled while the
  Digital Omnibus is unresolved and the official pages disagree. Ground on the stable structure (risk
  tiers, Art 3 definitions, Art 9–15 obligations) and re-verify live before any date claim.
- **ISO 403 caveat.** `iso.org` blocks automated fetches (HTTP 403). ISO 42001/22989 are grounded on the
  BoK's own naming and official catalogue snippets — **do not quote clause-level ISO text**; confirm
  title/scope/edition via the catalogue entry at authoring time.
- **BoK PDF is link-only.** The IAPP BoK is copyright — always **link**, never rehost the PDF or its text.
- **Re-point the tutor agent** ([ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md)) at this corpus for
  an AIGP tutor (swap the exam name, four domains, weights, and the 100–500 scoring; keep the pedagogy).

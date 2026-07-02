# PRD — S3: AI Governance (AIGP) track

**Status:** approved to author · **Owner:** Academy · **Last updated:** 2026-07-01
**Parent:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) · **Shape modelled on:** [PRD-S0-GH500.md](./PRD-S0-GH500.md)

## 1. Why

AI governance is the **enterprise / regulated differentiator**. GH-500 proves security posture; AIGP
proves an organisation can *govern* AI — risk, accountability, transparency, and legal conformity —
which is exactly what regulated and public-sector buyers (banks, health, gov) procure against. It is
the underserved lane in the roadmap and the clearest reason a compliance-minded buyer chooses us.

The pull is strongest for **UK/EU** learners (Gerard's context): the AIGP BoK folds the **EU AI Act**
in as core content, and the Act's obligations are now biting on a published timeline
([entry into force Aug 2024; GPAI obligations Aug 2025; high-risk phase-in through 2026–2027](https://artificialintelligenceact.eu/implementation-timeline/)).
Per the roadmap, **EU AI Act and ISO/IEC 42001 do NOT get their own tracks — they fold into AIGP as
content** (§4 below). This keeps one governance track that maps to a real, proctored credential.

## 2. Exam facts (verified live 2026-07-01)

Source of truth: **[iapp.org/certify/aigp](https://iapp.org/certify/aigp)**, the IAPP certification
FAQ **[iapp.org/certify/faqs](https://iapp.org/certify/faqs)**, and the exam store
**[store.iapp.org/aigp-exam](https://store.iapp.org/aigp-exam/)**.

- **Credential: AIGP — Artificial Intelligence Governance Professional.** Body: **IAPP**
  (International Association of Privacy Professionals). [cert page](https://iapp.org/certify/aigp)
- **Format: 100 questions · 2.75 hours** (2h45m). [IAPP FAQ](https://iapp.org/certify/faqs)
- **Passing standard: scaled score of 300** on a **100–500** scale (IAPP notes this "does not
  represent 60%"). [IAPP FAQ](https://iapp.org/certify/faqs)
- **Proctored via Pearson VUE** — year-round at test centres worldwide, and online through **OnVUE**
  remote proctoring. [IAPP FAQ](https://iapp.org/certify/faqs)
- **Price: USD 799 non-member / USD 649 member.** Non-members' initial CMF is included in the exam
  fee; USD 250 CMF on recertification. [store](https://store.iapp.org/aigp-exam/)
- **Maintenance:** CPE requirements + a certification maintenance fee (USD 250/term) or IAPP
  membership (USD 295/yr). Exam term length **not stated on the FAQ → unverified**.
  [IAPP FAQ](https://iapp.org/certify/faqs)

`track.exam{}`: `questionCount 100, durationMinutes 165, passingScore 300, scoreScale 500,
proctored true, provider "Pearson VUE / OnVUE"`.

## 3. Blueprint → 4 domains (published ranges → normalized pedagogy weights)

Source: **AIGP Body of Knowledge & Exam Blueprint, Version 2.0.1, effective 3 February 2025**
([PDF](https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf); the BoK
**publishes** the min/max questions per domain). Weights below are normalized from the blueprint
**midpoints** (sum 1.0) — i.e. **pedagogy weights derived from the real published ranges**, not guessed.
Verify against the live BoK before authoring (a version bump is a data edit).

| d | Domain (official title, verbatim) | Blueprint (min–max Q) | Weight | slug |
|---|---|---|---|---|
| d1 | Understanding the foundations of AI governance | 16–20 | 0.21 | `d1-foundations` |
| d2 | Understanding how laws, standards and frameworks apply to AI | 19–23 | 0.25 | `d2-laws-standards` |
| d3 | Understanding how to govern AI development | 21–25 | 0.27 | `d3-govern-development` |
| d4 | Understanding how to govern AI deployment and use | 21–25 | 0.27 | `d4-govern-deployment` |

Sum = 1.00 ✓. (Blueprint midpoints 18/21/23/23 = 85; each ÷ 85.) Sub-domains are published too and
seed lessons: **I.A–I.C, II.A–II.D, III.A–III.C, IV.A–IV.C** (each with its own min/max range in the BoK).

## 4. Content plan (per domain — match CCA-F/GH-500 depth)

Each domain: 3–4 lessons (+ 2–3 knowledge checks each), ≥18–20 original questions, 1–2 branching
scenarios, 1–2 labs (governance artefacts, not code), official `resources[]`, video placeholders.
Governance frameworks fold in **here as content** (roadmap §4), mapped to the domain that owns them.

- **d1 Foundations (I.A–I.C):** definitions/types of AI, ML vs deterministic; the AI governance
  **lifecycle** (use-case assessment → risk → ethics-by-design → data governance → deployment →
  monitoring); core principles — fairness, **transparency & explainability, accountability**, human
  oversight; **AI risk & impact assessment** as the spine; org roles (developer vs deployer).
- **d2 Laws, standards & frameworks (II.A–II.D):** **EU AI Act** — risk tiers (unacceptable / high /
  limited / minimal), high-risk obligations (risk mgmt, data governance, record-keeping, human
  oversight, transparency), **GPAI** duties, and the **implementation timeline**; **GDPR × AI** —
  privacy impact assessments, PII in prompts, logging & retention, data residency, third-party data;
  **NIST AI RMF** (core functions/categories + Playbook, ARIA); **ISO/IEC 42001** (AI management
  system) and **ISO/IEC 22989** (terminology); OECD trustworthy-AI principles. *(BoK II.C names the
  EU AI Act; II.D names NIST RMF/ARIA and "the core ISO AI standards, i.e. 22989 and 42001".)*
- **d3 Govern AI development (III.A–III.C):** responsibilities across designing, building, training,
  testing, maintaining models; **impact assessment on the model**; data quality/bias, evaluation
  metrics & thresholds, human-in-the-loop; **model cards** and conformity documentation; secure &
  documented development (bridges to the S2 AI-Security mindset).
- **d4 Govern AI deployment & use (IV.A–IV.C):** selecting a model (own vs third-party) and deploying
  responsibly; ongoing **monitoring, maintenance, incident/issue management**; **public transparency
  disclosures** and notification obligations; accountability structures, procurement/vendor governance.

## 5. Research / source library (official only — Firecrawl seeds)

Per [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md); official docs & blueprints only, **no exam dumps**.
- **IAPP AIGP BoK & Exam Blueprint v2.0.1** (the [PDF](https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf))
  + [cert page](https://iapp.org/certify/aigp) + [free AIGP study guide](https://iapp.org/l/aigp-study-guide-request)
  + [certification handbook](https://assets.contentstack.io/v3/assets/bltd4dd5b2d705252bc/blteb8b5d531fd78971/IAPP-Certification_Handbook.pdf).
- **EU AI Act official text** — EUR-Lex Regulation (EU) 2024/1689
  ([eur-lex.europa.eu/eli/reg/2024/1689/oj](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)).
- **ISO/IEC 42001** overview ([iso.org/standard/81230.html](https://www.iso.org/standard/81230.html));
  ISO/IEC 22989 ([iso.org/standard/74296.html](https://www.iso.org/standard/74296.html)).
- **NIST AI RMF 1.0** ([nist.gov/itl/ai-risk-management-framework](https://www.nist.gov/itl/ai-risk-management-framework))
  + Playbook + ARIA program.
- **OECD AI Principles** ([oecd.ai/en/ai-principles](https://oecd.ai/en/ai-principles)).

Deliverable: a drafted `resources[]` (id/title/url/kind/annotation/domainIds), like the GH-300/GH-500
source libraries under [../research/](../research/).

## 6. Videos

~10–12 NotebookLM videos weighted to the blueprint (overview + heaviest domains d3/d4 + the EU AI Act
and NIST/ISO framework segments in d2), authored from [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md).
Governance is argument-heavy, so it suits the **Debate** and **Critique** NotebookLM formats — e.g.
*"EU AI Act high-risk obligations: developer vs deployer"* (Debate), *"Critique this model card against
transparency requirements"* (Critique) — alongside standard overview/deep-dive audio. Ships as
placeholders first (same as GH-500).

## 7. Acceptance (Ready gate)

`npm run validate` green (weights = 1.0, unique IDs, answerable, scenarios have a `best`) · renders on
all eight surfaces · A+ readiness gate reachable · **every source official** (IAPP / EUR-Lex / ISO /
NIST / OECD only, no dumps) · exam facts cite the live IAPP page and match BoK **v2.0.1** · EU AI Act
content carries the current risk tiers + timeline. Reuse the GH-500 authoring flow verbatim where possible.

---
_Unverified at author time (do not assert): AIGP certification **term length** (years to
recertification) — not stated on the IAPP FAQ. Per-domain weights are **pedagogy weights derived from
the BoK's published question ranges**, not an IAPP-published percentage._

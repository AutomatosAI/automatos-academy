# AIGP · Module 02 — Laws, Standards & Frameworks

**Exam tie-in:** Domain II — *Understanding how laws, standards and frameworks apply to AI* (blueprint **19–23 questions**, weight **0.25**; sub-domains **II.A–II.D**)  ·  **Format:** external exam (mock-exam prep)

This is the legal-and-frameworks core. It folds in the governance instruments that do **not** get their
own tracks:
- **EU AI Act** (Regulation (EU) 2024/1689) — the four **risk tiers** (unacceptable / high / limited /
  minimal-or-none), the **high-risk obligations** (risk management, data governance, record-keeping,
  human oversight, transparency, accuracy/robustness), **GPAI** (general-purpose AI model) duties, and
  the **implementation timeline** (into force **Aug 2024**; GPAI obligations **Aug 2025**; high-risk
  phase-in through **2026–2027**).
- **GDPR × AI** — data-protection impact assessments, PII in prompts/training data, logging &
  retention, data residency, third-party data, and the interaction with automated decision-making.
- **NIST AI RMF 1.0** — the core functions (**Govern / Map / Measure / Manage**) and categories, plus
  the **Playbook** and the **ARIA** program.
- **ISO/IEC 42001** (AI management system) and **ISO/IEC 22989** (terminology); **OECD** trustworthy-AI
  principles.

*(BoK II.C names the EU AI Act; II.D names NIST RMF/ARIA and "the core ISO AI standards, i.e. 22989 and
42001".)* Because this domain is dense, it warrants **two videos**: one on the EU AI Act, one on the
frameworks (NIST/ISO) + GDPR × AI.

## 📥 Sources to load into NotebookLM
- The Domain II lesson body (from the built track content / PRD-S3-AIGP §4, "d2 Laws, standards & frameworks II.A–II.D")
- IAPP AIGP Body of Knowledge & Exam Blueprint v2.0.1 — https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf  (sub-domains **II.A–II.D**)
- EU AI Act official text, Regulation (EU) 2024/1689 (EUR-Lex) — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- EU AI Act implementation timeline — https://artificialintelligenceact.eu/implementation-timeline/
- NIST AI RMF 1.0 (Govern/Map/Measure/Manage + Playbook + ARIA) — https://www.nist.gov/itl/ai-risk-management-framework
- ISO/IEC 42001 overview (AI management system) — https://www.iso.org/standard/81230.html
- ISO/IEC 22989 overview (terminology) — https://www.iso.org/standard/74296.html
- OECD AI Principles — https://oecd.ai/en/ai-principles

## 🎬 Video Overview A — the EU AI Act (~8 min) — NotebookLM → Video → Customize
```
Audience: a smart professional studying for the IAPP AIGP exam — capable, privacy/compliance-literate,
new to the EU AI Act's structure. Explain plainly first, then precisely.

Objective of THIS video (cover only this): the EU AI Act's risk-tier architecture and what each tier
requires — unacceptable (prohibited), high-risk (the heavy obligations), limited (transparency duties),
and minimal-or-none — plus the implementation timeline that decides when obligations bite.

Exam tie-in: this maps to Domain II "Understanding how laws, standards and frameworks apply to AI"
(blueprint 19–23 questions, ~0.25 weight; II.C names the EU AI Act). Frame around the task statements:
classify a system into the correct risk tier; list the high-risk obligations (risk management, data
governance, record-keeping/logging, human oversight, transparency, accuracy & robustness); explain GPAI
duties; and place obligations on the timeline (into force Aug 2024, GPAI Aug 2025, high-risk phase-in
2026–2027). For each point, make explicit what the candidate must DECIDE — above all, given a scenario,
WHICH TIER applies and therefore which obligations attach.

Shape: ~8 minutes. Open with why tier classification is the highest-leverage EU-AI-Act skill on the
exam. Use ONE worked example that classifies a concrete system and derives its obligations. Call out the
top 2–3 distractors (treating "high-risk" as "banned"; forgetting limited-risk transparency duties;
assuming all obligations apply from day one rather than on the phased timeline; conflating a GPAI model
provider with a high-risk-system deployer). Close with a one-line "on the exam, remember…" about
mapping tier → obligations.

Stay strictly grounded in the provided sources; use the EUR-Lex text and the official timeline. Do not
invent tier names, obligation lists, or dates.
```

## 🎬 Video Overview B — NIST AI RMF, ISO/IEC 42001 & GDPR × AI (~8 min) — NotebookLM → Video → Customize
```
Audience: a smart professional studying for the IAPP AIGP exam — capable, new to how the voluntary
frameworks and GDPR interact with AI. Explain plainly first, then precisely.

Objective of THIS video (cover only this): the non-EU-AI-Act instruments in Domain II — the NIST AI RMF
(Govern/Map/Measure/Manage + Playbook + ARIA), ISO/IEC 42001 (an AI management system) with ISO/IEC
22989 (terminology), and GDPR × AI (DPIAs, PII in prompts/training data, logging & retention, data
residency, third-party data) — and how they differ from a binding law.

Exam tie-in: maps to Domain II (blueprint 19–23 questions, ~0.25 weight; II.D names NIST RMF/ARIA and
"the core ISO AI standards, i.e. 22989 and 42001"). Frame around the task statements: name the four NIST
core functions and what each does; explain that ISO/IEC 42001 certifies a management SYSTEM (process),
not a model; and identify when GDPR obligations (e.g. a DPIA) are triggered by an AI use of personal
data. For each, make explicit what the candidate must DECIDE — which instrument answers a given need
(voluntary framework vs certifiable standard vs binding regulation).

Shape: ~8 minutes. Open with the "binding vs voluntary vs certifiable" distinction because the exam
tests it. One worked example: pick a scenario and show how NIST RMF, ISO 42001, and GDPR each apply to
it differently. Call out the top 2–3 distractors (thinking NIST RMF is mandatory; thinking ISO 42001
certifies a model rather than a management system; missing that GDPR still governs PII inside AI). Close
with a one-line "on the exam, remember…".

Stay strictly grounded in the provided sources (NIST, ISO overviews, GDPR-via-the-lesson-body, OECD).
Do not invent function names, standard numbers, or GDPR triggers.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach Domain II "Understanding how laws, standards and frameworks
apply to AI" (II.A–II.D) for the AIGP exam. Cover, and keep distinct: the EU AI Act — four risk tiers,
high-risk obligations (risk management, data governance, record-keeping, human oversight, transparency,
accuracy/robustness), GPAI duties, and the Aug-2024 / Aug-2025 / 2026–2027 timeline; GDPR × AI — DPIAs,
PII in prompts and training data, logging/retention, data residency, third-party data; NIST AI RMF —
Govern/Map/Measure/Manage plus Playbook and ARIA; ISO/IEC 42001 (management system) and ISO/IEC 22989
(terminology); and OECD principles. For each instrument make the exam decision explicit: is it binding,
voluntary, or certifiable, and which one answers a given governance need. Spend the most time on EU AI
Act tier classification, the single highest-leverage skill. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min) — exam track
```
Tight recap of Domain II must-knows: the four EU AI Act tiers and the high-risk obligation list; the
timeline (into force Aug 2024, GPAI Aug 2025, high-risk phase-in 2026–2027); GDPR triggers for AI
(DPIA, PII in prompts, retention, residency); NIST's four core functions; ISO/IEC 42001 = management
system (process, not model); "binding vs voluntary vs certifiable". Hit the top distractors (high-risk
≠ banned; ISO 42001 ≠ model certification; NIST RMF ≠ mandatory; all obligations ≠ day one). Grounded
in the sources. For the week before the exam.
```

## 🎧 Audio — Debate / Critique (judgment call) — NotebookLM → Audio → Customize
```
Two hosts, expert level. Debate the exam's hardest Domain-II judgment call: "Which EU AI Act risk tier
applies?" Take a genuinely borderline system (e.g. an AI tool used in an employment or
essential-services context) and have one host argue it is high-risk (Annex-style use case → full
obligations) while the other argues it is only limited-risk (transparency duty) or falls outside. Make
them surface the exact facts that flip the classification, then reconcile into a decision procedure a
candidate can run on any scenario. Second round: "developer vs deployer — who carries which EU AI Act
obligation?" Keep it strictly grounded in the EUR-Lex text and the lesson body; invent no tiers, no
obligations.
```

## 🤖 Apply it in Automatos
Make Domain II concrete on the platform. Take a real Automatos AI deployment (say, an agent that drafts
customer communications or triages support) and **classify it under the EU AI Act** — is it high-risk,
limited-risk, or minimal? Then map each high-risk obligation onto an Automatos control: **risk
management** → the blueprint's documented use-case + risk notes; **record-keeping / logging** →
Automatos **audit logging**; **human oversight** → **approval gates**; **transparency** → user-facing
disclosure that AI is in the loop; **accountability** → **RBAC / super-admin tiers**. For GDPR × AI,
point at where PII enters prompts and how retention/logging controls answer a DPIA. Frame the frameworks
by fit: NIST AI RMF gives you the process to *run* this governance; ISO/IEC 42001 is the management
system you'd *certify*; the EU AI Act is the binding law you must *conform* to.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate **both** Video Overviews (EU AI Act; NIST/ISO + GDPR) — tune each to ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio; add the "which risk tier applies?" Debate
- [ ] Download → host → register in the domain `videos[]` (`d2-laws-standards`)
- [ ] Tick this module off in the track README

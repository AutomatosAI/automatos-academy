# AIGP · Module 01 — Foundations of AI Governance

**Exam tie-in:** Domain I — *Understanding the foundations of AI governance* (blueprint **16–20 questions**, weight **0.21**; sub-domains **I.A–I.C**)  ·  **Format:** external exam (mock-exam prep)

Domain I is the vocabulary and the spine of everything after it. It covers **what AI is** (definitions
and types of AI; ML vs deterministic/rules-based systems), the **AI governance lifecycle** (use-case
assessment → risk assessment → ethics-by-design → data governance → deployment → monitoring), the
**core trustworthy-AI principles** (fairness, transparency & explainability, accountability, human
oversight), the **AI risk & impact assessment** as the recurring instrument, and the **organisational
roles** — crucially the distinction between an AI **developer** (builds/trains the system) and a
**deployer** (puts it into use), which the exam leans on repeatedly in later domains.

## 📥 Sources to load into NotebookLM
- The Domain I lesson body (from the built track content / PRD-S3-AIGP §4, "d1 Foundations I.A–I.C")
- IAPP AIGP Body of Knowledge & Exam Blueprint v2.0.1 — https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf  (read sub-domains **I.A–I.C** and their task statements)
- OECD AI Principles (definitions + trustworthy-AI principles) — https://oecd.ai/en/ai-principles
- NIST AI RMF 1.0 (framing: govern/map/measure/manage, risk & impact language) — https://www.nist.gov/itl/ai-risk-management-framework
- ISO/IEC 22989 terminology overview (AI concepts & vocabulary) — https://www.iso.org/standard/74296.html

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a smart professional studying for the IAPP AIGP (AI Governance Professional) exam — capable,
often from a privacy/compliance background, but new to AI-specific governance. Explain plainly first,
then precisely.

Objective of THIS video (cover only this): the foundations of AI governance — the AI governance
lifecycle and the core trustworthy-AI principles (fairness, transparency & explainability,
accountability, human oversight), anchored by the risk & impact assessment and the developer-vs-deployer
role split.

Exam tie-in: this maps to Domain I "Understanding the foundations of AI governance" (blueprint 16–20
questions, ~0.21 weight, sub-domains I.A–I.C). Frame the content around the domain's task statements:
distinguish AI types and ML vs deterministic systems; walk the governance lifecycle end to end; define
and apply each core principle; and place the AI risk/impact assessment as the instrument that runs
through the lifecycle. For each key point, make clear what a candidate must be able to DECIDE or DO on
the exam — e.g. given a scenario, name which principle is at stake, or which lifecycle stage a control
belongs to, or whether an org is acting as developer or deployer — not just recite a definition.

Shape: ~8 minutes. Open with why foundations matter on the exam (they underpin the scenario questions
in Domains II–IV). Use ONE worked example that threads the whole lifecycle for a single AI use case.
Call out the top 2–3 distractors candidates get wrong (confusing transparency with explainability;
treating "accountability" as the same as "human oversight"; mislabelling a deployer as a developer).
Close with a one-line "on the exam, remember…" — foundations are how you decode every later scenario.

Stay strictly grounded in the provided sources. Do not introduce principle names, lifecycle stages, or
role definitions that aren't in the sources. If the sources conflict, prefer the IAPP BoK and the
official OECD/NIST/ISO texts.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach Domain I "Understanding the foundations of AI governance"
(I.A–I.C) for the AIGP exam: definitions and types of AI, ML vs deterministic systems; the full AI
governance lifecycle (use-case assessment → risk assessment → ethics-by-design → data governance →
deployment → monitoring); the core principles — fairness, transparency & explainability, accountability,
human oversight; the AI risk & impact assessment as the recurring instrument; and the organisational
roles, especially developer vs deployer. For each, make the exam decision explicit: given a fact
pattern, which principle, which lifecycle stage, which role. Draw the through-line to Domains II–IV so
the listener sees why foundations are load-bearing. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min) — exam track
```
Tight recap of the must-know Domain I distinctions: ML vs deterministic; the lifecycle stages in order;
fairness vs transparency vs explainability vs accountability vs human oversight (define each in one
line and how they differ); risk assessment vs impact assessment; developer vs deployer. Include the top
distractors (transparency≠explainability; accountability≠human oversight; deployer≠developer).
Grounded in the sources. For the week before the exam.
```

## 🎧 Audio — Debate / Critique (judgment call) — NotebookLM → Audio → Customize
```
Two hosts, expert level. Debate a foundational judgment call the exam probes: "Transparency vs
explainability — are they the same governance obligation, and does more of one reduce the need for the
other?" One host presses that transparency (disclosing that/how AI is used, model documentation) and
explainability (making a specific output intelligible) are distinct duties that can trade off; the
other argues they're facets of one accountability goal. Reconcile into a rule a candidate can apply to
a scenario. Keep it strictly grounded in the sources' definitions; no invented principle names.
```

## 🤖 Apply it in Automatos
Ground the foundations in the platform. Walk an Automatos AI deployment through the governance
lifecycle: an **agent blueprint** is the documented design artefact (use-case + intended purpose);
**approval gates** implement *human oversight*; **audit logging** gives you the record that supports
*accountability*; **RBAC / super-admin tiers** encode who is answerable for what. Then run the role
test: when the org configures and operates agents on the platform it is acting as a **deployer**, while
whoever builds/trains an underlying model is the **developer** — and the same organisation can be both.
Have the learner name, for one Automatos use case, which lifecycle stage each platform feature serves
and which principle it upholds.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio; add the transparency-vs-explainability Debate
- [ ] Download → host → register in the domain `videos[]` (`d1-foundations`)
- [ ] Tick this module off in the track README

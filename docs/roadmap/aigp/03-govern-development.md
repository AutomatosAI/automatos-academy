# AIGP · Module 03 — Governing AI Development

**Exam tie-in:** Domain III — *Understanding how to govern AI development* (blueprint **21–25 questions**, weight **0.27**; sub-domains **III.A–III.C**)  ·  **Format:** external exam (mock-exam prep)

One of the two heaviest domains (0.27). It's about governance during the **build**: responsibilities
across **designing, building, training, testing and maintaining** models; the **impact assessment on
the model** itself; **data quality and bias**; **evaluation metrics & thresholds**; **human-in-the-loop**;
**model cards** and conformity documentation; and **secure, documented development** (this bridges to
the S2 AI-Security mindset). Because it's heavy and splits cleanly, it warrants **two videos**: one on
the development lifecycle + data/bias/evaluation, one on documentation, model cards & secure development.

## 📥 Sources to load into NotebookLM
- The Domain III lesson body (from the built track content / PRD-S3-AIGP §4, "d3 Govern AI development III.A–III.C")
- IAPP AIGP Body of Knowledge & Exam Blueprint v2.0.1 — https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf  (sub-domains **III.A–III.C**)
- EU AI Act official text, Regulation (EU) 2024/1689 (high-risk data governance, technical documentation, testing) — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- NIST AI RMF 1.0 (Map/Measure — evaluation, bias, robustness) — https://www.nist.gov/itl/ai-risk-management-framework
- ISO/IEC 42001 overview (management-system controls for development) — https://www.iso.org/standard/81230.html

## 🎬 Video Overview A — development lifecycle, data quality, bias & evaluation (~8 min)
```
Audience: a smart professional studying for the IAPP AIGP exam — capable, new to governing the model
build. Explain plainly first, then precisely.

Objective of THIS video (cover only this): governing the AI development lifecycle — the responsibilities
at design/build/train/test/maintain, the impact assessment on the MODEL, and getting data quality,
bias, and evaluation metrics/thresholds right (with human-in-the-loop).

Exam tie-in: this maps to Domain III "Understanding how to govern AI development" (blueprint 21–25
questions, ~0.27 weight — one of the two heaviest; sub-domains III.A–III.C). Frame around the task
statements: assign governance responsibilities across the development stages; run an impact assessment
on the model; assess data quality and bias sources; and choose evaluation metrics and thresholds that
gate release. For each point, make explicit what the candidate must DECIDE or DO — e.g. given a
scenario, which stage failed, which bias entered where, or whether an evaluation result should block
deployment.

Shape: ~8 minutes. Open with why development-stage governance is heavily weighted and heavily
scenario-tested. Use ONE worked example: a model going through the lifecycle where a data-quality/bias
issue must be caught by evaluation. Call out the top 2–3 distractors (treating data governance as a
deployment-only concern; confusing an accuracy metric with a fairness metric; assuming "human oversight"
at deployment substitutes for "human-in-the-loop" during training/testing). Close with a one-line "on
the exam, remember…".

Stay strictly grounded in the provided sources. Do not invent metric names, thresholds, or lifecycle
stages. If sources conflict, prefer the BoK and the official EU AI Act / NIST texts.
```

## 🎬 Video Overview B — documentation, model cards & secure development (~8 min)
```
Audience: a smart professional studying for the IAPP AIGP exam — capable, new to development-time
documentation duties. Explain plainly first, then precisely.

Objective of THIS video (cover only this): documenting and securing development — model cards and
conformity/technical documentation, and secure & documented development practices (the bridge to the
AI-security mindset), so the build is auditable and defensible.

Exam tie-in: maps to Domain III (blueprint 21–25 questions, ~0.27 weight; III.A–III.C). Frame around
the task statements: produce a model card that records intended use, data, evaluation and limitations;
maintain the technical documentation the EU AI Act expects for high-risk systems; and embed security
into development. For each, make explicit what the candidate must DECIDE — what belongs in a model card
vs technical documentation, and what makes development "documented and secure" for conformity.

Shape: ~8 minutes. Open with why documentation is a governance CONTROL, not paperwork (it's what proves
conformity on the exam). One worked example: critique a thin model card and show what's missing. Call
out the top 2–3 distractors (model card ≠ marketing sheet; documentation is created DURING development,
not reconstructed after; security-in-development is part of governance, not a separate silo). Close with
a one-line "on the exam, remember…".

Stay strictly grounded in the provided sources. Do not invent model-card fields or documentation
requirements beyond the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach Domain III "Understanding how to govern AI development"
(III.A–III.C) for the AIGP exam: responsibilities across designing, building, training, testing and
maintaining models; the impact assessment on the model; data quality and bias (where bias enters and
how to catch it); evaluation metrics and thresholds and how they gate release; human-in-the-loop during
development; model cards and conformity/technical documentation; and secure, documented development as
the bridge to AI security. For each, make the exam decision explicit — which stage owns which control,
which metric answers which risk, what a defensible model card contains. Ground strictly in the sources;
tie duties back to the EU AI Act high-risk documentation and NIST Map/Measure where the sources support
it.
```

## 🎧 Audio — Brief (revise, ~8–12 min) — exam track
```
Tight recap of Domain III must-knows: the development stages and who governs each; impact assessment on
the model; data-quality/bias sources; evaluation metrics vs fairness metrics and using thresholds to
gate release; human-in-the-loop (development) vs human oversight (deployment); what a model card and
technical documentation must contain; secure & documented development. Hit the top distractors (data
governance isn't deployment-only; accuracy ≠ fairness; model card ≠ marketing; docs made during, not
after). Grounded in the sources. For the week before the exam.
```

## 🎧 Audio — Debate / Critique (judgment call) — NotebookLM → Audio → Customize
```
Two hosts, expert level, Critique format. Put a real (or realistic) model card in front of them and
critique it against transparency and conformity requirements: does it state intended use and
limitations, the training data provenance and known biases, the evaluation metrics and thresholds, and
the human-in-the-loop points? Have one host defend the card as "good enough to ship" and the other
red-line every gap that would fail an EU AI Act high-risk documentation check. Reconcile into a
checklist a candidate can apply. Second round debate: "Whose job is bias mitigation — the developer at
training time, or the deployer at use time?" Keep it strictly grounded in the sources; invent no
model-card fields.
```

## 🤖 Apply it in Automatos
Map development-time governance onto how you'd build a governed agent in Automatos. The **agent
blueprint** is your model/system card and technical-documentation home: intended use, the data and tools
it may touch, evaluation notes, and known limitations live there as a versioned artefact. **RBAC /
super-admin tiers** assign the development responsibilities (who may edit a blueprint, who may promote
it). **Approval gates** enforce human-in-the-loop at the points that matter, and **audit logging**
records the build history so the development is *documented* and defensible. Have the learner author a
blueprint as a model card, then critique it against the Domain-III documentation checklist — what would
an EU AI Act high-risk reviewer still ask for?

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate **both** Video Overviews (lifecycle/data/bias/eval; documentation/model-cards/secure) — tune each to ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio; add the "critique this model card" Critique
- [ ] Download → host → register in the domain `videos[]` (`d3-govern-development`)
- [ ] Tick this module off in the track README

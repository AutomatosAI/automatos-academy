# AIGP · Module 00 — Overview & Exam Strategy

**Exam tie-in:** whole blueprint (all four domains) — how the AIGP is built and scored  ·  **Format:** external exam (mock-exam prep)

The AIGP is **100 questions in 2.75 hours (2h45m)**, scored on a **scaled 100–500** scale where **300
passes** (IAPP is explicit that 300 "does not represent 60%" — it's a scaled cut, not a raw percentage).
It's proctored at **Pearson VUE** test centres or online via **OnVUE**. The blueprint of record is the
**AIGP Body of Knowledge & Exam Blueprint v2.0.1, effective 3 February 2025**, which publishes a
**min–max question range per domain**. Four domains, normalized pedagogy weights: Foundations **0.21**,
Laws/Standards/Frameworks **0.25**, Govern Development **0.27**, Govern Deployment & Use **0.27**.

## 📥 Sources to load into NotebookLM
- The track blueprint table (from this track's README + PRD-S3-AIGP §3)
- IAPP AIGP Body of Knowledge & Exam Blueprint v2.0.1 — https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf
- IAPP AIGP certification page — https://iapp.org/certify/aigp
- IAPP certification FAQ (format, scaled scoring, proctoring) — https://iapp.org/certify/faqs
- EU AI Act implementation timeline (context for the biting dates) — https://artificialintelligenceact.eu/implementation-timeline/

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a smart professional about to study for the IAPP AIGP (Artificial Intelligence Governance
Professional) exam — capable, likely with a privacy or compliance background, but new to this specific
blueprint. Explain plainly first, then precisely.

Objective of THIS video (cover only this): how the AIGP exam is structured, scored, and best
approached — the four domains and their weights, the scaled-score pass mark, and a strategy for the
2h45m sitting. Do NOT teach domain content here; this is the map, not the territory.

Exam tie-in: this frames the whole blueprint. Make three facts unmistakable: (1) 100 questions in
2.75 hours; (2) a SCALED score of 300 on a 100–500 scale passes — this is NOT 60% of questions, so
don't reason about a raw percentage; (3) the four domains carry roughly 0.21 / 0.25 / 0.27 / 0.27
weight, so the two "governing development" and "governing deployment" domains together are more than
half the exam and deserve the most study. For each point, make clear what the candidate must DO to
prepare, not just know.

Shape: ~8 minutes. Open with why the scaled-score point matters (candidates mis-plan around "60%"),
walk through the four-domain map with the weights, call out the top 2–3 planning mistakes (treating it
as 60%, under-weighting the two 0.27 domains, cramming the EU AI Act as if it were its own exam rather
than domain-II content), and close with a one-line "on the exam, remember…" about pacing 100 questions
across 165 minutes.

Stay strictly grounded in the provided sources. Do not invent question counts, sub-domain names, or a
recertification term (the term length is not published — do not assert one). If the sources conflict,
prefer the IAPP FAQ and BoK v2.0.1.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Give a strategic tour of the AIGP exam and BoK v2.0.1 for a
candidate planning their prep: the four domains and why each exists, the published question ranges
(16–20 / 19–23 / 21–25 / 21–25) and the derived weights, the scaled-score model (300 of 100–500 passes,
not 60%), Pearson VUE / OnVUE logistics, and how the EU AI Act, NIST AI RMF, ISO/IEC 42001 and GDPR
fold in as domain-II content rather than separate subjects. Turn the map into a study plan: sequence the
domains, budget effort by weight, and flag the judgment-heavy areas (risk-tier classification,
developer vs deployer) that reward scenario practice. Ground strictly in the sources; do not assert a
recertification term length.
```

## 🎧 Audio — Brief (revise, ~8–12 min) — exam track
```
Tight recap of the exam mechanics and the study strategy: 100 questions / 2h45m; scaled 300 of 100–500
passes (NOT 60%); four domains at ~0.21 / 0.25 / 0.27 / 0.27; the two 0.27 "govern development" and
"govern deployment" domains are the biggest single blocks; EU AI Act / NIST / ISO / GDPR are
domain-II content. End with pacing (roughly a question every 1.5–1.6 minutes) and the top planning
distractors. Grounded in the sources. For the week before the exam.
```

## 🎧 Audio — Debate / Critique (judgment call) — NotebookLM → Audio → Customize
```
Two hosts, expert level. Debate a planning tension the candidate must resolve: "Should you study the
four AIGP domains evenly, or weight hard toward the two 0.27 domains?" One host argues even coverage
(the scaled score can be tanked by any weak domain; foundations underpin everything); the other argues
weighting to the blueprint (Develop + Deploy are >50% of scored items and are the most scenario-heavy).
Have them reconcile into a concrete plan. Keep it strictly grounded in the published weights and the
scaled-scoring model; no invented percentages.
```

## 🤖 Apply it in Automatos
Use this overview to frame the whole track's Automatos thread: the AIGP asks whether an organisation can
*govern* AI — and every later module will map a specific requirement onto an Automatos control
(blueprints as documented design, approval gates as human oversight, audit logs as record-keeping, RBAC
/ super-admin tiers as accountability). Set the expectation here: by the end of the track the learner
will be able to take a real Automatos deployment and classify it under the EU AI Act, then point to the
platform control that satisfies each obligation.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio; add the planning Debate
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

# Cross-Vendor · Module 05 — Google Generative AI Leader (exam)

**Type:** external exam (mock-exam prep) · **$99 · 90 min · 50–60 MCQ · proctored · no prerequisites · valid 3 yrs**
**Blueprint (official section titles + weights, sum = 1.00):** D1 Fundamentals of gen AI **30%** · D2 Google Cloud's gen AI offerings **35%** · D3 Techniques to improve gen AI model output **20%** · D4 Business strategies for a successful gen AI solution **15%**
**Passing score:** not published by Google — confirm on the cert page before launch (leave `passingScore` unset). **Currency:** guide refreshed for branding changes — teach current names (Agent Platform / *Gemini Enterprise Agent Platform*, *Agent Studio*).

## 📥 Sources to load into NotebookLM
- The domain lesson bodies (from the track content / PRD) for D1–D4
- **Official exam guide PDF** — https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf (the source of truth for section titles, weights, and task statements)
- Cert page — https://cloud.google.com/learn/certification/generative-ai-leader (format, price, validity; confirm passing score here)
- Google Vertex AI generative-AI overview — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview (D2 "Google Cloud's gen AI offerings" — Gemini, Vertex AI Studio, Model Garden, Agent Builder / Agent Platform, grounding)
- Registration — https://cp.certmetrics.com/google/en/login (context: how to book the real exam)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a business-audience professional studying for the Google Cloud "Generative AI Leader" exam —
capable, not necessarily technical, no prerequisites required. Explain plainly first, then precisely.
Cover ONLY: how the exam is shaped and how to sit it — $99, 90 minutes, 50–60 multiple-choice,
online- or onsite-proctored, valid 3 years, no prerequisites — and the FOUR weighted domains and what
each demands: D1 Fundamentals of gen AI (30%), D2 Google Cloud's gen AI offerings (35% — the heaviest;
Gemini, Vertex AI, Model Garden, Agent Builder / Agent Platform, grounding), D3 Techniques to improve
gen AI model output (20% — prompting, grounding/RAG, fine-tuning at a leader level), D4 Business
strategies for a successful gen AI solution (15%). Map every point to what a CANDIDATE must DECIDE on
the exam, not just define. Teach CURRENT product names (the guide was refreshed for the rebrand —
Agent Platform / Gemini Enterprise Agent Platform, Agent Studio). ~8 minutes: open with why D2 carries
the most weight, one worked example (matching a business need to the right Google Cloud gen-AI
offering), the top 2–3 distractors (dated product names; confusing grounding with fine-tuning; picking
the wrong offering for the need), and a one-line "on the exam, remember…" takeaway. Stay strictly
grounded in the provided sources; do not invent product names, weights, or a passing score.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics, but pitched at a BUSINESS leader (this is a foundational,
non-engineering credential). Teach the Generative AI Leader exam by its four official domains and their
task statements: D1 Fundamentals of gen AI (30%) — what gen AI is, models, capabilities and limits;
D2 Google Cloud's gen AI offerings (35%) — Gemini, Vertex AI (Studio, Model Garden incl. partner
models), Agent Builder / Agent Platform, grounding; D3 Techniques to improve gen AI model output (20%)
— prompting, grounding/RAG, fine-tuning, evaluation, at a decision level; D4 Business strategies for a
successful gen AI solution (15%) — value, responsible AI, cost, adoption, risk. For each domain make
the exam DECISION explicit — what a candidate must be able to choose or recommend. Use CURRENT product
names (Agent Platform / Gemini Enterprise Agent Platform, Agent Studio). Ground strictly in the
sources; do not state a passing score (Google hasn't published one).
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap for the week before the Generative AI Leader exam. Hit the must-know distinctions by
weight: D2 first (35% — which Google Cloud gen-AI offering fits which need: Gemini vs Vertex AI Studio
vs Model Garden vs Agent Builder / Agent Platform, and grounding), then D1 (30% — gen-AI fundamentals),
D3 (20% — prompting vs grounding/RAG vs fine-tuning), D4 (15% — business value, responsible AI, cost).
Call out the top distractors: OUTDATED product names (the guide was rebranded — use current names),
grounding-vs-fine-tuning, and matching an offering to the wrong business need. Remind: 90 min, 50–60
MCQ, no prerequisites; confirm the passing score on the cert page. Grounded in the sources. For final
revision.
```

## 🤖 Apply it in Automatos
Make the exam's abstractions concrete in Automatos: for D2, stand up a Gemini-on-Vertex agent with
grounding (the "Google Cloud gen-AI offering" a leader is asked to choose); for D3, show the same agent
improved by grounding/RAG vs prompt changes so the candidate can FEEL the technique difference; for D4,
frame the business call — cost, residency, responsible-AI — as Automatos's per-agent provider choice.
Teaches the skill and shows Automatos doing the thing the exam only asks you to reason about.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (include the exam guide PDF + D1–D4 task statements)
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (learn) **and the Brief** (revise, week before the exam)
- [ ] Confirm the current passing score on the cert page; keep product names current to the rebrand
- [ ] Download → host → register in the domain's `videos[]`
- [ ] Tick this module off in the track README

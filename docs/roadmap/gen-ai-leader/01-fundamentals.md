# GAL · Module 01 — Fundamentals of gen AI

**Exam tie-in:** D1 Fundamentals of gen AI (30%)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The d1 lesson bodies (from `public/content/google/gen-ai-leader/d1-fundamentals.json`)
- Official exam guide PDF — the "Fundamentals of gen AI" section:
  https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- Google Cloud gen-AI overview docs (the pages the d1 resources[] cite — current branding)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a business leader studying for the Generative AI Leader exam — capable, non-technical.
Explain plainly first, then precisely. Cover ONLY the D1 section (30% of the exam): what foundation
models are and how they work at leader level (trained on vast data, predict likely continuations —
capable but not databases of truth); the capability/limit pairs the exam tests — creativity vs
hallucination, breadth vs currency of knowledge, speed vs need-for-review; why data quality and
data access decide most gen-AI outcomes; ML vs generative AI as exam vocabulary; and spotting a
good gen-AI use case (language-heavy, repetitive, judgment-assisted) vs a poor one. Map every point
to what a candidate must DECIDE on the exam. ~8 minutes: open with why D1 is 30% of the paper, one
worked use-case-selection example, the 2–3 distractors candidates get wrong (treating the model as
a fact database; assuming training data is current; confusing ML prediction with gen-AI creation),
and a one-line "on the exam, remember…". Stay strictly grounded in the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone, business-leader listener, no code. Teach the D1 domain for the Generative
AI Leader exam: foundation models at the level a leader must reason about (what training data
means, why outputs are probabilistic, what hallucination is and why workflows are designed around
it); the vocabulary the exam uses (ML vs gen AI, prompts, tokens at concept level, multimodality);
data as the differentiator — quality, access, governance; and the use-case judgment D1 keeps
returning to: where gen AI creates value, where it doesn't, and how to tell. For each concept, make
the exam decision explicit. Ground strictly in the sources; current Google terminology only.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of D1 must-knows: the capability/limit pairs, hallucination as designed-around,
ML-vs-gen-AI vocabulary, the use-case selection test, and the top distractors. For the week before
the exam. Grounded in the sources.
```

## 🤖 Apply it in Automatos
Run ABF Module 00's generic-vs-grounded experiment again, wearing the exam lens: ask an agent an
industry question with no context, then paste your real document in. D1's "capabilities and
limitations" section is exactly that difference — now the learner can *cite it from experience*.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

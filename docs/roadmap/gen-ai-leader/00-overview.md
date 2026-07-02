# GAL · Module 00 — Overview: blueprint, format & exam strategy

**Exam tie-in:** the whole blueprint  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The track overview + exam-strategy lesson bodies (from `public/content/google/gen-ai-leader/`)
- Official exam guide PDF: https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- Certification page: https://cloud.google.com/learn/certification/generative-ai-leader

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a business leader preparing for Google Cloud's Generative AI Leader exam — smart,
non-technical, time-poor. Explain plainly first, then precisely. Cover ONLY: what this exam is and
how to prepare for it. The format: $99, 90 minutes, 50–60 multiple-choice questions, online- or
onsite-proctored, no prerequisites, valid three years — and the honest note that Google does not
publish a passing score, so train to comfortable mastery, not a cut-line. The four sections and
their official weights: Fundamentals of gen AI (30%), Google Cloud's gen AI offerings (35% — the
heavyweight; most study time goes here), Techniques to improve output (20%), and Business
strategies (15%). Strategy: this is a LEADER exam — it tests judgment about what gen AI can do,
which Google offering fits which need, and how to adopt it — not coding. ~8 minutes: open with who
this credential is for and why it's the rare AI cert a non-engineer can sit, walk the four sections
with one example question-style decision each, close with a 3–4 week prep plan using this track's
mock exams and readiness score. Stay strictly grounded in the sources; use Google's current product
names exactly as the guide does; do not invent a passing score.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone for a business-leader listener. Walk the Generative AI Leader exam end to
end: the format facts (50–60 MCQ, 90 minutes, proctored, no prerequisites, 3-year validity, $99),
the four sections with their weights and what each actually tests, why section 2 (Google's
offerings, 35%) deserves the most study time, and how a leader should prepare differently from an
engineer — concepts and trade-offs over syntax, product-fit judgment over features. Be honest that
Google publishes no passing score and that the Academy's 70% mock bar is a training standard, not
Google's. Ground strictly in the sources; current product names only.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap for the week before the exam: the four section weights (30/35/20/15), the five facts
about format worth knowing cold, and the top distinctions candidates mix up — which Google product
answers which need, grounding vs fine-tuning vs prompting, and build-vs-buy decision logic.
Grounded in the sources; no invented facts.
```

## 🤖 Apply it in Automatos
The exam's core skill — judging what gen AI can do for a business — is the same judgment ABF
teaches hands-on. Point the learner at their own Automatos workspace: the mission they approved,
the grounded assistant they built. Passing GAL is proving to the world what they already practise.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

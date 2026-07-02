# GAL · Module 04 — Business strategies for a successful gen AI solution

**Exam tie-in:** D4 Business strategies for a successful gen AI solution (15%)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The d4 lesson bodies (from `public/content/google/gen-ai-leader/d4-business-strategy.json`)
- Official exam guide PDF — the "Business strategies" section:
  https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- The Google Cloud adoption/responsible-AI pages the d4 resources[] cite

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a business leader studying for the Generative AI Leader exam. Explain plainly first, then
precisely. Cover ONLY D4 (15% — small weight, but it's the section written in the candidate's own
language): the adoption playbook the exam tests — picking the first use cases by value and
feasibility (start where data is ready and mistakes are cheap); build-vs-buy judgment; data
readiness as the usual bottleneck; people and change (skills, champions, redesigning workflows
around review); measuring success with real metrics; and risk/governance at leader level —
responsible-AI principles, human oversight, knowing which decisions stay human. ~8 minutes: one
worked adoption-plan drill, the 2–3 distractors (boiling the ocean with a moonshot first project;
treating adoption as a pure technology purchase; metrics that measure activity instead of value),
close with "on the exam, remember…". Strictly grounded in the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone, business-leader listener. Teach D4 as the adoption playbook: use-case
selection (value × feasibility × mistake-cost), build-vs-buy including when ready-made apps beat
platform builds, data readiness as the gating factor, the people side (skills, champions, workflow
redesign, trust built through review-then-widen), measuring success honestly, and governance —
responsible-AI principles, oversight structures, and the leader's job of deciding what stays
human. Connect each to how the exam frames it. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of D4: the use-case selection test, build-vs-buy logic, data readiness, the three
people moves, honest metrics, and governance one-liners. Plus the cross-section reminders that D4
questions often lean on D1 limits and D3 techniques. For the week before the exam.
```

## 🤖 Apply it in Automatos
D4 is ABF's capstone wearing exam clothes: the learner already picked use cases by value and
mistake-cost (m1), ran review-then-widen delegation (m5), wrote the policy (m6) and the ROI sheet
(m7). Their one-page AI operating plan is a D4 answer key from their own business — revise from it.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

# GAL · Module 02 — Google Cloud's gen AI offerings

**Exam tie-in:** D2 Google Cloud's gen AI offerings (35% — the heavyweight)  ·  **Format:** external exam (mock-exam prep)
**Media note:** the heaviest domain — produce **2 videos** (one per product family split below).

## 📥 Sources to load into NotebookLM
- The d2 lesson bodies (from `public/content/google/gen-ai-leader/d2-google-offerings.json`)
- Official exam guide PDF — the "Google Cloud's gen AI offerings" section:
  https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- The live Google Cloud product pages the d2 resources[] cite — **branding is mid-refresh
  (Agent Platform / Agent Studio renames); use exactly the names the current guide uses**

## 🎬 Video 1 (~8 min) — models & apps — NotebookLM → Video → Customize
```
Audience: a business leader studying for the Generative AI Leader exam. Explain plainly first, then
precisely. Cover ONLY the first half of D2 (the exam's heaviest section at 35%): Google's gen-AI
model and app layer as the CURRENT guide names it — the Gemini model family and where leaders meet
it (the Gemini app, Workspace integration), NotebookLM for grounded research, and how Google
positions "your data + their models." The exam skill is MATCHING: given a business need, pick the
right Google offering. ~8 minutes: open with why D2 earns the most study time, run three
match-the-need drills, flag the 2–3 distractors (mixing up consumer Gemini vs enterprise surfaces;
assuming every AI need requires the full cloud platform), close with "on the exam, remember…".
Stay strictly grounded in the sources; use ONLY the guide's current product names — no legacy
branding.
```

## 🎬 Video 2 (~8 min) — the builder platform & agents — NotebookLM → Video → Customize
```
Same audience and rules. Cover ONLY the second half of D2: the builder layer as the CURRENT guide
names it — the Agent Platform / Agent Studio tooling for organisations that build ("Vertex AI" and
"Agent Builder" appear nowhere in the current guide — do not use them) (model access incl. partner and
open models, grounding options, and the agent-building surfaces the guide names after its branding
update). Leaders aren't tested on building; they're tested on knowing WHICH layer answers which
need and WHEN an organisation graduates from ready-made apps to the platform. ~8 minutes: three
graduate-or-not decision drills, the top distractors (thinking agents require custom models;
confusing grounding with fine-tuning — that contrast is Module 03's), close with the two-line map
of Google's stack a candidate should hold in their head. Current names only, per the live guide.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone, business-leader listener. Teach the full D2 domain: Google's gen-AI stack
top to bottom as the current exam guide presents it — the ready-made layer (Gemini app, Workspace,
NotebookLM), the builder layer (model garden breadth incl. partner/open models, grounding, agent
tooling under its current names), and the decision logic between them. Drill the matching skill
with need→offering pairs across industries. Flag that branding changed recently and the exam tests
CURRENT names. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of D2: the two-layer map of Google's stack, five need→offering matches worth knowing
cold, the renamed products (current name only, one line each), and the top distractors. For the
week before the exam.
```

## 🤖 Apply it in Automatos
Automatos is itself a "builder layer" story the learner already knows: models via BYOK (including
Google's), grounding via the knowledge base, agents with tools. Map each D2 concept to the Automatos
surface they've touched — the concepts transfer 1:1 even though the exam asks them in Google's
vocabulary.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate BOTH Video Overviews (tune each to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

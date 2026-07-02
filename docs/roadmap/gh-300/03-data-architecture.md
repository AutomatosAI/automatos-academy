# GH-300 · Module 03 — Understand Copilot Data & Architecture

**Exam tie-in:** D3 Understand Data & Architecture (13%)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD)
- https://docs.github.com/en/copilot/reference/ai-models/supported-models
- https://docs.github.com/en/site-policy/privacy-policies/github-copilot-business-privacy-statement
- The GH-300 study-guide task statements for this domain

## 🎬 Video Overview prompt (~8 min) — How Copilot handles your data & which model runs
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: how Copilot handles your data and its architecture —
what prompt/context data leaves the IDE, the proxy/filtering path, retention, and the model options
(which LLMs back Copilot, how to switch models, and their trade-offs), plus Copilot's limitations. Map
every point to what a candidate must DECIDE on the exam: given a data-handling or model-choice scenario,
what actually happens and which model to pick. ~8 minutes: open with why this 13% domain is easy marks
if you know the flow, one worked example (trace a prompt from keystroke to suggestion and back), the top
2–3 distractors (assuming code is retained/trained-on when the Business terms say otherwise; confusing
context sent with code stored; picking a model on vibes not trade-offs), and a one-line "on the exam,
remember…". Stay strictly grounded in the provided sources; do not state data-handling facts that
aren't in them.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D3 "Data & Architecture" domain for GH-300: the data
flow (what leaves the IDE, proxy/filtering, retention per the Business privacy statement), the model
options and how/why to switch, and Copilot's stated limitations. For each, make the exam decision
explicit — what happens to the data, and which model fits the task. Ground strictly in the sources;
the privacy statement is the authority for data-handling questions.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D3 facts: the prompt/context data flow, retention under the Business
terms, model selection and trade-offs, and Copilot's limitations. Call out the top distractors
(context-sent vs code-stored; model choice by trade-off not preference). Grounded in the sources. For
the week before the exam.
```

## 🤖 Apply it in Automatos
Show the learner how they'd reason about this in Automatos — e.g. compose an agent that names which
model backs it and what context it sends, so the learner sees the same data-flow and model-selection
decisions Copilot exposes. The parallel: you always know what leaves the boundary and which model runs.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

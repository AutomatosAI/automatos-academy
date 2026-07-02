# CCA-F · Module 00 — Blueprint, scoring & exam strategy

**Exam tie-in:** the whole blueprint — D1 Agentic Architectures (27%) · D2 Tools & MCP (18%) ·
D3 Agent Ops & Claude Code (20%) · D4 Prompt Engineering (20%) · D5 Context & Reliability (15%)  ·
**Format:** external exam (Anthropic-issued; academy = mock-exam prep)

## 📥 Sources to load into NotebookLM
- The CCA-F **Exam Guide** (official Anthropic) — the five domains, exact weights (27/18/20/20/15),
  scoring (720/1000), the six exam scenarios, and every task statement
- The track summary and `exam` block from `public/content/anthropic/cca-f/track.json`
  (60 questions · 120 min · pass 720/1000 · proctored, closed-book · 4 of 6 scenarios presented)
- The Anthropic Academy course catalog (the closest thing to official study material)
- https://platform.claude.com/docs (primary source for every technical claim on this track)
- The community study guide (daronyondem/claude-architect-exam-guide) — to cross-check coverage, not to memorise answers

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a smart professional about to sit the Anthropic CCA-F — Claude Certified Architect,
Foundations. They can build with the Claude API but haven't taken this exam. Explain plainly first,
then precisely. Cover ONLY the exam itself, not the technical content: what CCA-F certifies, the exam
format (60 single-answer multiple-choice questions, 120 minutes, proctored and closed-book, scored
100–1000 with 720 to pass), and the domain blueprint — Agentic Architectures 27%, Tools & MCP 18%,
Agent Ops & Claude Code 20%, Prompt Engineering 20%, Context & Reliability 15%. Explain the scenario
mechanic: six exam scenarios exist and four are presented, each a multi-step design brief where you
pick the best architecture under real constraints. Turn the weights into a study plan: D1 is the
heaviest and the root of most scenario questions, so weight prep toward architecture judgement — when
to build an agent vs a workflow vs a single call. Give a scoring-strategy line (single-answer, so no
partial credit; there is a passing bar, so bank the high-weight domains). ~8 minutes: open with what
the credential is worth and who it's for, walk the blueprint domain by domain with the one decision
each tests, name the top exam-day mistakes (over-building an agent when a workflow fits; misreading a
scenario's constraint), and close with a one-line "on exam day, remember…". Stay strictly grounded in
the provided sources; do not invent domains, weights, or question counts.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. This is the orientation episode for the Anthropic CCA-F exam.
Walk the full blueprint and how to prepare for it: the five domains and their weights (D1 Agentic
Architectures 27%, D2 Tools & MCP 18%, D3 Agent Ops & Claude Code 20%, D4 Prompt Engineering 20%,
D5 Context & Reliability 15%), what each domain tests at a high level, and the exam mechanics — 60
single-answer questions, 120 minutes, proctored closed-book, scored 100–1000 with 720 to pass, and
the four-of-six scenario design briefs. Make the study strategy explicit: sequence the domains by
weight, treat D1 architecture-tier judgement as the spine because scenarios lean on it, and use the
official Academy catalog plus platform.claude.com docs as the ground truth when a community guide
disagrees. For each domain, state the single most important decision a candidate must be able to make.
Ground strictly in the sources; when they conflict, prefer the official Exam Guide and docs.
```

## 🎧 Brief (revise, ~8–12 min)
```
Tight pre-exam recap of the CCA-F blueprint: the five domains and exact weights (27/18/20/20/15),
the format (60 single-answer MCQs, 120 min, 720/1000 to pass, four-of-six scenarios), and the one
decision each domain tests. Remind the listener where the marks are (D1 heaviest) and the top
exam-day traps (over-building an agent; missing a scenario constraint). Grounded in the sources.
For the week before the exam.
```

## 🤖 Apply it in Automatos
Automatos *is* the reference architecture behind this blueprint — every CCA-F domain maps to something
you can point at in the platform. Show the learner the map: D1's tier decision is the platform's
single-call vs recipe (workflow) vs mission (agent) choice; D2's tools/MCP is how the platform's
agents get their toolsets and Composio/MCP connections; D3's harness config is Claude Code operating
the repo; D4's prompting is how recipe steps and system context are composed; D5's context/reliability
is memory, compaction, and honest status in long missions. Frame the whole track as "learn the exam,
then go see it running in Automatos."

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register alongside the overview MP4s in the track `videos[]`
- [ ] Tick this module off in the track README

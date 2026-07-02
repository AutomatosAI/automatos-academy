# GH-300 · Module 01 — Use GitHub Copilot Features

**Exam tie-in:** D1 Use Copilot Features (30% — the heaviest domain)  ·  **Format:** external exam (mock-exam prep)

This is where the marks are. The domain is broad, so it gets **three videos** — completions & mode
choice, agents & Plan Mode, then context-at-scale. Currency rule applies: **Ask / Edit / Agent modes +
Plan Mode, the coding agent (opens a PR, not a push), MCP, Copilot CLI, Spaces, Spark, Code Review**.
**Edit Mode** is on the blueprint but the product folded it into Agent in 2026 — teach it as
exam-relevant with that caveat.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD)
- https://docs.github.com/en/copilot (docs root — the primary source for every feature claim)
- https://docs.github.com/en/copilot/get-started/features
- https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli
- https://docs.github.com/en/copilot/concepts/context/mcp
- https://docs.github.com/en/copilot/concepts/context/spaces
- https://docs.github.com/en/copilot/concepts/spark
- https://docs.github.com/en/copilot/concepts/agents/code-review
- The GH-300 study-guide task statements for this domain

## 🎬 Video Overview prompt 1 of 3 (~8 min) — Suggestions, chat & choosing the right mode
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: inline code suggestions (accept/dismiss/partial),
Copilot Chat, and choosing the right interaction for a task — inline completions vs chat vs the
Ask / Edit / Agent modes plus Plan Mode. Include feature availability by IDE and plan. Map every point
to what a candidate must DECIDE on the exam. ~8 minutes: open with why picking the right surface is a
recurring exam decision, give one worked example (same task, wrong surface vs right surface), call out
the top 2–3 distractors candidates get wrong (chat when an inline completion is enough; Ask vs Edit),
and close with a one-line "on the exam, remember…". Stay strictly grounded in the provided sources;
do not invent feature names.
```

## 🎬 Video Overview prompt 2 of 3 (~8 min) — Agents: Agent Mode, coding/cloud agent & Plan Mode
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: delegating multi-step work to Copilot agents —
Agent Mode in the IDE, the coding/cloud agent that works autonomously and OPENS A PULL REQUEST (it does
not push directly), and Plan Mode (plan-then-execute before code). Contrast this with inline
completions. Cover Edit Mode as exam-relevant — the blueprint lists it even though the product folded
it into Agent — a scoped, review-first multi-file edit. Map every point to an exam decision: when to
pick an agent over inline, and what the agent's output actually is. ~8 minutes: open with why
delegation is tested, one worked example (a multi-file change routed through the coding agent to a
reviewable PR), the top 2–3 distractors (agent output is a PR you review, NOT an unattended push;
Edit vs Agent), and a one-line "on the exam, remember…". Stay strictly grounded in the sources; do not
invent feature names.
```

## 🎬 Video Overview prompt 3 of 3 (~8 min) — Context & scale: MCP, Sub-Agents, Spaces, Spark, Code Review
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY how Copilot extends and scales: the Model Context
Protocol (MCP) for feeding context/tools; Sub-Agents for delegating parts of a task; Spaces for
curating and sharing context with a team; Spark for generating full-stack apps from natural language;
and the Copilot Code Review agent (effort levels, full-context PR review) plus AI PR summaries. Also
name the Copilot CLI as the terminal-native agent. Map each to an exam decision — when MCP vs Spaces
helps, when to reach for Spark, what the code-review agent produces. ~8 minutes: open with why these
Jan-2026 features are newly in scope, one worked example (adding an MCP server so Copilot can use a
tool it otherwise couldn't), the top 2–3 distractors (MCP is a context/tool standard, not a model;
Spaces shares context, it is not a repo), and a one-line "on the exam, remember…". Stay strictly
grounded in the sources; do not invent feature names.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the whole D1 "Use Copilot Features" domain for GH-300:
inline suggestions and chat; the Ask/Edit/Agent modes and Plan Mode; the coding/cloud agent (opens a
PR, not a push); the Copilot CLI; MCP; Sub-Agents; Spaces; Spark; Code Review and PR summaries; and
org-wide management/policies. For each, make the exam decision explicit — which surface, and what its
output is. Cover Edit Mode as exam-relevant with the product-caveat. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D1 distinctions and the top distractors: inline vs chat vs Agent; Edit vs
Agent; the coding agent's output is a reviewable PR, not a direct push; MCP feeds context/tools (not a
model); Spaces shares context (not a repo); Spark generates apps; the code-review agent reviews PRs.
One line each. Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Show the learner how they'd use these ideas in Automatos — e.g. compose an agent + skills to take a
multi-step task, plan it, and produce a reviewable pull request rather than an unattended push,
mirroring Copilot's coding-agent + Plan-Mode flow. Point out the parallel: in both, you delegate a
bounded goal and review the diff, you don't hand over the keys.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (or one per video for this heavy domain)
- [ ] Generate all three Video Overviews (tune each to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

# GH-300 · Module 05 — Improve Developer Productivity

**Exam tie-in:** D5 Improve Developer Productivity (13%)  ·  **Format:** external exam (mock-exam prep)

A hands-on domain across the SDLC, so it gets **two videos** — generate/refactor/document, then
tests/security/performance.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD)
- https://learn.microsoft.com/en-us/training/modules/develop-unit-tests-using-github-copilot-tools/
- https://docs.github.com/en/copilot/get-started/features
- https://docs.github.com/en/copilot/concepts/agents/code-review
- The GH-300 study-guide task statements for this domain

## 🎬 Video Overview prompt 1 of 2 (~8 min) — Generate, refactor & document
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: using Copilot across the SDLC to generate code,
refactor safely, and document — generation patterns from a spec/comment, refactoring while preserving
behavior, generating docs/comments, and modernizing legacy code. Map every point to what a candidate
must DECIDE on the exam: which Copilot capability fits the productivity task in the scenario. ~8
minutes: open with why this is tested as real workflow, one worked example (turn a described function
into code, then refactor and document it), the top 2–3 distractors (assuming a refactor is behavior-safe
without tests; picking generation when the task is documentation), and a one-line "on the exam,
remember…". Stay strictly grounded in the provided sources; do not invent capabilities.
```

## 🎬 Video Overview prompt 2 of 2 (~8 min) — Tests, security & performance
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: using Copilot to generate unit and integration
tests, to review code for vulnerabilities, and to improve performance — the test-generation workflow,
reviewing for security issues (with the code-review agent where it fits), and performance improvements.
Map every point to an exam decision: which Copilot action produces the tests/coverage/fix the scenario
needs. ~8 minutes: open with why test-gen and security are productivity wins the exam probes, one
worked example (generate tests for a function, then use review to catch a vulnerability), the top 2–3
distractors (assuming generated tests are sufficient without review; conflating the code-review agent
with a security scanner), and a one-line "on the exam, remember…". Stay strictly grounded in the
provided sources; do not invent capabilities.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D5 "Improve Developer Productivity" domain for GH-300:
generation patterns, safe refactoring, documentation, legacy modernization, the unit/integration
test-generation workflow, reviewing for vulnerabilities (incl. the code-review agent), and performance
improvements. For each, make the exam decision explicit — which capability fits the task. Ground
strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D5 workflows: generate, refactor (verify with tests), document, modernize,
generate tests, review for vulnerabilities, improve performance. Call out the top distractors (refactor
safety needs tests; review ≠ full security scan). Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Show the learner how they'd get the same SDLC lift in Automatos — e.g. compose an agent + skills that
generate tests for a change and review the diff before it's accepted, mirroring Copilot's
test-generation + code-review flow. The parallel: productivity comes from delegating the grunt work
*and* keeping the verification gate.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate both Video Overviews (tune each to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

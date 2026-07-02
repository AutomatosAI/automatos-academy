# GH-500 · Module 04 — Code Security (CodeQL)

**Exam tie-in:** D4 Configure and use Code Security / CodeQL (0.13)  ·  **Format:** external exam (mock-exam prep)

> **July-2026 name:** this is **Code Security** — formerly *Code Scanning with CodeQL*. CodeQL is the engine inside it; lead with Code Security.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD-S0-GH500)
- https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning
- https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql
- https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
- https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/about-code-scanning-alerts
- MS Learn — GitHub Advanced Security **Part 2** learning path — https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/
- The GH-500 study-guide task statements for **d4 — Configure and use Code Security (CodeQL)** (`https://aka.ms/GH500-StudyGuide`)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional studying for the GH-500 GitHub Advanced Security exam — capable but not an
expert here. Explain plainly first, then precisely. Cover ONLY Code Security: CodeQL as GitHub's built-in
static-analysis engine vs bringing a THIRD-PARTY scanner whose results you upload, SARIF as the interchange
format that lets any tool's findings appear as code-scanning alerts, enabling scanning via GitHub Actions
(default setup) vs via external CI, and triaging alerts — reading the dataflow path from source to sink,
dismissing with a reason, and autofix suggestions. CRITICAL July-2026 currency: call the suite Code
Security (not "code scanning with CodeQL" as the whole thing) and treat autofix as current, in-scope
material. Map every point to what a candidate must DECIDE on the exam: CodeQL vs third-party+SARIF, default
setup vs external CI, and what a dataflow alert is actually telling you. ~8 minutes: open with why
static-analysis-in-the-pipeline matters on the exam, one worked example (an injection flaw found by CodeQL,
its dataflow path, then autofix), the top 2-3 distractors (CodeQL vs SARIF-upload; default vs external
setup; dismiss-reason semantics), and a one-line "on the exam, remember...". Stay strictly grounded in the
provided sources; do not invent query names or feature names.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D4 "Code Security (CodeQL)" domain for the GH-500 exam:
CodeQL as the native static-analysis engine versus third-party analysis tools whose output you ingest;
SARIF as the standard format that renders any tool's results as code-scanning alerts; enabling scanning
through GitHub Actions with default setup versus wiring it into external CI; and triage — following the
dataflow path from source to sink, choosing the right dismissal reason (false positive / won't fix / used
in tests), autofix suggestions, and custom query suites for tuning coverage. For each, make the exam
decision explicit. Use the current name Code Security and flag "code scanning with CodeQL" as the legacy
umbrella name; CodeQL is the engine, not the suite. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D4 distinctions: CodeQL vs third-party + SARIF ingestion, default setup vs
external CI, dataflow-based triage, dismissal reasons, autofix, and custom query suites. Top distractors:
CodeQL-the-engine vs Code-Security-the-suite, SARIF's role, and default vs external enablement. Grounded
in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Give the **SENTINEL security agent** in Automatos a code-scan skill that mirrors Code Security: it runs a
static check on changed code, presents each finding as a dataflow-style source-to-sink explanation (like a
CodeQL alert), proposes an autofix, and — because it speaks SARIF — can also fold in a third-party
scanner's results into one alert list. Same engine-vs-format-vs-triage model the exam tests, as an
Automatos agent step.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

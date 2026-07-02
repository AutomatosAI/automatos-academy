# GH-500 · Module 01 — GitHub Security Suites, Features & Ecosystem

**Exam tie-in:** D1 Describe GitHub Security suites, features & ecosystem (0.18)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD-S0-GH500)
- https://docs.github.com/en/code-security/getting-started/github-security-features
- https://docs.github.com/en/code-security/security-overview/about-security-overview
- https://docs.github.com/en/code-security/getting-started/securing-your-organization
- MS Learn — GitHub Advanced Security **Part 1** learning path — https://learn.microsoft.com/en-us/training/paths/github-advanced-security/
- The GH-500 study-guide task statements for **d1 — Describe GitHub Security suites, features & ecosystem** (`https://aka.ms/GH500-StudyGuide`)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional studying for the GH-500 GitHub Advanced Security exam — capable but not an
expert here. Explain plainly first, then precisely. Cover ONLY: the three GitHub security suites and how
they relate — Secret Protection, Supply Chain Security, and Code Security — plus Security Overview as the
cross-cutting reporting surface, and where each fits in a secure SDLC (prevention-first at the developer's
keyboard vs gate-based in the pipeline). CRITICAL July-2026 currency: use the CURRENT suite names only —
Secret Protection (not "secret scanning"), Supply Chain Security (not "Dependabot/Dependency Review"),
Code Security (not "code scanning with CodeQL"); name the legacy term once so candidates can map it, then
drop it. Map every point to what a candidate must DECIDE on the exam: which suite covers which risk, what
is available on public repos for free vs what needs a GHAS/enterprise entitlement, and prevention vs gate.
~8 minutes: open with why the suite-naming and where-it-runs distinctions matter on the exam, one worked
example (a repo adopting all three suites end to end), the top 2-3 distractors candidates get wrong
(mixing up which suite owns a feature; assuming everything is free; legacy names), and a one-line "on the
exam, remember...". Stay strictly grounded in the provided sources; do not invent feature names.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D1 "GitHub Security suites, features & ecosystem" domain for
the GH-500 exam: the three suites (Secret Protection, Supply Chain Security, Code Security) and exactly
which features live in each; Security Overview as the org-wide reporting and coverage surface; public-repo
free availability vs the GHAS/enterprise entitlement; and the secure SDLC end to end — prevention-first
controls at commit/push vs gate-based controls in CI and pull requests. For each suite, make the exam
decision explicit: given a risk, which suite and which feature address it, and where in the lifecycle it
acts. Stress the July-2026 renames and why mixing legacy and current names is the classic trap. Ground
strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D1 distinctions: the three suites and their headline features, Security
Overview's role, public-repo-free vs entitlement-gated, and prevention-first vs gate-based. Call out the
top distractors — which suite owns which feature, and the legacy-vs-current name mapping. Grounded in the
sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Show the learner how a **SENTINEL security agent** in Automatos mirrors the three-suite model: give it
three security skills — secret-check, dependency-check, and code-scan — so one agent covers the same
surface GHAS splits across Secret Protection, Supply Chain Security, and Code Security, with a single
"security overview" report rolling the findings up. Same mental model as the exam, built in Automatos.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

# GH-500 · Module 00 — Overview & Exam Strategy

**Exam tie-in:** the whole blueprint — d1 Security suites (0.18) · d2 Secret Protection (0.18) · d3 Supply Chain Security (0.18) · d4 Code Security / CodeQL (0.13) · d5 Security operations (0.18) · d6 Administration (0.15)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The GH-500 study guide (skills measured, as of **July 2026**) — `https://aka.ms/GH500-StudyGuide`
- GitHub Advanced Security (GH-500) certification page — `https://learn.microsoft.com/en-us/credentials/certifications/github-advanced-security/`
- The GH-500 practice assessment / exam sandbox — `https://GHCertDemo.starttest.com`
- MS Learn — GitHub Advanced Security **Part 1** learning path — `https://learn.microsoft.com/en-us/training/paths/github-advanced-security/`
- MS Learn — GitHub Advanced Security **Part 2** learning path — `https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/`
- GHAS overview docs — `https://docs.github.com/en/code-security/getting-started/github-security-features`

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional about to book the GH-500 GitHub Advanced Security exam — an administrator,
developer, DevOps engineer, or solution architect, capable but new to sitting this specific exam.
Explain plainly first, then precisely. Cover ONLY exam strategy: the six skills-measured domains and
their approximate weights (Security suites ~18%, Secret Protection ~18%, Supply Chain Security ~18%,
Code Security/CodeQL ~13%, Security operations ~18%, Administration ~15%), how the exam is scored
(100 minutes, 700/1000 to pass, ~60 scored questions, proctored via Pearson VUE), and how to sit it.
CRITICAL July-2026 currency: use the CURRENT feature names throughout — Secret Protection (not "secret
scanning"), Supply Chain Security (not "Dependabot/Dependency Review"), Code Security (not "code
scanning with CodeQL") — and flag that legacy names are the top way candidates misread questions.
~8 minutes: open with why the naming refresh matters on the exam, walk the weight map so the candidate
knows where to spend study time (the four ~18% domains carry it), name the top 2-3 traps (legacy names,
confusing the three suites, assuming a feature is on by default), and close with a one-line "on the exam,
remember...". Stay strictly grounded in the provided sources; do not invent domain titles or weights.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Give a strategic orientation to the GH-500 GitHub Advanced Security
exam: walk all six domains in blueprint order and explain what each one is really testing — d1 the three
suites and where they sit in a secure SDLC, d2 Secret Protection and push protection, d3 Supply Chain
Security (dependency graph, SBOM, EPSS), d4 Code Security with CodeQL, d5 security operations and
prioritized remediation, d6 administration across enterprise/org/repo. For each domain make the exam
decision explicit (what a candidate must choose or configure). Stress the July-2026 renames and why
mixing legacy and current names is a trap. Explain the scoring (100 min, 700/1000, Pearson VUE) and a
study order that front-loads the four heaviest ~18% domains. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap for the week before the GH-500 exam: the six domains and their weights, the current feature
names vs the legacy ones they replaced (Secret Protection, Supply Chain Security, Code Security), the
scoring facts (100 min, 700/1000, ~60 questions, Pearson VUE), and the top exam traps. Grounded in the
sources. No new material — pure revision.
```

## 🤖 Apply it in Automatos
Frame the whole track's Automatos thread here: introduce a **SENTINEL security agent** that runs
GHAS-style checks inside Automatos — it will reappear in every module doing the domain's job (scanning
for leaked secrets, reviewing dependencies, triaging code-scanning alerts, prioritizing by severity).
In this overview, show the learner the shape: compose a SENTINEL agent + security skills that mirror the
six GHAS domains, so the exam concepts and the Automatos build stay one-to-one.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

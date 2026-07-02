# GH-300 · Module 06 — Configure Privacy, Content Exclusions & Safeguards

**Exam tie-in:** D6 Configure Privacy, Content Exclusions & Safeguards (13%)  ·  **Format:** external exam (mock-exam prep)

A governance/trade-off domain, so add a **Debate** audio alongside the Deep Dive and Brief.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD)
- https://docs.github.com/en/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot
- https://docs.github.com/en/site-policy/privacy-policies/github-copilot-business-privacy-statement
- The GH-300 study-guide task statements for this domain

## 🎬 Video Overview prompt (~8 min) — Content exclusions, privacy settings & auditing
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: configuring privacy, content exclusions, and
safeguards — excluding files/repos from Copilot and how that affects suggestions and chat, duplication
(matching-public-code) detection, security/vulnerability warnings, and auditing these settings
org-wide. Map every point to what a candidate must DECIDE on the exam: given a requirement (hide this
repo, block public-code matches, audit the org), which setting achieves it and at what scope. ~8
minutes: open with why safeguards are 13% of easy, precise marks, one worked example (exclude a
sensitive path and confirm Copilot no longer uses it), the top 2–3 distractors (assuming exclusion
scope is per-user when it's org/repo; confusing duplication detection with content exclusion), and a
one-line "on the exam, remember…". Stay strictly grounded in the provided sources; do not invent
settings.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D6 "Privacy, Content Exclusions & Safeguards" domain for
GH-300: content exclusion (files/repos and its effect on suggestions/chat), duplication detection,
security warnings, and org-wide auditing of these controls. For each, make the exam decision explicit —
which setting meets the requirement and at what scope. Ground strictly in the sources; the Business
privacy statement is the authority for data-handling.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D6 controls: content exclusion and its scope/effect, duplication
detection, security warnings, and how to audit them across an org. Call out the top distractors
(exclusion scope; duplication ≠ exclusion). Grounded in the sources. For the week before the exam.
```

## 🎧 Audio — Debate (trade-off topic) — NotebookLM → Audio → Customize
```
Two hosts, expert level, argue a real governance tension: "how much do you lock Copilot down before
you've thrown away its value?" One host presses privacy, content exclusion, and duplication controls;
the other presses developer velocity and false positives. Keep it grounded in the sources so the
listener hears both sides of the safeguards-vs-productivity trade-off the exam frames.
```

## 🤖 Apply it in Automatos
Show the learner how they'd apply the same safeguards thinking in Automatos — e.g. compose an agent
whose skills are scoped so it can't touch excluded content, and reason about what's auditable,
mirroring Copilot's content-exclusion + org-audit controls. The parallel: you decide what the tool can
see, and you can audit it.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio, plus the Debate
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

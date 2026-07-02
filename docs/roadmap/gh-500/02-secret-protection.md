# GH-500 · Module 02 — Secret Protection

**Exam tie-in:** D2 Configure and use Secret Protection (0.18)  ·  **Format:** external exam (mock-exam prep)

> **July-2026 name:** this is **Secret Protection** — formerly *secret scanning*. Lead with the current name.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD-S0-GH500)
- https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning
- https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
- https://docs.github.com/en/code-security/secret-scanning/managing-alerts-from-secret-scanning/managing-alerts-from-secret-scanning
- https://docs.github.com/en/code-security/secret-scanning/using-advanced-secret-scanning-and-push-protection-features/custom-patterns/about-custom-patterns
- MS Learn — GitHub Advanced Security **Part 1** learning path — https://learn.microsoft.com/en-us/training/paths/github-advanced-security/
- The GH-500 study-guide task statements for **d2 — Configure and use Secret Protection** (`https://aka.ms/GH500-StudyGuide`)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional studying for the GH-500 GitHub Advanced Security exam — capable but not an
expert here. Explain plainly first, then precisely. Cover ONLY Secret Protection: enabling it at repo and
org level, PUSH PROTECTION (blocking a secret before it ever lands in history) vs detection of secrets
already committed, validity checks and the resulting prioritized alerts, the alert lifecycle (open →
resolved/revoked/false-positive), custom patterns, and delegated bypass (who may push past a block and
how that request is reviewed). CRITICAL July-2026 currency: call this feature Secret Protection, not
"secret scanning" — name the legacy term once, then use the current one. Map every point to what a
candidate must DECIDE on the exam: when push protection blocks vs merely alerts, who can bypass and what
the reviewer sees, and how validity ("is this secret still live?") drives prioritization. ~8 minutes:
open with why prevention-at-push matters on the exam, one worked example (a developer hits a push block
and requests bypass), the top 2-3 distractors (push protection vs detection; bypass roles; that a
resolved alert isn't the same as a rotated secret), and a one-line "on the exam, remember...". Stay
strictly grounded in the provided sources; do not invent feature names.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D2 "Configure and use Secret Protection" domain for the
GH-500 exam: enabling Secret Protection at repo and org scope; push protection as the prevention-first
control that blocks a commit containing a detected secret, versus scanning that surfaces secrets already
in history; validity checks that mark a secret active/inactive and drive prioritized alerts; the alert
lifecycle and what "resolved" does and does NOT mean (an alert can be closed without the credential being
rotated); custom patterns for org-specific secrets; and delegated bypass — who is allowed to push past a
block and how bypass requests are reviewed and audited. For each, make the exam decision explicit. Use the
current name Secret Protection throughout and flag the legacy "secret scanning" as a naming trap. Ground
strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D2 distinctions: push protection vs detection of already-committed secrets,
validity-driven prioritized alerts, the alert lifecycle, custom patterns, and delegated bypass roles.
Top distractors: bypass permissions, resolved-alert vs rotated-secret, and the Secret Protection vs
"secret scanning" name. Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Give the **SENTINEL security agent** in Automatos a secret-check skill that mirrors Secret Protection: it
scans a diff before merge (push-protection-style prevention), flags a suspected live credential, and — if
the author asks to proceed — routes a bypass request to an approver instead of silently allowing it. Same
prevention-plus-delegated-bypass flow the exam tests, running as an Automatos agent step.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

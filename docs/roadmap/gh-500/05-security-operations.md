# GH-500 · Module 05 — Security Operations (Prioritization & Remediation)

**Exam tie-in:** D5 Security operations — prioritization & remediation (0.18)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD-S0-GH500)
- https://docs.github.com/en/code-security/security-overview/about-security-overview
- https://docs.github.com/en/code-security/securing-your-organization/fixing-security-alerts-at-scale/about-security-campaigns
- https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/about-repository-security-advisories
- https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
- MS Learn — GitHub Advanced Security **Part 2** learning path — https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/
- The GH-500 study-guide task statements for **d5 — Security operations, prioritization & remediation** (`https://aka.ms/GH500-StudyGuide`)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional studying for the GH-500 GitHub Advanced Security exam — capable but not an
expert here. Explain plainly first, then precisely. Cover ONLY security operations: reading CVEs, CWEs,
and GitHub Security Advisories; using severity (CVSS) together with exploit-likelihood (EPSS) to PRIORITIZE
which alerts to fix first; Security Overview as the org-wide surface for coverage and open-risk reporting;
security campaigns for campaign-based bulk remediation across many repos; and the shift-left, cross-suite
governance mindset that ties Secret Protection, Supply Chain Security, and Code Security together. Map every
point to what a candidate must DECIDE on the exam: given a pile of alerts, which to fix first and why
(severity vs likelihood vs reachability), when a campaign beats fixing repo-by-repo, and where advisories
fit. July-2026 currency: refer to the three suites by their current names and treat EPSS and security
campaigns as in-scope. ~8 minutes: open with why prioritization matters on the exam (you can't fix
everything), one worked example (triaging a mixed alert queue by EPSS+severity, then launching a campaign),
the top 2-3 distractors (CVSS vs EPSS; CVE vs CWE vs advisory; campaign vs one-off fix), and a one-line
"on the exam, remember...". Stay strictly grounded in the provided sources; do not invent scoring schemes.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D5 "Security operations — prioritization & remediation"
domain for the GH-500 exam: the vocabulary and how it differs — CVE (a specific vulnerability), CWE (the
weakness class), and a GitHub Security Advisory; combining CVSS severity with EPSS exploit-likelihood (and
reachability) to decide fix order; Security Overview as the org-wide reporting and coverage surface;
security campaigns for coordinated bulk remediation across repositories; and shift-left, cross-suite
governance that treats Secret Protection, Supply Chain Security, and Code Security findings as one risk
picture. For each, make the exam decision explicit — especially "what do I fix first and how do I justify
it." Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D5 distinctions: CVE vs CWE vs advisory, CVSS severity vs EPSS likelihood for
prioritization, Security Overview reporting, campaign-based bulk remediation, and shift-left cross-suite
governance. Top distractors: severity vs likelihood, CVE vs CWE, and campaign vs one-off fix. Grounded in
the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Give the **SENTINEL security agent** in Automatos a prioritize-and-remediate skill that mirrors security
operations: it pulls findings from its secret / dependency / code-scan skills into one queue, ranks them by
EPSS likelihood plus CVSS severity (not first-in-first-out), reports an org-wide risk summary
(Security-Overview-style), and can launch a campaign to fix a class of issues across repos. Same
triage-then-campaign flow the exam tests, as an Automatos agent step.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

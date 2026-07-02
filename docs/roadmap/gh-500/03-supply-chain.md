# GH-500 · Module 03 — Supply Chain Security

**Exam tie-in:** D3 Configure and use supply chain security (0.18)  ·  **Format:** external exam (mock-exam prep)

> **July-2026 name:** this is **Supply Chain Security** — formerly *Dependabot / Dependency Review*. Lead with the current name.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD-S0-GH500)
- https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-the-dependency-graph
- https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/exporting-a-software-bill-of-materials-for-your-repository
- https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
- https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review
- https://docs.github.com/en/code-security/securing-your-organization/fixing-security-alerts-at-scale/about-security-campaigns
- MS Learn — GitHub Advanced Security **Part 2** learning path — https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/
- The GH-500 study-guide task statements for **d3 — Configure and use supply chain security** (`https://aka.ms/GH500-StudyGuide`)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional studying for the GH-500 GitHub Advanced Security exam — capable but not an
expert here. Explain plainly first, then precisely. Cover ONLY Supply Chain Security: the dependency graph
and SBOM export (the software bill of materials you can generate for a repo), Dependabot alerts and
Dependabot version/security updates, EPSS scoring as the "how likely is this to be exploited" signal that
drives prioritization, Dependency Review as the pre-merge gate that shows what a pull request adds/changes
in dependencies, and grouping / auto-dismiss plus security campaigns for fixing at scale. CRITICAL
July-2026 currency: call the suite Supply Chain Security, not "Dependabot/Dependency Review" as the
umbrella term (Dependabot is a feature inside it) — and treat SBOM, EPSS, and security campaigns as
current, in-scope material. Map every point to what a candidate must DECIDE on the exam: alerts vs updates,
when Dependency Review blocks a merge, and how EPSS (likelihood) complements CVSS severity for triage.
~8 minutes: open with why supply-chain visibility matters on the exam, one worked example (a vulnerable
dependency caught by Dependency Review pre-merge, then fixed via a campaign), the top 2-3 distractors
(alerts vs updates; EPSS vs CVSS; SBOM is an export not a scan), and a one-line "on the exam,
remember...". Stay strictly grounded in the provided sources; do not invent feature names.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D3 "Supply chain security" domain for the GH-500 exam: the
dependency graph as the foundation; SBOM export (generating a software bill of materials for a repo);
Dependabot ALERTS (you have a known-vulnerable dependency) versus Dependabot UPDATES (automated PRs that
bump versions), and how the two differ; EPSS scoring as an exploit-likelihood signal that sharpens
prioritization alongside CVSS severity; Dependency Review as the pre-merge gate that surfaces dependency
changes in a pull request before they land; and grouping, auto-dismiss, and security campaigns for
remediating across many repos at once. For each, make the exam decision explicit. Use the current name
Supply Chain Security and flag "Dependabot/Dependency Review" as a legacy umbrella-name trap. Ground
strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D3 distinctions: dependency graph, SBOM export, Dependabot alerts vs updates,
EPSS vs CVSS for prioritization, Dependency Review as the pre-merge gate, and grouping/auto-dismiss plus
security campaigns. Top distractors: alerts vs updates, EPSS vs CVSS, and the Supply Chain Security vs
"Dependabot/Dependency Review" naming. Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Give the **SENTINEL security agent** in Automatos a dependency-check skill that mirrors Supply Chain
Security: on a pull request it reads the changed dependencies (Dependency-Review-style pre-merge gate),
ranks findings by exploit-likelihood (EPSS) not just raw severity, and can open a batched "fix campaign"
across repos. It can also emit an SBOM for the repo as a deliverable. Same prioritize-and-remediate flow
the exam tests, as an Automatos agent step.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

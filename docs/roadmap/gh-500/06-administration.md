# GH-500 · Module 06 — GitHub Security Suites Administration

**Exam tie-in:** D6 GitHub Security suites administration (0.15)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD-S0-GH500)
- https://docs.github.com/en/code-security/securing-your-organization/enabling-security-features-in-your-organization/about-enabling-security-features
- https://docs.github.com/en/code-security/securing-your-organization/managing-security-settings-for-your-organization/managing-security-configurations
- https://docs.github.com/en/enterprise-cloud@latest/admin/managing-code-security/managing-github-advanced-security-for-your-enterprise/about-github-advanced-security-for-github-enterprise-cloud
- https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/about-custom-organization-roles
- MS Learn — GitHub Advanced Security **Part 1** learning path — https://learn.microsoft.com/en-us/training/paths/github-advanced-security/
- The GH-500 study-guide task statements for **d6 — GitHub Security suites administration** (`https://aka.ms/GH500-StudyGuide`)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional studying for the GH-500 GitHub Advanced Security exam — capable but not an
expert here. Explain plainly first, then precisely. Cover ONLY administration: enabling the security
suites at ENTERPRISE, ORGANIZATION, and REPOSITORY scope and how settings inherit down; security
configurations and default setups applied across many repos at once; GitHub Enterprise CLOUD vs Enterprise
SERVER differences in what's available; the roles that matter (organization owner / admin,
security-manager, and developer) and what each can do; and the APIs used to configure and roll out at
scale. Map every point to what a candidate must DECIDE on the exam: at which scope to enable a feature,
what a security-manager can and cannot do versus an owner, how inheritance and overrides resolve, and
Cloud-vs-Server capability gaps. July-2026 currency: refer to the three suites by their current names
(Secret Protection, Supply Chain Security, Code Security). ~8 minutes: open with why scope and roles
matter on the exam, one worked example (rolling a security configuration across an org and handling a repo
override), the top 2-3 distractors (security-manager vs owner permissions; enterprise vs org vs repo
scope; Cloud vs Server), and a one-line "on the exam, remember...". Stay strictly grounded in the provided
sources; do not invent role names or API endpoints.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D6 "GitHub Security suites administration" domain for the
GH-500 exam: enabling the suites at enterprise, organization, and repository scope, and how configuration
inherits and where a repo can override; security configurations and default setups for turning features on
across many repos at once; GitHub Enterprise Cloud versus Enterprise Server differences in feature
availability and management; the role model — organization owner/admin versus the security-manager role
versus developers — and precisely what each role may do; and using the APIs to configure and report at
scale. For each, make the exam decision explicit — especially the scope-and-role questions the exam loves.
Use the current suite names (Secret Protection, Supply Chain Security, Code Security). Ground strictly in
the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D6 distinctions: enterprise vs org vs repo scope and inheritance, security
configurations / default setup at scale, Cloud vs Server differences, the owner vs security-manager vs
developer role split, and the management APIs. Top distractors: what a security-manager can't do, scope
inheritance/override, and Cloud vs Server gaps. Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Show how the **SENTINEL security agent** in Automatos is administered like GHAS: enable its security skills
at workspace scope so they apply to every repo/project by default, let an owner override per project, and
grant a "security-manager"-style role that can tune the checks but not change org settings. Same
scope-and-role model the exam tests, expressed as Automatos agent + workspace configuration.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

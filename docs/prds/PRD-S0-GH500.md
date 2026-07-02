# PRD — S0: GitHub Advanced Security (GH-500) track

**Status:** approved to author · **Owner:** Academy · **Last updated:** 2026-07-01
**Parent:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) · **Shape modelled on:** [PRD-COPILOT-GH300.md](./PRD-COPILOT-GH300.md)

## 1. Why

The reuse-optimal next track. GH-500 is **live-verified** and structurally near-identical to GH-300,
so the GH-300 pipeline (authoring flow, engine, MS Learn study-guide format, Pearson VUE framing)
carries over almost unchanged. It also *seeds* the S2 AI-Security track (secure-SDLC mindset).

## 2. Exam facts (verified live 2026-07-01)

Source of truth: **`https://aka.ms/GH500-StudyGuide`** (MS Learn, skills measured **as of July 2026**)
and the cert page `https://learn.microsoft.com/en-us/credentials/certifications/github-advanced-security/`.

- **Exam GH-500 — GitHub Advanced Security.** Maintained by GitHub, delivered by Microsoft.
- **100 minutes · 700/1000 to pass · proctored via Pearson VUE.** Level: Intermediate.
- Roles: administrator, developer, DevOps engineer, solution architect.
- Languages: English, Spanish, Portuguese (BR), Korean, Japanese (same set as GH-300).
- Question count not stated on the guide — assume **~60 scored** (GitHub exam-family norm; confirm on
  the cert page before launch). Exam sandbox: `https://GHCertDemo.starttest.com`.
- **Currency trap:** the July-2026 refresh **renamed the features** — teach the current names:
  *Secret Protection* (was secret scanning), *Supply Chain Security* (was Dependabot/Dependency
  Review), *Code Security* (was Code Scanning with CodeQL). New/expanded: security campaigns, EPSS
  scoring, SBOM export, push protection, delegated bypass, autofix.

## 3. Blueprint → 6 domains (official ranges → normalized weights)

Verbatim skills-measured groups + proposed weights (normalized to sum 1.0, within range). **Verify
against the live study guide before authoring** (weights read from data, so a correction is an edit).

| d | Domain (official title) | Range | Weight | slug |
|---|---|---|---|---|
| d1 | Describe GitHub Security suites, features & ecosystem | 15–20% | 0.18 | `d1-security-suites` |
| d2 | Configure and use Secret Protection | 15–20% | 0.18 | `d2-secret-protection` |
| d3 | Configure and use supply chain security | 15–20% | 0.18 | `d3-supply-chain` |
| d4 | Configure and use Code Security (CodeQL) | 10–15% | 0.13 | `d4-code-security` |
| d5 | Security operations — prioritization & remediation | 15–20% | 0.18 | `d5-security-operations` |
| d6 | GitHub Security suites administration | 10–15% | 0.15 | `d6-administration` |

Sum = 1.00 ✓. `track.exam{}`: `questionCount 60, durationMinutes 100, passingScore 700, scoreScale 1000,
proctored true`.

## 4. Content plan (per domain — match CCA-F/GH-300 depth)

Each domain: 3–4 lessons (+ 2–3 knowledge checks each), ≥18–20 original questions, 1–2 branching
scenarios, 1–2 labs, official `resources[]`, video placeholders.

- **d1 Suites & ecosystem:** the three suites and how they relate; Security Overview; public-repo vs
  enterprise availability; prevention-first vs gate-based; the secure SDLC end to end.
- **d2 Secret Protection:** enable at repo/org; push protection; validity checks & prioritized alerts;
  alert lifecycle; custom patterns; delegated bypass.
- **d3 Supply chain:** dependency graph & SBOMs; Dependabot alerts/updates; EPSS prioritization;
  Dependency Review pre-merge; grouping/auto-dismiss; security campaigns.
- **d4 Code Security (CodeQL):** CodeQL vs third-party; SARIF ingestion; enabling via Actions/external
  CI; triage, dataflow, autofix; custom query suites.
- **d5 Security operations:** CVE/CWE/advisories; severity rulesets & prioritization; campaign-based
  bulk remediation; shift-left; cross-suite governance.
- **d6 Administration:** enable at enterprise/org/repo; Cloud vs Server differences; default configs &
  inheritance; roles (admin/security-manager/developer); APIs for scale.

## 5. Research / source library (official only — Firecrawl seeds)

Per [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md); docs & blueprint only, **no exam dumps**.
- GH-500 study guide (`aka.ms/GH500-StudyGuide`) + cert page + practice assessment/sandbox.
- MS Learn learning paths: **GitHub Advanced Security Part 1** (`/training/paths/github-advanced-security/`)
  and **Part 2** (`/training/paths/github-advanced-security-2/`).
- GitHub docs (`docs.github.com/code-security`): GHAS overview, secret scanning, Dependabot/dependency
  review, code scanning & CodeQL, security overview, push protection, security campaigns.

Deliverable: a drafted `resources[]` (id/title/url/kind/annotation/domainIds), like
[copilot-gh300-source-library.md](../research/copilot-gh300-source-library.md).

## 6. Videos

~10–12 NotebookLM videos weighted to the blueprint (overview + heaviest domains), authored from
[NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md). Ships as placeholders first (same as GH-300).

## 7. Acceptance (Ready gate)

`npm run validate` green (weights = 1.0, unique IDs, answerable, scenarios have a `best`) · renders on
all eight surfaces · A+ readiness gate reachable · every source official · facts current to the
**July-2026** refresh (current feature names, no legacy "secret scanning"/"Dependabot" as the primary
term). Reuse the GH-300 authoring flow verbatim where possible.

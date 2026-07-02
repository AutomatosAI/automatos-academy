# GH-500 — GitHub Advanced Security (external exam)

Exam prep for **GH-500 · GitHub Advanced Security (GHAS)** — maintained by GitHub, delivered by
Microsoft, proctored via **Pearson VUE**. 100 minutes · **700/1000** to pass · Intermediate. The
academy issues no exam of its own; this track preps you (via mock exams) for the *real* Pearson VUE
exam. Blueprint + sources come from [PRD-S0-GH500.md](../../prds/PRD-S0-GH500.md).

> **July-2026 currency trap.** The refresh **renamed the features** — teach the current names, not the
> legacy ones: **Secret Protection** (was *secret scanning*), **Supply Chain Security** (was
> *Dependabot / Dependency Review*), **Code Security** (was *Code Scanning with CodeQL*). New/expanded:
> **push protection**, **EPSS** scoring, **SBOM** export, **security campaigns**, delegated bypass, autofix.
> Never lead with the legacy term.

## Modules (one file each — open, copy the prompt, paste into NotebookLM)

| # | Module | Domain (blueprint) | Weight | File |
|---|---|---|---|---|
| 00 | Overview / exam strategy | blueprint · how it's scored · how to sit it | — | [`00-overview.md`](./00-overview.md) |
| 01 | GitHub Security suites, features & ecosystem | d1 | **0.18** | [`01-security-suites.md`](./01-security-suites.md) |
| 02 | Secret Protection | d2 | **0.18** | [`02-secret-protection.md`](./02-secret-protection.md) |
| 03 | Supply Chain Security | d3 | **0.18** | [`03-supply-chain.md`](./03-supply-chain.md) |
| 04 | Code Security (CodeQL) | d4 | **0.13** | [`04-code-security.md`](./04-code-security.md) |
| 05 | Security operations — prioritization & remediation | d5 | **0.18** | [`05-security-operations.md`](./05-security-operations.md) |
| 06 | GitHub Security suites administration | d6 | **0.15** | [`06-administration.md`](./06-administration.md) |

Weights sum to **1.00** (d1 0.18 · d2 0.18 · d3 0.18 · d4 0.13 · d5 0.18 · d6 0.15). Heaviest domains
(d1/d2/d3/d5) get the most video minutes — see `00-overview.md` for the coverage allocation.

## Exam facts (verified live 2026-07-01)

- **Exam GH-500 — GitHub Advanced Security.** Maintained by GitHub, delivered by Microsoft.
- **100 minutes · 700/1000 to pass · proctored via Pearson VUE.** Level: Intermediate.
- Roles: administrator, developer, DevOps engineer, solution architect.
- Languages: English, Spanish, Portuguese (BR), Korean, Japanese.
- ~**60 scored** questions assumed (GitHub exam-family norm; confirm on the cert page before launch).
- Study guide: `https://aka.ms/GH500-StudyGuide` · sandbox: `https://GHCertDemo.starttest.com`.

## The workflow — do this per module

1. Open the module file (e.g. `02-secret-protection.md`).
2. In NotebookLM, create a notebook and **add the sources** that file lists (docs pages + MS Learn
   paths + the GH-500 study-guide task statements — nothing extra).
3. **Video:** paste the *Video Overview* prompt → Customize → generate → tune to **~8 min**.
4. **Audio:** paste the *Deep Dive* prompt (learn) and the *Brief* prompt (revise — this is an exam track).
5. Download → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the track's `videos[]`.
6. Tick the module off below.

## ✅ Do (per module)

- [ ] **00 · Overview** — load the study guide + cert page → generate the exam-strategy Video + Deep Dive
- [ ] **01 · Security suites** — load sources → Video (~8 min) + Deep Dive + Brief
- [ ] **02 · Secret Protection** — load sources → Video (~8 min) + Deep Dive + Brief
- [ ] **03 · Supply Chain Security** — load sources → Video (~8 min) + Deep Dive + Brief
- [ ] **04 · Code Security (CodeQL)** — load sources → Video (~8 min) + Deep Dive + Brief
- [ ] **05 · Security operations** — load sources → Video (~8 min) + Deep Dive + Brief
- [ ] **06 · Administration** — load sources → Video (~8 min) + Deep Dive + Brief
- [ ] Every video registered in the track `videos[]` with a `sourceNotebook` for re-generation
- [ ] Facts current to the **July-2026** refresh — current feature names only, no legacy "secret
      scanning" / "Dependabot" as the primary term

## Dos & don'ts (authoring guardrails)

- **Do** teach the current names first; mention the legacy name once, in parentheses, so learners map it.
- **Do** keep each notebook to one domain's sources — that's what keeps the Video Overview from rambling.
- **Do** frame every point as an **exam decision** (what to enable / who bypasses / how to prioritize),
  not just a definition.
- **Do** end each module with **Apply it in Automatos** — a SENTINEL/security agent running GHAS-style
  checks — that's the awareness thread.
- **Don't** use exam dumps or any non-official source. Docs (`docs.github.com/code-security`), the MS
  Learn GHAS learning paths, and the GH-500 study guide are the only sources.
- **Don't** assert facts the sources don't support (e.g. a specific question count) — confirm on the
  cert page first.

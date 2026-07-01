# PRD — GitHub Copilot GH-300 track

**Status:** approved to author · **Owner:** Academy · **Last updated:** 2026-07-01
**Research:** [research/copilot-gh300-source-library.md](../research/copilot-gh300-source-library.md) ·
**Videos:** [video-prompts/copilot-gh300-video-prompts.md](../video-prompts/copilot-gh300-video-prompts.md) ·
**Parent:** [PRD-EXPANSION.md](./PRD-EXPANSION.md) · **Method:** [AUTHORING.md](../AUTHORING.md)

## 1. Why

The first non-Anthropic track. GH-300 is the strongest available target: a real, self-enrollable,
proctored exam with a **published, weighted, six-domain blueprint** — everything needed to repeat
CCA-F honestly. This PRD is the build brief that turns the [source library](../research/copilot-gh300-source-library.md)
into a live track.

## 2. Exam facts (verified Feb 2026 — see research doc for sources)

GH-300 · 100 min · **~60 scored** questions (+ pretest) · **700/1000** to pass · $99 · Pearson VUE ·
EN/ES/PT-BR/KO/JA · intermediate · 2-yr validity. **Do not assert** a two-section/no-back-nav rule
(unverified). Major **Jan 2026 refresh** — Agent/Plan Mode, MCP, Sub-Agents, CLI, Spaces, Spark,
Code Review are now in scope.

## 3. Content model

**Path:** `public/content/github-copilot/gh-300/`. Six domains → `d1..d6.json`. Copy shapes from
`public/content/anthropic/cca-f/`.

### manifest.json — replace the stub
```jsonc
{
  "id": "github-copilot", "name": "GitHub Copilot",
  "tracks": [{
    "trackId": "gh-300",
    "name": "GitHub Copilot Certification — GH-300",
    "code": "GH-300",
    "status": "coming-soon",           // → "live" when validate passes
    "domains": 6,
    "summary": "Microsoft/GitHub's developer credential for GitHub Copilot — features & agents, responsible use, data & architecture, prompt engineering, productivity, and privacy safeguards.",
    "exam": { "questionCount": 60, "durationMinutes": 100, "passingScore": 700, "scoreScale": 1000 }
  }]
}
```
*(Note: the current stub uses `trackId: "foundations"` / "Copilot Architect (planned)". Rename to
`gh-300` to be exam-accurate; the old path was never authored so nothing links to it.)*

### track.json → `exam{}`
```jsonc
{
  "questionCount": 60, "durationMinutes": 100, "passingScore": 700, "scoreScale": 1000,
  "proctored": true, "closedBook": true,
  "scenarioPool": 8, "scenariosPresented": 4,   // Academy drill design (GH-300 doesn't publish a scenario structure)
  "recommendedPrep": "MS Learn GitHub Copilot Fundamentals Parts 1 & 2 + hands-on Copilot use across IDE, chat, CLI, and agents"
}
```
`blueprintNote`: *"Domains and weights normalized from the official GH-300 skills-measured ranges
(Features 25–30%, Responsible 15–20%, the rest 10–15%). Verify against the live study guide before
launch; weights read from data, so a correction is a content edit."*

## 4. Blueprint → domains (weights sum to 1.0)

| d | file | Domain | Weight | ≥Questions | Scenarios |
|---|---|---|---|---|---|
| d1 | `d1-copilot-features.json` | Use GitHub Copilot features (incl. org management) | **0.30** | 24 | 2–3 |
| d2 | `d2-responsible-ai.json` | Use GitHub Copilot responsibly | **0.18** | 20 | 1–2 |
| d3 | `d3-data-architecture.json` | Data & architecture | **0.13** | 20 | 1 |
| d4 | `d4-prompt-engineering.json` | Prompt engineering & context crafting | **0.13** | 20 | 1 |
| d5 | `d5-developer-productivity.json` | Improve developer productivity | **0.13** | 20 | 1–2 |
| d6 | `d6-privacy-safeguards.json` | Privacy, content exclusions & safeguards | **0.13** | 20 | 1 |

The weighted mock draws 60 questions in these proportions (d1 ≈ 18, d2 ≈ 11, others ≈ 8 each).

## 5. Per-domain content plan

Each domain: 3–4 lessons (each with 2–3 `knowledgeCheck`), a `questions[]` bank at the target above,
scenario drill(s), one lab, `resources[]` (from the source library, mapped by `domainIds`), and
`videos[]` placeholders (filled from the [video pack](../video-prompts/copilot-gh300-video-prompts.md)).

- **d1 Features (0.30):** completions & chat; **Agent Mode / coding agent / Plan Mode**; **Copilot CLI**;
  **MCP**, **Sub-Agents**, **Spaces**, **Spark**; **code review & PR summaries**; org policies & the
  feature matrix (plans/IDEs). *Cover Ask/Edit/Agent + Plan — the blueprint lists Edit Mode even though the product is folding it into Agent.* Scenarios: pick the right mode/feature
  for a task; roll Copilot out across an org.
- **d2 Responsible use (0.18):** responsible-AI principles, validating AI output, ethical/risk
  mitigation, per-feature application cards. Scenario: catch and correct an over-trusted suggestion.
- **d3 Data & architecture (0.13):** how prompts/context flow, proxy/filtering, the LLM lifecycle,
  supported models & selection, limitations. Scenario: reason about what data leaves the IDE.
- **d4 Prompt engineering (0.13):** prompt structure, context crafting, zero/few-shot, prompt files,
  using MCP/Spaces as context. Scenario: turn a vague ask into a grounded, well-scoped prompt.
- **d5 Productivity (0.13):** generation, refactoring, docs, **unit/integration test generation**,
  security & performance improvements, legacy modernization, Spark. Scenario: safe test-gen workflow.
- **d6 Privacy & safeguards (0.13):** content exclusions, privacy settings, duplication detection,
  security warnings, org auditing. Scenario: configure exclusions for a regulated repo.

## 6. Register + resources surfaces

- **Register** (per [PRD-EXPANSION §5](./PRD-EXPANSION.md)): proposed `registration{}` —
  `url: https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/`, `cost: "$99"`,
  `proctor: "Pearson VUE (online or test center)"`,
  `eligibility: "open enrollment; retake 24h after a fail"`. Small view — spec only, not built this pass.
- **Resources / Source library:** the `off-*` + `r-*` from the research doc, plus the official
  practice assessment and exam sandbox link.

## 7. Guardrails & acceptance

- Inherit [AUTHORING.md](../AUTHORING.md): **original questions only**, every option explained, every
  answer carries a `sourceRefs` to an official doc, facts current to the **Jan-2026** feature set.
- **Verify the blueprint** against the live study guide; adjust weights within the official ranges.
- **Acceptance:** `npm run validate` green (weights = 1.0, unique IDs, answerable, scenarios have a
  `best`) · renders on all eight surfaces · **A+ readiness gate reachable** · every source official.

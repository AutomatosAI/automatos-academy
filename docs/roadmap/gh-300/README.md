# GH-300 — GitHub Copilot (external exam)

Prep track for the **GH-300 — GitHub Copilot** certification (Microsoft/GitHub credential). The
academy issues no exam; it prepares you (via mock exams + these NotebookLM media) to sit the *real*
exam at Pearson VUE, and shows how the same flows work in Automatos.

**Exam at a glance:** 100 min · ~60 scored questions · **700/1000 to pass** · $99 · proctored (Pearson
VUE). Study guide refreshed **Jan 2026** — a major refresh added Agent/Plan Mode, MCP, Sub-Agents,
Copilot CLI, Spaces, Spark, and Code Review.

## Blueprint — the six weighted domains

| Module | Domain | Weight | slug |
|---|---|---|---|
| [00](./00-overview.md) | Overview / exam strategy | — | — |
| [01](./01-copilot-features.md) | Use GitHub Copilot features | **30%** | `d1-copilot-features` |
| [02](./02-responsible-ai.md) | Use GitHub Copilot responsibly | **18%** | `d2-responsible-ai` |
| [03](./03-data-architecture.md) | Understand data & architecture | **13%** | `d3-data-architecture` |
| [04](./04-prompt-engineering.md) | Apply prompt engineering & context crafting | **13%** | `d4-prompt-engineering` |
| [05](./05-developer-productivity.md) | Improve developer productivity | **13%** | `d5-developer-productivity` |
| [06](./06-privacy-safeguards.md) | Configure privacy, content exclusions & safeguards | **13%** | `d6-privacy-safeguards` |

Sum = 1.00. Study effort follows weight: Features (30%) earns three videos; Responsible (18%) two;
Productivity (13%) two; everything else one. Full allocation and the filled `[[BRACKET]]` seeds are
in [../../video-prompts/copilot-gh300-video-prompts.md](../../video-prompts/copilot-gh300-video-prompts.md);
sources + exam facts are in [../../research/copilot-gh300-source-library.md](../../research/copilot-gh300-source-library.md).

## Currency rule (Jan-2026 refresh)

Feature content must reflect **Ask / Edit / Agent modes + Plan Mode, the coding agent (opens a PR,
not a push), MCP, Copilot CLI, Spaces, Spark, and Code Review**. **Edit Mode** is still on the exam
blueprint even though the *product* folded it into Agent in 2026 — teach it as **exam-relevant** (a
scoped, review-first multi-file edit) *with* that product caveat. Docs win over community guides.

## Module checklist

- [ ] [00 — Overview & exam strategy](./00-overview.md)
- [ ] [01 — Use GitHub Copilot Features](./01-copilot-features.md) *(3 videos — heaviest domain)*
- [ ] [02 — Use GitHub Copilot Responsibly](./02-responsible-ai.md) *(2 videos)*
- [ ] [03 — Data & Architecture](./03-data-architecture.md)
- [ ] [04 — Prompt Engineering & Context Crafting](./04-prompt-engineering.md)
- [ ] [05 — Improve Developer Productivity](./05-developer-productivity.md) *(2 videos)*
- [ ] [06 — Privacy, Content Exclusions & Safeguards](./06-privacy-safeguards.md)

## The dos

- **Do** build one NotebookLM notebook per module (or per video for the heavy domain) — load only
  that domain's sources: the lesson body + the official docs listed + the study-guide task statements.
- **Do** paste the module's Video prompt into **Video → Customize**, then tune to **~8 min**; split
  if it drifts long.
- **Do** generate the **Deep Dive** (learn) and the **Brief** (revise, week before the exam) audio;
  add a **Debate** for the trade-off domains (Responsible AI, Privacy).
- **Do** ground everything in official sources — `docs.github.com/en/copilot` + Microsoft Learn +
  the study guide. No braindumps, no real exam items.
- **Do** keep the currency rule: Ask/Edit/Agent + Plan, coding agent = **PR not push**, MCP, CLI,
  Spaces, Spark, Code Review; Edit Mode is exam-relevant-with-caveat.
- **Do** finish each module with **Apply it in Automatos** — compose an agent + skills that mirror the
  Copilot flow, so the skill and the awareness thread land together.
- **Do** download → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the domain's
  `videos[]` → tick the module off here.

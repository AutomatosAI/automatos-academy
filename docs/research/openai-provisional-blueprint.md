# OpenAI — PROVISIONAL blueprint (UNOFFICIAL · not verified)

> ⚠️ **PROVISIONAL / UNOFFICIAL.** OpenAI has **not** published an exam blueprint, domain weights,
> question count, or passing score. Everything below is **constructed** from the pilot program's
> public course structure + the OpenAI platform docs, purely so the track can activate quickly if an
> official guide appears. **Do not present these as real exam weights. Do not author questions to
> these weights yet.** See [PRD-OPENAI-PARKED.md](../prds/PRD-OPENAI-PARKED.md) for activation rules.

## Sources this was built from (official)

- OpenAI certificate-courses announcement — `https://openai.com/index/openai-certificate-courses/`
- OpenAI Academy — `https://academy.openai.com/`
- OpenAI platform docs — `https://platform.openai.com/docs`

The pilot's three public tiers: **AI Foundations** → **Applied AI Foundations** → **Agents and
Workflows** (advanced).

## Provisional domain sketch (weights = placeholders, sum 1.0 only to keep the validator happy)

| d | Provisional domain | Draws from | Placeholder weight |
|---|---|---|---|
| d1 | Foundations of LLMs & ChatGPT | AI Foundations tier | 0.25 |
| d2 | Clear instructions, context & output review | AI Foundations tier | 0.15 |
| d3 | Applied AI workflows (task decomposition, integration points, review checkpoints) | Applied AI Foundations tier | 0.25 |
| d4 | Agents & workflows (structured direction, boundaries, draft review, optimisation) | Agents and Workflows tier | 0.20 |
| d5 | Responsible & safe use / evaluation | across all tiers + platform safety docs | 0.15 |

**These weights are invented to be plausible, not published.** On activation, delete this table and
re-derive from the official skills-measured page.

## Notes for activation

- If the credential stays **in-app scenario-based** (no MCQ), the Academy's **scenario** surface is
  the natural fit — lead with `scenarios[]`, lighter on `questions[]`. Revisit the mock-exam config
  (`track.exam{}`) since there may be no fixed question count / passing score to mirror.
- Keep the track framed to whatever OpenAI actually assesses (workflow-building, review discipline),
  not a generic "OpenAI API" course — otherwise it isn't cert-prep.
- Provisional `track.exam{}` placeholder if forced to render before official specs exist:
  `{ "questionCount": 50, "durationMinutes": 90, "passingScore": 700, "scoreScale": 1000,
  "proctored": false }` — **flag as provisional in `blueprintNote`.**

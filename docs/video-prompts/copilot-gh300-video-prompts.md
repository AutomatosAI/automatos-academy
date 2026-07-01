# GH-300 — NotebookLM video prompt pack

11 exam-focused videos for the **GitHub Copilot GH-300** track, allocated by blueprint weight.
Uses the reusable customization prompt in [NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md) — each
entry below fills only the `[[BRACKETS]]`; the Audience / ~8-min Shape / Grounding scaffold is
invariant there. `EXAM = GH-300 — GitHub Copilot`.

**Notebook sources per video:** the domain lesson `body` + the official docs in that domain's
`resources[]` (from [copilot-gh300-source-library.md](../research/copilot-gh300-source-library.md)) +
the GH-300 study-guide task statements. **Currency rule:** GH-300 was refreshed Jan 2026 — feature
videos must reflect **Ask/Edit/Agent modes, Plan Mode, MCP, CLI, Spaces, Spark, Code Review**. The
product removed **Edit Mode** in 2026, but the exam blueprint still lists it — cover it as
exam-relevant with that caveat.

## Allocation (11 videos)

| # | Domain (weight) | Videos |
|---|---|---|
| 0 | Overview / exam strategy | 1 |
| 1–3 | **d1 Use Copilot features (0.30)** | 3 |
| 4–5 | **d2 Use Copilot responsibly (0.18)** | 2 |
| 6 | **d3 Data & architecture (0.13)** | 1 |
| 7 | **d4 Prompt engineering (0.13)** | 1 |
| 8–9 | **d5 Developer productivity (0.13)** | 2 |
| 10 | **d6 Privacy & safeguards (0.13)** | 1 |

---

### v-ov-1 — The GH-300 blueprint & how to sit it
- Sources: study guide + cert page (`off-gh300-guide`, `off-gh300-cert`)
- `[[OBJECTIVE]]`: Understand the six domains, their weights, the 100-min / ~60-question / 700-to-pass
  format, and how to prepare.
- `[[DOMAIN]]`: all six (overview)
- `[[TASK STATEMENTS]]`: map study effort to weight (Features is 30%); know the format; know the Jan-2026 feature set is in scope.

## d1 · Use GitHub Copilot features (0.30) — 3 videos

### v-d1-1 — Suggestions, chat & choosing the right mode
- Sources: `r-features`, `r-copilot-docs`
- `[[OBJECTIVE]]`: Use inline completions and chat, and choose the right interaction for a task.
- `[[DOMAIN]]`: d1 — Use GitHub Copilot features (30%)
- `[[TASK STATEMENTS]]`: accept/dismiss suggestions; when to use chat vs inline; feature availability by IDE/plan.

### v-d1-2 — Agents: Agent Mode, coding/cloud agent & Plan Mode
- Sources: `r-agents`, `r-cli`
- `[[OBJECTIVE]]`: Delegate multi-step work to Copilot agents and use Plan Mode before code.
- `[[DOMAIN]]`: d1 — Use GitHub Copilot features (30%)
- `[[TASK STATEMENTS]]`: pick agent vs inline; plan-then-execute; the Copilot CLI agent. *(Cover Edit vs Agent — the blueprint lists Edit Mode even though the product folded it into Agent.)*

### v-d1-3 — Context & scale: MCP, Sub-Agents, Spaces, Spark, Code Review
- Sources: `r-mcp`, `r-spaces`, `r-spark`, `r-code-review`
- `[[OBJECTIVE]]`: Extend Copilot with MCP and sub-agents; share context via Spaces; build with Spark; automate PR review.
- `[[DOMAIN]]`: d1 — Use GitHub Copilot features (30%)
- `[[TASK STATEMENTS]]`: when MCP/Spaces help; sub-agent delegation; Spark app-gen; the code-review agent.

## d2 · Use GitHub Copilot responsibly (0.18) — 2 videos

### v-d2-1 — Responsible-AI principles & validating output
- Sources: `r-responsible`
- `[[OBJECTIVE]]`: Apply the responsible-AI principles and always validate AI output.
- `[[DOMAIN]]`: d2 — Use GitHub Copilot responsibly (18%)
- `[[TASK STATEMENTS]]`: the principles; why validation is mandatory; per-feature application cards.

### v-d2-2 — Risks, mitigation & ethical use
- Sources: `r-responsible`
- `[[OBJECTIVE]]`: Identify Copilot risks and the right mitigations.
- `[[DOMAIN]]`: d2 — Use GitHub Copilot responsibly (18%)
- `[[TASK STATEMENTS]]`: over-reliance, bias, insecure suggestions; mitigation practices.

## d3 · Data & architecture (0.13) — 1 video

### v-d3-1 — How Copilot handles your data & which model runs
- Sources: `r-privacy`, `r-models`
- `[[OBJECTIVE]]`: Trace prompt/context data flow, know the model options and Copilot's limitations.
- `[[DOMAIN]]`: d3 — Understand GitHub Copilot data and architecture (13%)
- `[[TASK STATEMENTS]]`: what data leaves the IDE; proxy/filtering; model selection & trade-offs; limitations.

## d4 · Prompt engineering & context crafting (0.13) — 1 video

### v-d4-1 — Prompts, context & few-shot that work
- Sources: `r-prompt`, `r-mcp`, `r-spaces`
- `[[OBJECTIVE]]`: Structure prompts, craft context (incl. MCP/Spaces/prompt files), and use zero/few-shot.
- `[[DOMAIN]]`: d4 — Apply prompt engineering and context crafting (13%)
- `[[TASK STATEMENTS]]`: prompt structure; supplying context; zero vs few-shot; iterative refinement.

## d5 · Improve developer productivity (0.13) — 2 videos

### v-d5-1 — Generate, refactor & document
- Sources: `r-productivity`, `r-features`
- `[[OBJECTIVE]]`: Use Copilot to generate, refactor, and document code across the SDLC.
- `[[DOMAIN]]`: d5 — Improve developer productivity (13%)
- `[[TASK STATEMENTS]]`: generation patterns; safe refactoring; docs; legacy modernization.

### v-d5-2 — Tests, security & performance
- Sources: `r-productivity`, `r-code-review`
- `[[OBJECTIVE]]`: Generate unit/integration tests and use Copilot to improve security & performance.
- `[[DOMAIN]]`: d5 — Improve developer productivity (13%)
- `[[TASK STATEMENTS]]`: test-gen workflow; reviewing for vulnerabilities; perf improvements.

## d6 · Privacy, content exclusions & safeguards (0.13) — 1 video

### v-d6-1 — Content exclusions, privacy settings & auditing
- Sources: `r-exclusion`, `r-privacy`
- `[[OBJECTIVE]]`: Configure content exclusions, privacy settings, and safeguards; audit them org-wide.
- `[[DOMAIN]]`: d6 — Configure privacy, content exclusions, and safeguards (13%)
- `[[TASK STATEMENTS]]`: exclude files/repos; duplication detection; security warnings; org auditing.

---

## Register in each domain file (after producing)

```jsonc
{ "id": "v-d1-2", "title": "D1 · Agents — Agent Mode & Plan Mode",
  "provider": "youtube", "url": "https://youtu.be/XXXXXXXXXXX",
  "domainIds": ["d1-copilot-features"],
  "sourceNotebook": "gh-300 / d1 / agents", "status": "published" }
```

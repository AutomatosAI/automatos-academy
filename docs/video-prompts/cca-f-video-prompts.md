# CCA-F — NotebookLM video prompt pack (reference example)

Filled prompts for the **Anthropic CCA-F** track, weighted to the exam blueprint
(D1 27% · D2 18% · D3 20% · D4 20% · D5 15%). This is the **worked reference** for
[NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md) and the **re-generation SOP** for CCA-F's video
set — note each `sourceNotebook` so a video can be rebuilt when the platform changes.

Each entry gives only the **variable parts** — paste them into the `[[BRACKETS]]` of the reusable
customization prompt in the framework doc (the Audience / ~8-min Shape / Grounding scaffold is
invariant and lives there). `EXAM = CCA-F — Claude Certified Architect, Foundations`.

Sources for every notebook: the domain's lesson `body` + the official docs in that domain's
`resources[]` (primarily `platform.claude.com/docs`, the Agent SDK docs, `modelcontextprotocol.io`,
`docs.claude.com/en/docs/claude-code`) + the CCA-F exam guide task statements.

## Allocation (12 videos + 4 existing overviews)

| # | Domain (weight) | Objective focus |
|---|---|---|
| Overview | — | Blueprint, scoring, how to sit the exam *(CCA-F already ships 4 overview MP4s)* |
| 1–3 | **D1 Agentic Architectures (27%)** | tiers · the agentic loop · multi-agent + sessions |
| 4–5 | **D2 Tools & MCP (18%)** | tool design & `tool_choice` · MCP servers/config + structured errors |
| 6–7 | **D3 Agent Ops & Claude Code (20%)** | CLAUDE.md hierarchy & path rules · commands/skills/hooks/plan-mode + CI |
| 8–9 | **D4 Prompt Engineering (20%)** | system-vs-user, structured output, few-shot · thinking/effort, caching, evals |
| 10–11 | **D5 Context & Reliability (15%)** | context window, compaction, context editing · caching-for-reliability, provenance |

---

## D1 · Agentic Architectures (27%) — 3 videos

**v-d1-1 — Choosing the right tier**
- `[[OBJECTIVE]]`: Decide when a task needs a single call vs a code-orchestrated workflow vs an
  autonomous agent — and when NOT to build an agent.
- `[[DOMAIN]]`: D1 — Agentic Architecture & Orchestration (27%)
- `[[TASK STATEMENTS]]`: match task shape to tier; justify choosing the cheapest tier that meets the
  need; recognise anti-patterns (agent for a fixed pipeline).
- `sourceNotebook`: `cca-f / D1 / tiers`

**v-d1-2 — The agentic loop & stop reasons**
- `[[OBJECTIVE]]`: Trace one full agentic loop and handle every stop reason correctly.
- `[[TASK STATEMENTS]]`: interpret `stop_reason`; wire the tool-use round-trip; end/continue the loop.
- `sourceNotebook`: `cca-f / D1 / loop`

**v-d1-3 — Multi-agent orchestration & sessions**
- `[[OBJECTIVE]]`: Decompose work across sub-agents and manage session state under real constraints.
- `[[TASK STATEMENTS]]`: hub-and-spoke vs single agent; session boundaries; when orchestration adds
  reliability vs cost.
- `sourceNotebook`: `cca-f / D1 / multi-agent`

## D2 · Tools & MCP (18%) — 2 videos

**v-d2-1 — Tool design & `tool_choice`**
- `[[OBJECTIVE]]`: Design clear, well-scoped tools and steer selection with `tool_choice`.
- `[[TASK STATEMENTS]]`: write tool schemas; force/auto/none selection; structured error responses.
- `sourceNotebook`: `cca-f / D2 / tools`

**v-d2-2 — MCP servers & configuration**
- `[[OBJECTIVE]]`: Explain MCP transport/tools/resources/prompts and configure a server.
- `[[TASK STATEMENTS]]`: pick a transport; expose tools/resources; when to reach for MCP vs inline tools.
- `sourceNotebook`: `cca-f / D2 / mcp`

## D3 · Agent Ops & Claude Code (20%) — 2 videos

**v-d3-1 — CLAUDE.md hierarchy & path rules**
- `[[OBJECTIVE]]`: Configure Claude Code via the CLAUDE.md hierarchy and path-scoped rules.
- `[[TASK STATEMENTS]]`: resolve precedence across global/project/dir; scope rules by path.
- `sourceNotebook`: `cca-f / D3 / config-hierarchy`

**v-d3-2 — Commands, skills, hooks, plan mode & CI**
- `[[OBJECTIVE]]`: Extend Claude Code with custom commands/skills/hooks and run it in CI/batch.
- `[[TASK STATEMENTS]]`: author a skill/command; gate with hooks; plan-mode discipline; CI/batch runs.
- `sourceNotebook`: `cca-f / D3 / extensibility`

## D4 · Prompt Engineering (20%) — 2 videos

**v-d4-1 — System vs user, structured output & few-shot**
- `[[OBJECTIVE]]`: Split system/user roles correctly and get reliable structured outputs.
- `[[TASK STATEMENTS]]`: role placement; JSON/structured output; few-shot that helps not hurts.
- `sourceNotebook`: `cca-f / D4 / prompting`

**v-d4-2 — Thinking/effort, prompt caching & eval-driven iteration**
- `[[OBJECTIVE]]`: Use extended thinking/effort and prompt caching, and iterate against evals.
- `[[TASK STATEMENTS]]`: when to raise effort; what caching does to cost/latency; eval-first loop.
- `sourceNotebook`: `cca-f / D4 / thinking-caching-evals`

## D5 · Context & Reliability (15%) — 2 videos

**v-d5-1 — Context window, compaction & context editing**
- `[[OBJECTIVE]]`: Manage the context window with compaction and context editing.
- `[[TASK STATEMENTS]]`: budget context; compaction triggers; edit/keep vs drop.
- `sourceNotebook`: `cca-f / D5 / context`

**v-d5-2 — Caching for reliability & provenance**
- `[[OBJECTIVE]]`: Use caching for reliability and preserve information provenance.
- `[[TASK STATEMENTS]]`: caching as a reliability lever; keep sources traceable across turns.
- `sourceNotebook`: `cca-f / D5 / reliability`

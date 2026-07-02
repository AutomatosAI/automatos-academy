# CCA-F · Module 01 — Agentic Architecture & Orchestration

**Exam tie-in:** D1 Agentic Architecture & Orchestration (**27%** — the heaviest domain, and the root
of most scenario questions)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The D1 lesson bodies (`public/content/anthropic/cca-f/d1-agentic-architectures.json`): tiers, the
  agentic loop & stop reasons, Managed Agents (Agent → Session), multi-agent & task decomposition
- https://www.anthropic.com/engineering/building-effective-agents (the canonical "should you build an agent, at what tier" essay)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview (the loop, the stop-reason table, `tool_result` shape)
- https://platform.claude.com/docs/en/managed-agents/overview (Agent → Session, versioning, environments, events, outcomes)
- The CCA-F Exam Guide task statements for **D1** (match task shape to tier; trace the loop; place config on the Agent; decompose to the smallest reliable unit of autonomy)

## 🎬 Video Overview prompt (~8 min) — video 1 of 3: **Choosing the right tier**
```
Audience: a professional studying for the Anthropic CCA-F architect exam — a capable builder, not an
expert on this specific decision. Explain plainly first, then precisely. Cover ONLY: choosing the
right architecture tier — a single LLM call, a code-orchestrated workflow, or an autonomous agent —
and when NOT to build an agent. Anchor on Anthropic's rule: default to the simplest tier that meets
the need and escalate only when the task genuinely requires it. Teach the four checks before
committing to the agent tier — complexity (hard to specify up front?), value (does the outcome justify
higher cost and latency?), viability (is the model actually capable at this task type?), and cost of
error (can mistakes be caught and recovered via tests, review, rollback?) — and that if any check is
"no", you drop a tier. Make the distinction sharp: if you can draw the control-flow graph in advance
it's a workflow (your code orchestrates); if the model must decide its own trajectory at runtime it's
an agent. Map every point to an exam decision: given a brief, pick the cheapest tier that works and
defend it. ~8 minutes: open with why D1 is the biggest slice of the exam, work one concrete example
(high-volume invoice-field extraction → a single call with structured output, NOT an agent), then
call out the top 2–3 distractors candidates get wrong — reaching for an agent when a fixed pipeline is
a workflow; adding a multi-agent coordinator to a task one call solves; treating "more steps" as
"needs an agent". Close with a one-line "on the exam, remember: build the cheapest tier that works and
justify it." Stay strictly grounded in the provided sources; do not invent tiers or checks.
```

## 🎬 Video Overview prompt (~8 min) — video 2 of 3: **The agentic loop & stop reasons**
```
Audience: a CCA-F candidate who can call the API but hasn't wired a full tool-use loop by hand.
Explain plainly first, then precisely. Cover ONLY: the agentic loop and how to branch on every stop
reason. Establish that everything goes through POST /v1/messages and tools are a feature of that
endpoint, not a separate API. Trace the loop: send messages plus tool definitions; if stop_reason is
tool_use, execute the requested tool(s) yourself, append the assistant turn AND a tool_result for each
tool_use matched by tool_use_id, and loop until stop_reason is end_turn. Then teach each stop reason
as an exam decision: end_turn (done — read the text); tool_use (run the tools and continue);
pause_turn (a server-side tool loop hit its iteration cap — resume by re-sending the conversation
including the assistant turn, and do NOT add a "continue" message); max_tokens (output was cut off —
raise max_tokens or stream); refusal (a safety decline — check stop_reason BEFORE reading content
because a pre-output refusal can return an empty content array, so indexing content[0] throws). Cover
when to write the manual loop instead of the SDK tool runner: when you must gate, log, or require
human approval before an irreversible tool call — the interception point a money-moving system needs.
~8 minutes: open with why every scenario answer depends on handling the loop correctly, walk one
worked round-trip (tool_use → execute → tool_result → end_turn), then the top distractors — appending
a "continue" message on pause_turn; reading content before checking stop_reason; forgetting a
tool_result for a tool_use_id. Close with "on the exam, remember: branch on stop_reason first, always
return a tool_result per tool_use_id." Stay strictly grounded in the sources; do not invent stop
reasons or parameters.
```

## 🎬 Video Overview prompt (~8 min) — video 3 of 3: **Managed Agents, sessions & multi-agent orchestration**
```
Audience: a CCA-F candidate architecting an unattended, long-running agent. Explain plainly first,
then precisely. Cover ONLY: Managed Agents (Agent → Session), session lifecycle, and multi-agent
orchestration. Teach the cardinal rule the exam loves: an Agent is a persisted, versioned
configuration — model, system, tools, mcp_servers, skills — created once; a Session is one run that
references the agent by id and pins an environment, and the session body takes NO model/system/tools.
Name the #1 anti-pattern: putting model/tools on sessions.create(), or calling agents.create() at the
top of every request (it's rejected or it orphans agents, pays create latency per run, and defeats
versioning). Explain why versioning exists — reproducibility, safe iteration, rollback; running
sessions keep their pinned version. Explain the Environment as the reusable template for the
per-session container where tools execute, while the agent loop runs on Anthropic's orchestration
layer. Cover reading the run: sessions stream events (agent.message, agent.tool_use, status_idle,
status_terminated); break on a terminal idle (idle carrying a terminal stop_reason) or termination —
NOT the first idle, which can be transient (e.g. requires_action while awaiting a custom tool result
or confirmation). Then multi-agent: a coordinator delegates to sub-agents via the multiagent field on
the AGENT (not the session, not a tool); delegation is ONE level deep (a sub-agent's own roster does
not cascade); threads share the FILESYSTEM, not conversation context, so the coordinator must pass a
fact explicitly or write it to disk; fan out only for independent, parallelisable work. ~8 minutes:
open with why unattended production runs live and die on this, work one example (an overnight code
migration on a versioned agent with a coordinator fanning out over file batches), then the top
distractors — config on the session; recreating the agent per run; breaking on the first idle;
expecting a sub-agent to "see" the coordinator's context. Close with "on the exam, remember: config on
the Agent, the Session just references it; delegation is one level, filesystem not context." Stay
strictly grounded in the sources; do not invent fields or limits.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the whole D1 "Agentic Architecture & Orchestration" domain
for the Anthropic CCA-F exam. Cover: choosing the tier (single call vs workflow vs agent) and the four
checks — complexity, value, viability, cost of error — with "default to the simplest tier"; the
agentic loop through POST /v1/messages and branching on every stop reason (end_turn, tool_use,
pause_turn, max_tokens, refusal), including resuming pause_turn by re-sending and checking stop_reason
before reading content; the manual loop vs the SDK tool runner and why irreversible actions need the
manual interception point; Managed Agents' cardinal rule (config on the persisted, versioned Agent;
the Session only references it), environments, the event stream and breaking on terminal idle /
termination not first idle, requires_action, and outcomes (the iterate → grade → revise loop against a
rubric); and multi-agent orchestration — coordinator + sub-agents, one level of delegation, shared
filesystem not context, and fanning out only for independent parallel work. For each, make the exam
decision explicit. Ground strictly in the sources; when they conflict, prefer the official docs.
```

## 🎧 Brief (revise, ~8–12 min)
```
Tight pre-exam recap of the must-know D1 distinctions and the top distractors: cheapest-tier-that-
works and the four checks; workflow (drawable control flow) vs agent (model-chosen trajectory); the
stop-reason branch table with the pause_turn "re-send, don't say continue" trap and the "check
stop_reason before content[0]" refusal trap; a tool_result per tool_use_id; config-on-the-Agent-not-
the-Session cardinal rule and why per-run agent creation is wrong; break on terminal idle not first
idle; delegation is one level deep and threads share the filesystem, not context. Grounded in the
sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
Walk the learner through D1 as it actually runs in Automatos. The **tier decision** is the platform's
own choice: a single classify/extract call, a **recipe** (code-orchestrated workflow with known steps
— see `api/recipe_executor.py`), or a **mission** (an autonomous agent that decides its own
trajectory). Have them build the **agentic loop with a gate**: an agent whose money-moving or
destructive tool routes through an approval step before it fires — the platform's board/approval flow
is exactly the manual-loop interception point CCA-F is testing. Then show **multi-agent**: a
coordinator mission that fans work out to sub-agents for independent, parallelisable batches, passing
facts explicitly rather than assuming shared context. The lesson lands as "the tier you'd defend on
the exam is the tier you'd pick in Automatos."

## ✅ Do
- [ ] Load the D1 sources into a new NotebookLM notebook (one notebook per video block)
- [ ] Generate all three Video Overviews (tiers · loop & stop reasons · Managed Agents/multi-agent), each ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio for the domain
- [ ] Download → host → register each in the D1 `videos[]` with its `sourceNotebook`
- [ ] Tick this module off in the track README

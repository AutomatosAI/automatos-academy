# CCA-F · Module 02 — Tool Design & MCP Integration

**Exam tie-in:** D2 Tool Design & MCP Integration (**18%**)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The D2 lesson bodies (`public/content/anthropic/cca-f/d2-tools-mcp.json`): tool anatomy &
  prescriptive descriptions, `tool_choice`/parallelism/honest errors, bash-vs-dedicated & server-side
  tools, MCP servers and the auth trap
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview (tool object shape, `tool_choice`, `disable_parallel_tool_use`, `is_error`)
- https://modelcontextprotocol.io/ (transport = Streamable HTTP/SSE; what a server exposes — tools, resources, prompts)
- https://platform.claude.com/docs/en/agents-and-tools/mcp-connector (how `mcp_servers` is declared by url, auth handled separately)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool (server-side tools: cited web_search/web_fetch; code_execution sandbox has no general internet)
- The CCA-F Exam Guide task statements for **D2** (write a prescriptive description; steer with `tool_choice`; return honest errors; bash vs dedicated on reversibility; declare MCP with OAuth via vaults)

## 🎬 Video Overview prompt (~8 min) — video 1 of 2: **Tool design, `tool_choice` & honest errors**
```
Audience: a professional studying for the Anthropic CCA-F architect exam who has passed tools to
Claude but hasn't tuned selection. Explain plainly first, then precisely. Cover ONLY: designing tools
the model reaches for, steering which one runs, and returning failures honestly. Establish the three
fields of a tool — name (stable snake_case identifier), description (natural-language guidance on
WHETHER and HOW to call it, the highest-leverage field), and input_schema (a JSON Schema of the
parameters with the truly mandatory ones marked required). Teach that modern Claude reaches for tools
conservatively, so descriptions must be PRESCRIPTIVE — state the trigger conditions ("Call this when
the user asks about a current price…") and the boundary ("not for historical prices") — which
measurably lifts the should-call rate. Cover strict:true (validates generated arguments against the
schema). Then tool_choice as the steering wheel: auto (model decides, the default), any (must call
some tool, model picks), tool/name (must call that specific tool), none (no tool this turn); and
disable_parallel_tool_use:true to force ONE tool per turn when a call has side effects that must not
overlap. Finally, honest errors: on failure return a tool_result with is_error:true and an actionable
message so the model can adapt — never an empty string, never a fake success, and never omit the
tool_result (the loop needs one per tool_use_id). ~8 minutes: open with why this domain decides
whether an agent can act, work one example (a refund tool over-firing → fix the description first),
then the top distractors — using tool_choice:any to fix WRONG-tool selection (it forces a tool but
not which one); confusing strict with disable_parallel_tool_use; faking success on a failed call.
Close with "on the exam, remember: the description is a spec, tool_choice is the steering, honest
errors keep the model grounded." Stay strictly grounded in the sources; do not invent fields.
```

## 🎬 Video Overview prompt (~8 min) — video 2 of 2: **MCP, server-side tools & the auth trap**
```
Audience: a CCA-F candidate wiring an agent to external systems. Explain plainly first, then
precisely. Cover ONLY: the bash-vs-dedicated-tool call, Anthropic-hosted server-side tools, and the
Model Context Protocol including its auth trap. First, reversibility is the criterion: a generic bash
tool gives huge breadth but every call is an opaque command string the harness can't gate, render,
type-check, or mark parallel-safe — so promote an action to a dedicated tool when you must gate/confirm
an irreversible action, render custom UI, audit with a typed record, or mark it parallel-safe. Second,
server-side tools run on Anthropic's infrastructure: you declare them in tools[] but don't execute
them — web_search/web_fetch return CITED results, and plain code_execution runs in a sandboxed
container with NO general internet access (so use web_fetch for live web, not a code_execution
download). Third, MCP: an open standard where a server exposes tools (actions), resources (readable
data), and prompts (reusable templates) over Streamable HTTP/SSE; you declare a remote server by url —
{ type:'url', name, url } — with NO credentials inline. Then the exam's favourite trap: in Managed
Agents auth is supplied out-of-band through vaults (attach vault_ids to the session; Anthropic stores
the credential and auto-refreshes OAuth tokens), and a hosted MCP server usually authenticates with an
OAuth BEARER token, NOT the service's native REST API key — different auth systems — so storing a
GitHub personal-access token in a vault and expecting it to work is wrong. Close the loop with tool
search for large libraries: it discovers relevant tools on demand and APPENDS the matched schemas,
which preserves the prompt cache (swapping schemas in/out would bust it). ~8 minutes: open with why
this is how an agent connects to the real world, work one example (a Managed Agent on a GitHub MCP
server + live release notes), then the top distractors — inlining a REST key in the server
declaration; expecting a REST PAT to satisfy an OAuth server; using code_execution to fetch a public
page. Close with "on the exam, remember: declare by url, auth via vaults, OAuth-not-REST, and tool
search appends to save the cache." Stay strictly grounded in the sources; do not invent transports or
auth mechanisms.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the whole D2 "Tool Design & MCP Integration" domain for the
Anthropic CCA-F exam. Cover: the three tool fields (name/description/input_schema) and why prescriptive
descriptions that state when-to-call raise the should-call rate on conservative modern models;
strict:true argument validation; tool_choice (auto/any/tool/none) and disable_parallel_tool_use for
one-tool-per-turn on side-effecting calls; honest errors with is_error and an actionable message vs
the failure modes of empty/fake/omitted results; the bash-vs-dedicated decision on reversibility (gate,
confirm, render, audit, mark parallel-safe); Anthropic-hosted server-side tools (declared in tools[]
but run on Anthropic infra — cited web_search/web_fetch, and code_execution's isolated sandbox with no
general internet); and MCP — servers expose tools/resources/prompts over Streamable HTTP/SSE, declared
by url with no inline auth, with auth supplied via vaults where Anthropic auto-refreshes the OAuth
bearer token (NOT the REST API key), plus tool search appending schemas to preserve the prompt cache.
For each, make the exam decision explicit. Ground strictly in the sources; when they conflict, prefer
the official docs.
```

## 🎧 Brief (revise, ~8–12 min)
```
Tight pre-exam recap of the must-know D2 distinctions and top distractors: description is the lever
(prescriptive, state when-to-call); tool_choice auto/any/tool/none vs strict vs
disable_parallel_tool_use; is_error with an actionable message, never fake/empty/omitted; promote bash
→ dedicated on reversibility; server-side tools run on Anthropic infra and code_execution has no
general internet; declare MCP by url with no inline auth; and the headline trap — hosted MCP wants an
OAuth bearer token via a vault, not the service's REST API key. Grounded in the sources. For the week
before the exam.
```

## 🤖 Apply it in Automatos
Ground D2 in the platform's tool layer. Automatos never registers individual actions as separate
function tools — it uses a `composio_execute` meta-tool with hint-driven action selection
(`ComposioHintService`), which is the production answer to "how do you keep a huge tool library
usable" that CCA-F frames as tool search + prescriptive descriptions. Have the learner add a **gated,
dedicated tool** to an agent for an irreversible action (the reversibility call), then wire an
**MCP/Composio connection** and observe that auth is provisioned out-of-band (OAuth via the connector),
never pasted inline — the exam's OAuth-vs-REST-key distinction, live. Contrast a hosted web tool
(cited results) with a bash/curl step so they feel why the platform prefers the managed tool.

## ✅ Do
- [ ] Load the D2 sources into a new NotebookLM notebook (one per video block)
- [ ] Generate both Video Overviews (tool design & tool_choice · MCP & the auth trap), each ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio for the domain
- [ ] Download → host → register each in the D2 `videos[]` with its `sourceNotebook`
- [ ] Tick this module off in the track README

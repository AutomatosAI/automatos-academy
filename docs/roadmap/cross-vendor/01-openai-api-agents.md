# Cross-Vendor · Module 01 — OpenAI: API + Agents SDK

**Type:** skills (no exam — OpenAI has no self-enrollable proctored exam; this is pure skills content)

## 📥 Sources to load into NotebookLM
- The module lesson body (from the track content / PRD)
- OpenAI platform docs — https://platform.openai.com/docs/ (Responses API, Chat Completions, models, function calling, structured outputs). *Fetch with a browser UA — direct fetch may 403.*
- OpenAI Agents SDK docs — https://openai.github.io/openai-agents-python/ (agents, handoffs, guardrails, tracing, the agent loop)
- OpenAI Agents SDK repo — https://github.com/openai/openai-agents-python
- OpenAI Academy — https://academy.openai.com/ (context only: courses, not an exam)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional who can call an LLM API but hasn't built agents on OpenAI. Explain plainly
first, then precisely. Cover ONLY: OpenAI's platform mental model — the Responses API (and how it
relates to Chat Completions), function calling, and structured outputs — then the Agents SDK loop:
agents, tools, handoffs, guardrails, and tracing. Show how the pieces compose into a tool-using agent.
~8 minutes: open with the mental model (one request → tool calls → final answer), one worked example
(a tool-using agent that calls a function and returns a structured result), the top 2–3 things people
get wrong (confusing function calling with structured outputs; forgetting the loop runs until the model
stops calling tools; handoffs vs a single mega-prompt), and a one-line "remember…" takeaway. Stay
strictly grounded in the provided sources; do not invent API parameters or feature names.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach building on OpenAI end to end. Part 1 — the API surface:
the Responses API and Chat Completions, function/tool calling (schemas, the call-then-result loop),
and structured outputs (JSON schema-constrained responses) — when to use which. Part 2 — the Agents
SDK: what an Agent is (instructions + tools), the agent loop, handoffs between agents, guardrails
(input/output validation), and tracing for debugging. For each concept, make the design decision
explicit — e.g. structured outputs vs a parsing prompt; one agent with many tools vs handoffs to
specialists. Ground strictly in the sources.
```

## 🎧 Audio — Debate (the judgment call)
```
Two hosts, expert level. Debate: "Build agents with the OpenAI Agents SDK, or roll your own loop over
the raw API?" One host argues the SDK (built-in handoffs, guardrails, tracing, less boilerplate, a
maintained agent loop). The other argues DIY over Responses/Chat Completions (full control, no
framework lock-in, easier to port to another provider later, thinner dependency). Converge on a rule
of thumb: use the SDK to move fast, but keep your tool definitions and prompts provider-portable so a
swap stays cheap. Ground strictly in the sources.
```

## 🤖 Apply it in Automatos
Wire the same idea as an Automatos agent that uses **OpenAI as its model provider**: define the agent's
tools the Automatos way (the meta-tool pattern, not one function per action), give it a clean task
instruction, and let it run the tool loop — the exact shape the Agents SDK formalizes. Then show the
payoff for later modules: the agent config names the provider, so switching this agent from OpenAI to
Gemini or an open-weight endpoint is a config change, not a rewrite.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Debate) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

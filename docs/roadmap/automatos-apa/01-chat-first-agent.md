# Automatos · Module 01 — Chat, your first agent & the Universal Router

**Type:** Free training (no exam)  ·  **Goal:** talk to agents in Chat, create your first agent, and
understand how the Universal Router decides who answers.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/chat/README.md` — the Chat interface, quick actions, streaming, file attachments
- `automatos-gitbook/chat/routing.md` — the Universal Router (the multi-tier system + overrides + corrections)
- `automatos-gitbook/agents/README.md` — the Agent Management page, tabs, stats bar, starter agents
- `automatos-gitbook/agents/creating.md` — the 6-step create flow, testing, prompt-engineering tips
- Repo for grounding: `automatos-ai` — the platform

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who has taken the tour (Module 00) and now wants to DO something.
Teach them, hands-on and grounded in the sources, how to chat, create their first agent, and read
the Router. This is a "watch me do it" walkthrough, not a feature list.

Cover ONLY, in order:
1. Chat basics: type a message → the Universal Router picks the best agent → the response streams in
   real-time (SSE). Show the three areas (history, message thread, input bar) and the quick actions
   (Code, Create an Agent, Knowledge Base, Playbooks, Edit Tools). Mention file attachments (up to
   20 MB) and that each conversation has a ~60,000-token context budget that auto-summarises.
2. Create your first agent (agents/creating.md), step by step:
   - Start from a template (Code Reviewer) vs from scratch — recommend template.
   - Basic info: name, category, and a SPECIFIC description ("Handles code reviews for JS/TS" beats
     "Code stuff") — and explain WHY: the Router uses the description to route.
   - Model: provider (OpenRouter/OpenAI/Anthropic/DeepSeek), model, temperature, max tokens.
   - Persona (Professional / Casual / Technical / Custom) and tools + skills.
   - Click Create → it lands on the roster immediately.
3. Test it: chat-test by selecting it from the Auto dropdown; run a Capability Test for a scored
   report (quality, tool usage, persona, error handling).
4. The Router, made concrete: Auto mode's tiers — Tier 0 user override, Tier 1 cache (fast, free),
   Tier 2 rules (keywords), Tier 2.5 semantic, Tier 3 LLM fallback. Explain that a NEW agent takes
   5–10 interactions to enter the cache/semantic tiers, and that you can correct wrong routing and
   the system learns.

~8 minutes: open with "you talk, it routes," do one full agent-creation pass on screen, then show the
routing tiers as the reason a good description matters. Stay strictly in the sources; don't invent
templates, tiers, or fields.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, coaching a first-time builder. Teach how to create an agent that the Router
will actually pick, and how to talk to it well. Go deep on: writing a routing-friendly description;
the prompt-engineering tips from agents/creating.md (be specific about the role, define output
format, set boundaries, include examples, reference tools explicitly); choosing a model and
temperature for the job; and the testing loop (chat test → capability test → review routing → improve
the description). Explain the Router tiers as a cost/latency story (cache is free, LLM is the
expensive fallback) and why corrections compound. Ground strictly in chat/README.md, chat/routing.md,
agents/README.md, agents/creating.md.
```

## 🎧 Debate (judgment) — NotebookLM → Audio → Customize
```
Two expert hosts debate a decision every new user faces: "When should I create a NEW agent versus
just chatting in Auto mode and letting the Router pick an existing one?" One host argues for fewer,
well-described generalist agents (easier routing, less cache cold-start); the other argues for
specific single-purpose agents (sharper prompts, better capability-test scores, clearer reports).
Work through the trade-offs from the sources: description quality and routing accuracy, the 5–10
interaction cache warm-up, persona/temperature fit, and maintenance cost. Land on a practical rule of
thumb for a beginner. Ground strictly in the provided sources; no invented benchmarks.
```

## 🛠 Try it now (on the free platform)
Create your first working agent and prove it routes:
1. **Agents → + Create Agent → From Template → Code Reviewer.**
2. Give it a **specific description**: *"Reviews GitHub pull requests and code for bugs, security
   issues, and style problems in TypeScript and Python."* Pick a model, set temperature ~0.3, choose
   the **Technical** persona. Click **Create**.
3. Open **Chat**, select your Code Reviewer from the **Auto** dropdown, and paste a public GitHub
   file or PR link with: *"Review this for bugs and security issues."* Watch the response stream.
4. Start a **new** chat, switch back to **Auto**, and send *"Can you review some code for me?"* — check
   the response header to see whether the Router picked your agent. If it didn't, sharpen the
   description and try again in a few interactions.

You've now built and routed to your first agent — the core loop of the whole platform.

## ✅ Do
- [ ] Load `chat/README.md`, `chat/routing.md`, `agents/README.md`, `agents/creating.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive + the Debate audio
- [ ] Complete the 🛠 create-a-Code-Reviewer-and-route-to-it task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

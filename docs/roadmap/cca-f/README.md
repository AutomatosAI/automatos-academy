# CCA-F — Claude Certified Architect, Foundations (Anthropic)

**Anthropic's first official technical credential — an external, proctored exam. Status: LIVE.**
The academy preps you for it (via mock exams and these NotebookLM notebooks); Anthropic issues the
real cert. Blueprint: five domains weighted **D1 27% · D2 18% · D3 20% · D4 20% · D5 15%**, scored
100–1000 (720 to pass), 60 single-answer questions in 120 min, 4 of 6 scenarios presented.

## Modules

- [ ] 00 — Overview: blueprint, scoring & exam strategy → [prompts](./00-overview.md)
- [ ] 01 — Agentic Architectures (D1, 27%) → [prompts](./01-agentic-architectures.md)
- [ ] 02 — Tools & MCP (D2, 18%) → [prompts](./02-tools-mcp.md)
- [ ] 03 — Agent Ops & Claude Code (D3, 20%) → [prompts](./03-agent-ops-claude-code.md)
- [ ] 04 — Prompt Engineering (D4, 20%) → [prompts](./04-prompt-engineering.md)
- [ ] 05 — Context & Reliability (D5, 15%) → [prompts](./05-context-reliability.md)

The **filled reference pack** (the same video prompts, minus the module framing) is
[`../../video-prompts/cca-f-video-prompts.md`](../../video-prompts/cca-f-video-prompts.md).
The track content — lesson bodies, resources, task statements — lives in
[`../../../public/content/anthropic/cca-f/`](../../../public/content/anthropic/cca-f/).

## The workflow — do this per module

1. Open the module file (e.g. `cca-f/02-tools-mcp.md`).
2. In NotebookLM, create a notebook and **add the sources** the file lists.
3. **Video:** paste the *Video Overview* prompt → Customize → generate → tune to **~8 min**.
   Heavy domains (D1) have several video blocks — do one notebook + video per block.
4. **Audio:** paste the *Deep Dive* prompt to learn, and the *Brief* prompt to revise (this is an exam track).
5. Download → host (self-host `.mp4`/`.mp3` under `public/content/anthropic/videos/` or YouTube-unlisted)
   → register in the domain file's `videos[]` with its `sourceNotebook`.
6. Tick the module off in this README.

## Media per module (always)

- **1 × Video** (~8 min, one per weighted objective — D1 gets 3, D2–D4 get 2, D5 gets 2).
- **Audio:** **Deep Dive** (learn the domain) + **Brief** (revise the week before the exam).

## Every module also has "Apply it in Automatos"

Each module ends by showing how to do the same agentic pattern **inside Automatos** — build the loop,
design the tools, wire the missions/memory in the platform. That's the awareness thread: teach the
CCA-F skill, then show Automatos doing it.

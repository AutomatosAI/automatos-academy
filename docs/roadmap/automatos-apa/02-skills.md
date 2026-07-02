# Automatos · Module 02 — Skills: the library, the signature agents, authoring a `SKILL.md`

**Type:** Free training (no exam)  ·  **Goal:** understand what a skill is, browse the 128-skill
library and the 9 signature agents, assign a skill to an agent, and author a minimal `SKILL.md`.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/marketplace/capabilities.md` — Plugins vs Skills; what a skill is; installing/assigning
- `automatos-gitbook/marketplace/agents.md` — pre-built agent configs (prompt + model + skills)
- `automatos-gitbook/agents/README.md` + `automatos-gitbook/agents/creating.md` — where skills attach to an agent
- Repo for grounding: `automatos-skills` — `README.md` (128 skills, 16 groups, the 9 signature agents) + `SKILL-GUIDE.md` (the author format)

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who has an agent (Module 01) and now wants to make it good at a
specific job. Teach what skills are and how to use them, grounded in the sources.

Cover ONLY, in order:
1. What a skill IS: a git-based capability defined by a SKILL.md file — instructions, process,
   formats, and guardrails that get injected into an agent's system prompt. It teaches an agent HOW
   to do a job without a playbook micromanaging every tool call. Contrast with a Plugin (a bundle:
   skills + commands + agent configs + prompt templates) and a Tool (an external app action).
2. The library: 128 skills organised into 16 groups (engineering, quality, design, content, social,
   marketing, sales, product, analytics, devops, research, support, people-ops, integrations,
   shopify, and the signature team). You install a skill from the Marketplace → Capabilities → Skills
   tab, then assign it to agents.
3. The 9 signature agents (from automatos-skills/README.md) — say each one's beat in a sentence:
   SENTINEL (infra watchdog, 15-min heartbeat), PATCHER (end-to-end bug fixing), SCOUT (lead
   intelligence), HARPER (content machine), ECHO (customer support), ATLAS (business intelligence),
   FORGE (playbook builder), ORACLE (knowledge curator), RALLY (community growth).
4. Authoring a SKILL.md (SKILL-GUIDE.md): the YAML frontmatter (name, description, version, tags,
   category: agent-role, and a tools list where each tool has a real Automatos tool name +
   description) and the four required body sections — Identity, Workflow (numbered steps with JSON
   tool calls and realistic params), Output Format, and What NOT To Do. Mention the quality bar:
   60–100 lines, every line actionable, tool names must be real (platform_*, workspace_*,
   composio_execute).

~8 minutes: open with "a skill teaches an agent how to do a job," show the library + a signature
agent, then walk the anatomy of a SKILL.md end to end. Stay in the sources; do not invent skills,
tool names, or agents.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, hands-on, teaching a builder to author a real SKILL.md. Walk SKILL-GUIDE.md section by
section: the required frontmatter fields; the tools list and why tool names MUST be real Automatos
tools (reference the platform tool table — platform_get_system_health, platform_submit_report,
platform_search_memory; workspace_read_file / workspace_grep / workspace_exec; composio_execute for
external apps); then the body — Identity, Workflow with JSON tool calls and realistic parameters,
Output Format template, What NOT To Do anti-patterns. Use SENTINEL and SCOUT as the two reference
patterns (monitoring/DevOps vs sales/outreach). Explain how skills relate to Plugins and to the
agent create flow (Step 5: tools and skills). Ground strictly in automatos-skills/README.md,
SKILL-GUIDE.md, and the agents docs.
```

## 🛠 Try it now (on the free platform)
Give an agent a skill, then draft your own:
1. **Marketplace → Capabilities → Skills.** Browse and **Install** a skill that matches your Code
   Reviewer (something engineering/quality-flavoured).
2. Open your agent (**Agent Details → Plugins/Skills**) and **assign** the installed skill. Chat-test
   it and notice the sharper, more structured behaviour.
3. Author a **minimal `SKILL.md`** for a role you care about (say a "Release Notes Writer"), following
   `SKILL-GUIDE.md`: YAML frontmatter (name, description, version, `tags`, `category: agent-role`, a
   `tools:` list of 3–6 real Automatos tools) + the four body sections (Identity, Workflow with JSON
   tool calls, Output Format, What NOT To Do). Keep it 60–100 lines.
4. Add it to your workspace skills and assign it to an agent. You've just taught an agent a new job.

## ✅ Do
- [ ] Load `capabilities.md`, `marketplace/agents.md`, `agents/README.md`, `agents/creating.md` + the `automatos-skills` `README.md`/`SKILL-GUIDE.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 assign-a-skill + author-a-mini-SKILL.md task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

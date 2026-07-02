# Automatos Platform (APA) — Free platform training

**Learn to actually *use* Automatos, end to end — on the free platform.** APA is a self-learning,
awareness track: no proctored exam, no A+ gate, no paid tier to convert to. Progress = modules
completed + the capstone build. Every module teaches one capability from the real product and ends
with a **🛠 Try it now** task you do on the free platform. Blueprint: [PRD-S1-APA.md](../../prds/PRD-S1-APA.md).

> **No exam. Learn by doing.** APA is the deepest expression of the academy-wide *"apply it in
> Automatos"* thread — every other track teaches an external skill then shows Automatos doing it; APA
> *is* that, from your first agent to your first shipped deliverable. Sources are first-party: the
> canonical user docs in [`automatos-gitbook`](../../../../automatos-gitbook/) and the platform repos.

## Modules (one file each — open it, copy the prompt, paste into NotebookLM)

| # | Module | Grounded in (gitbook) | File |
|---|---|---|---|
| 00 | What is Automatos? — concepts, vocabulary & the Command Centre tour | `README`, `about`, `activity` | [`00-overview.md`](./00-overview.md) |
| 01 | Chat, your first agent & the Universal Router | `chat`, `agents` | [`01-chat-first-agent.md`](./01-chat-first-agent.md) |
| 02 | Skills — the 128-skill library, the 9 signature agents, authoring a `SKILL.md` | `marketplace/capabilities`, `agents` | [`02-skills.md`](./02-skills.md) |
| 03 | Knowledge & tools — RAG, Knowledge Graph, CodeGraph, NL2SQL, connect Composio tools | `knowledge/*`, `tools/*` | [`03-knowledge-tools.md`](./03-knowledge-tools.md) |
| 04 | Playbooks & workflows — build, schedule, trigger | `agents/playbooks`, `tools` | [`04-recipes-playbooks.md`](./04-recipes-playbooks.md) |
| 05 | Missions — goal → plan → approve → run | `activity/missions` | [`05-missions.md`](./05-missions.md) |
| 06 | Memory — the five layers + field memory | `activity/memory` | [`06-memory.md`](./06-memory.md) |
| 07 | Deliverables & templates — branded PDF / DOCX / XLSX | `knowledge/templates`, `activity/reports` | [`07-deliverables-templates.md`](./07-deliverables-templates.md) |
| 08 | Channels & surfaces — Slack/Telegram, the widget SDK, Shopify, IDE | `tools/channels`, `api-reference` | [`08-channels-surfaces.md`](./08-channels-surfaces.md) |
| 09 | Governance & ops — budgets, blueprints, RBAC, analytics/cost, workspace isolation | `team/*`, `analytics/*`, `activity/missions` | [`09-governance-ops.md`](./09-governance-ops.md) |
| 10 | Marketplace & the contributor economy (roadmap/beta — "coming") | `marketplace/*` | [`10-marketplace.md`](./10-marketplace.md) |

## What makes this track different

- **No exam, no grade.** No `track.exam{}`, no mock exam, no A+ readiness gate. Optional per-module
  knowledge checks are ungated self-assessment — never pass/fail.
- **Completion = "Automatos-ready":** you can build and run real work on Automatos. The badge is a
  shareable proof of skill, not a conversion metric — it's a free academy.
- **Hands-on by design.** Every module replaces the usual "apply it in Automatos" box with a concrete
  **🛠 Try it now** step you do on the live free platform. The capstone is your first real build.

## The workflow — do this per module

1. Open the module file (e.g. `03-knowledge-tools.md`).
2. In NotebookLM, create a notebook and **add the sources** the file lists (the specific
   `automatos-gitbook` docs for that module + the named repo — nothing extra).
3. **Video:** paste the *Video* prompt → Customize → generate → tune to **~8 min**.
4. **Audio:** paste the *Deep Dive* prompt (learn) and, on judgment modules, the *Debate* prompt.
5. **Do it:** complete the **🛠 Try it now** task on the free platform — that's the real learning.
6. Download the media → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the track's
   `videos[]`. Tick the module off below.

## Media per module

- **1 × Video** (~8 min) — a genuine "here's how you do X in Automatos" walkthrough, grounded in the
  gitbook docs. Not marketing; no mention of tiers or conversion.
- **Audio:** **Deep Dive** (learn) on every module + a **Debate** on the judgment modules (01, 04, 05,
  09 — "agent vs playbook vs mission, when?"; "budgets & approvals — how much autonomy?").

## The "dos" — per module

- [ ] **00 · What is Automatos?** — load `README`+`about`+`activity` → Video + Deep Dive → 🛠 tour the Command Centre
- [ ] **01 · Chat & first agent** — load `chat`+`agents` → Video + Deep Dive + Debate → 🛠 create a Code Reviewer, send it a GitHub link
- [ ] **02 · Skills** — load `capabilities`+`agents` → Video + Deep Dive → 🛠 assign a skill, author a mini `SKILL.md`
- [ ] **03 · Knowledge & tools** — load `knowledge/*`+`tools/*` → Video + Deep Dive → 🛠 upload docs, connect GitHub, ask a grounded question
- [ ] **04 · Playbooks** — load `playbooks`+`tools` → Video + Deep Dive + Debate → 🛠 build & run a 3-step playbook
- [ ] **05 · Missions** — load `missions` → Video + Deep Dive + Debate → 🛠 create a mission, approve the plan, watch it run
- [ ] **06 · Memory** — load `memory` → Video + Deep Dive → 🛠 browse, search, pin a memory
- [ ] **07 · Deliverables** — load `templates`+`reports` → Video + Deep Dive → 🛠 generate a branded report
- [ ] **08 · Channels & surfaces** — load `channels`+`api-reference` → Video + Deep Dive → 🛠 connect Telegram, chat from your phone
- [ ] **09 · Governance & ops** — load `team`+`analytics` → Video + Deep Dive + Debate → 🛠 set a budget, invite a Viewer, read the cost tab
- [ ] **10 · Marketplace** — load `marketplace/*` → Video + Deep Dive → 🛠 install a marketplace agent (note: contributor economy is roadmap/beta)
- [ ] Every video registered in the track `videos[]` with a `sourceNotebook` for re-generation
- [ ] Capstone: ship one real thing on the free platform (an agent + a playbook or mission that
      produces a deliverable) — that's "Automatos-ready"

---

_APA is free platform training. There is no paid tier and nothing to convert to — the goal is a
capable, confident user who becomes an advocate. Teach the platform as it actually works today,
grounded in `automatos-gitbook` and the `automatos-*` repos._

# Automatos · Module 04 — Playbooks & workflows: build, schedule, trigger

**Type:** Free training (no exam)  ·  **Goal:** turn repeatable multi-agent work into a Playbook you
can run on demand, on a schedule, or on an external event.

> **Vocabulary:** in Automatos the canonical term for a multi-step workflow is a **Playbook**
> ("Recipe" is legacy). This module builds Playbooks.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/agents/playbooks.md` — what a Playbook is, creating one, the worked example, running & monitoring, webhook triggers
- `automatos-gitbook/tools/README.md` — webhook triggers (Jira/GitHub/Slack) and cron scheduling
- `automatos-gitbook/activity/README.md` — where runs show up (Dashboard schedule + Feed)
- Repo for grounding: `automatos-skills/team/forge/` — FORGE, the signature "playbook builder" agent

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who has done a task once by hand and now wants it to run itself. Teach
Playbooks, grounded in the sources. This is a "build a workflow, then schedule and trigger it"
walkthrough.

Cover ONLY, in order:
1. What a Playbook IS: an ordered list of steps, each assigned to an agent, plus inputs, flow control
   (conditionals/branching/error handling), and an optional schedule. Each step can read the previous
   step's output via the workflow pipeline (a scratchpad for intermediate state).
2. Build one on screen (agents/playbooks.md create flow): name + description → add steps, assigning
   each to an agent → configure inputs and flow control → Save. Use the canonical worked example:
   Nightly Code Review — Step 1 Scout pulls latest commits, Step 2 Code Reviewer reviews each, Step 3
   Sentinel runs a security scan, Step 4 Scribe writes a summary, Step 5 Comms posts it to Slack.
3. Three ways to run it: Manual (click Run, fill inputs), Scheduled (a cron expression, e.g.
   0 9 * * 1-5 weekdays 9am, 0 */6 * * * every 6 hours), or From Chat ("Run the nightly code review
   playbook" and the Router triggers it).
4. Webhook triggers: an external event fires a Playbook automatically — Jira issue created, GitHub
   push/PR, Slack message. The platform registers the webhook URL with the service for you.
5. Monitoring: active runs appear in Activity → Dashboard (schedule + live status) and Activity → Feed
   (step-by-step log); success rates and duration live in Analytics → Workflows.

~8 minutes: open with "do it once, then let it run," build the 5-step example, then show scheduled +
webhook triggers and where to watch it. Stay strictly in the sources; do not invent step types, cron
behaviour, or trigger sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, coaching a builder to design a reliable multi-agent Playbook. Go deep on: step
design and agent assignment; passing data between steps through the pipeline scratchpad; flow control
and error handling; the three run modes (manual, cron-scheduled, from-chat) with real cron patterns;
and webhook triggers (Jira/GitHub/Slack) including that the platform auto-registers the webhook URL.
Cover where runs surface (Dashboard schedule, Feed log, Analytics → Workflows). Bring in FORGE — the
signature agent that turns natural language into a multi-step workflow with agent assignments and
triggers — as the "describe it and it drafts the Playbook" path. Ground strictly in
agents/playbooks.md, tools/README.md, activity/README.md.
```

## 🎧 Debate (judgment) — NotebookLM → Audio → Customize
```
Two expert hosts debate the central Automatos design choice: "For a given piece of work, do I use a
single agent in Chat, a Playbook, or a Mission?" Frame it precisely from the sources: a Playbook is a
DEFINED, ordered workflow you author and can schedule/trigger (deterministic steps, repeatable); a
Mission is an autonomous OBJECTIVE where an agent plans the steps, you approve, and it executes (open-
ended, one-off); plain Chat is a single agent answering now. Argue the trade-offs: predictability and
reuse (Playbook) vs flexibility and planning (Mission) vs speed and simplicity (Chat). Note the bridge
— a completed Mission can be "Saved as Routine" to become a Playbook. Land on a decision rule a new
user can apply. Ground strictly in agents/playbooks.md and activity/missions.md.
```

## 🛠 Try it now (on the free platform)
Build and run a real 3-step Playbook:
1. **Agents → Playbooks → + Create Playbook.** Name it *"Daily Repo Digest."*
2. Add three steps: **Step 1 (Scout)** — pull the latest commits from your connected GitHub repo;
   **Step 2 (Code Reviewer)** — review them for issues; **Step 3 (Scribe)** — write a short summary
   report. Save.
3. **Run it manually** first (click **Run**, fill any inputs). Watch it execute in **Activity → Feed**.
4. Now give it a **cron schedule** (e.g. `0 9 * * 1-5` for weekday mornings). Confirm it appears on the
   **Activity → Dashboard** schedule.
5. Bonus: ask in **Chat** — *"Run the Daily Repo Digest playbook"* — and confirm the Router triggers it.

## ✅ Do
- [ ] Load `agents/playbooks.md`, `tools/README.md`, `activity/README.md` (+ FORGE from `automatos-skills`)
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive + the Debate audio
- [ ] Complete the 🛠 build-and-run-a-3-step-Playbook task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

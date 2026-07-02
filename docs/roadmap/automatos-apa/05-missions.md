# Automatos · Module 05 — Missions: goal → plan → approve → run

**Type:** Free training (no exam)  ·  **Goal:** give your AI team an objective, review the plan it
proposes, approve it, and monitor autonomous execution.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/activity/missions.md` — how Missions work, creating, the lifecycle table, monitoring, budget, save-as-routine, archive search
- `automatos-gitbook/activity/README.md` — the Missions tab in the Command Centre
- `automatos-gitbook/api-reference.md` — the Missions endpoint group (create/approve/reject/pause/resume/cancel/events/costs)
- Repo for grounding: `automatos-ai` — the platform

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user comfortable with agents and Playbooks who now wants the platform to
PLAN the work, not just execute defined steps. Teach Missions, grounded in the sources. This is a
"describe a goal, approve the plan, watch it run" walkthrough.

Cover ONLY, in order:
1. What a Mission IS: an autonomous, multi-step OBJECTIVE that agents plan and execute independently.
   The five-beat loop: you describe what you want → an agent creates an execution plan (tasks +
   milestones) → you review and Approve or Reject → agents execute step by step using tools and
   knowledge → you monitor, and can pause/resume/cancel any time.
2. Create one (missions.md): + New Mission → describe the objective in natural language (be specific)
   → optionally attach files (up to 20 MB) → the system generates the plan. Show good vs vague
   objectives ("Audit all API endpoints for missing rate limiting and create Jira tickets for each
   finding" beats "Check the API security") and including success criteria.
3. The lifecycle table: Plan Pending (approve/reject) → Active (pause/cancel/monitor) → Paused
   (resume, optionally with more budget) → Completed (archive, or Save as Routine) → Cancelled →
   Archived. Emphasise the human-in-the-loop approval gate.
4. Monitoring an active Mission: the task list with per-task status, the event timeline, the cost
   breakdown by task, which agents worked on what, and checkpoints (saved state snapshots). Click a
   task to see its detailed execution log (tool calls, LLM interactions, intermediate results).
5. Budget + reuse: Missions consume tokens; view cost-by-task, pause if costs run high, resume with
   increased budget. A completed Mission can be Saved as Routine → becomes a reusable Playbook.

~8 minutes: open with "give it a goal, not a script," create one objective on screen, show the plan-
approval gate, then the monitoring + budget controls. Stay strictly in the sources; do not invent
statuses, controls, or fields.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, coaching a user to run Missions well and safely. Go deep on: writing a good
objective (specificity + success criteria); the plan-review gate and why approval matters; the full
lifecycle (Plan Pending → Active → Paused → Completed → Cancelled → Archived) and the actions at each
state; monitoring (task list, event timeline, checkpoints, per-task cost) and drilling into a task's
execution log; budget management (cost-by-task, pause, resume-with-increased-budget); and turning a
one-off Mission into a repeatable Playbook via Save as Routine. Mention where stats live (Analytics →
Workflows) and archive search. Ground strictly in activity/missions.md and the Missions API group.
```

## 🎧 Debate (judgment) — NotebookLM → Audio → Customize
```
Two expert hosts debate how much autonomy to hand a Mission. One argues for tight control — small
objectives, careful plan review before approval, low budget ceilings, frequent pause/checkpoint; the
other argues for trusting the agent to plan and run larger objectives end to end. Use only what the
sources support: the plan-approval gate, pause/resume, resume-with-increased-budget, per-task cost
visibility, and checkpoints as the safety rails. Discuss when "let it run" pays off versus when to
keep the leash short (irreversible actions, external side effects, unclear success criteria). Land on
a practical autonomy rule for a new user. Ground strictly in activity/missions.md.
```

## 🛠 Try it now (on the free platform)
Run your first autonomous Mission:
1. **Activity → Missions → + New Mission.** Write a specific objective with a success criterion, e.g.
   *"Review the three documents I uploaded, list every open question they leave unanswered, and write
   a one-page summary report."* (Attach files if useful.)
2. Wait for the **Plan Pending** state → read the proposed task list → **Approve** (or Reject and
   refine the objective).
3. Watch it go **Active**: follow the **task list**, the **event timeline**, and the **cost breakdown
   by task**. Click a task to open its execution log.
4. When it **Completes**, open the deliverable/report it produced. Then click **Save as Routine** to
   turn it into a reusable Playbook.

You've now used the platform's most autonomous mode — goal in, plan approved, work done.

## ✅ Do
- [ ] Load `activity/missions.md`, `activity/README.md`, and the Missions section of `api-reference.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive + the Debate audio
- [ ] Complete the 🛠 create-approve-run-a-Mission task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

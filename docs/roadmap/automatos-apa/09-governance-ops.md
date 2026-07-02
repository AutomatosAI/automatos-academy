# Automatos · Module 09 — Governance & ops: budgets, blueprints, RBAC, analytics/cost, isolation

**Type:** Free training (no exam)  ·  **Goal:** run your workspace safely — control spend, control
who can do what, and read the numbers that tell you what your agents cost and how they perform.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/team/README.md` + `team/roles.md` — roles (Admin/Member/Viewer), the permission matrix, workspace isolation, Context Engineering role
- `automatos-gitbook/analytics/README.md` + `analytics/llm-costs.md` — the seven analytics tabs, cost cards, cost-by-model/agent/time, projections, optimisation tips
- `automatos-gitbook/settings/general.md` — defaults (model/max-tokens/temperature), feature flags, and **Cost alerts** (budget thresholds)
- `automatos-gitbook/activity/missions.md` — per-Mission budget: cost-by-task, pause, resume-with-increased-budget
- `automatos-gitbook/agents/creating.md` — the agent config ("blueprint") that governs each agent's model/persona/tools

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who now runs real work and needs to keep it safe and affordable. Teach
governance + ops, grounded in the sources. This is a "control spend, control access, read the
dashboards" walkthrough.

Cover ONLY, in order:
1. Cost visibility (analytics/llm-costs.md): every LLM call is tracked with input/output tokens,
   model, agent, and estimated cost. Show the cost cards (Total Cost, Total Tokens, Cost Per Request,
   Top Spender), Cost by Model Over Time, and breakdowns By Model / By Agent / By Time, plus Cost
   Projections (monthly estimate, trend, anomaly alerts).
2. Budgets: two levers. Workspace-wide Cost alerts (Settings → General → Features: notify on budget
   thresholds), and per-Mission budget control (Activity → Missions: cost breakdown by task, pause a
   Mission if costs run high, resume with increased budget). Frame budgets as "policy, not vibes."
3. The agent's config as its operating "blueprint" (our teaching term — the user docs just call it
   the agent's configuration; say that once): each agent's model/provider, temperature, max tokens,
   persona, tools and skills (set at creation) bounds what it does and what it costs. Cheaper models
   for simple tasks is the #1 optimisation lever.
4. RBAC (team/roles.md): three roles — Admin, Member, Viewer — and the permission matrix. Everyone can
   chat and view activity; Members create/edit agents, upload docs, run Playbooks, install
   marketplace items; only Admins connect tools, manage the team, access Settings/Analytics-admin,
   manage credentials, and view audit logs. Note the Context Engineering role (edit global prompts,
   orchestrator soul, heartbeat, coordination).
5. Workspace isolation: every workspace is fully isolated — agents, documents, tools, and settings are
   workspace-scoped; members only see their workspace; cross-workspace access is not supported. This
   is the tenancy boundary that keeps teams' data private on a shared instance.

~8 minutes: open with "safety is policy — budgets and roles," walk the cost tab, set a cost alert,
show the roles matrix, and close on workspace isolation as the trust boundary. Stay strictly in the
sources; do not invent roles, permissions, or budget controls.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching an admin to operate a workspace responsibly. Go deep on: reading the
LLM & Costs tab (cards, cost-by-model/agent/time, projections, anomaly alerts) and tracing a cost
back to a conversation/Playbook/Mission; the two budget levers (workspace Cost alerts in Settings,
per-Mission cost-by-task + pause + resume-with-increased-budget); the cost-optimisation tips (cheaper
models for simple tasks, watch Top Spender, check token efficiency); the RBAC matrix (Admin vs Member
vs Viewer) and what each can and can't do, plus the Context Engineering role; and workspace isolation
as the tenancy boundary. Tie "blueprint" to agent creation — model/persona/tools as the per-agent
policy. Ground strictly in team/*, analytics/*, settings/general.md, and activity/missions.md.
```

## 🎧 Debate (judgment) — NotebookLM → Audio → Customize
```
Two expert hosts debate the governance dial: "How much autonomy and budget should you give agents
before a human must approve?" One argues for open budgets and broad Member permissions (velocity,
fewer bottlenecks); the other for tight cost alerts, low per-Mission ceilings, read-only tool scopes,
and Admin-gated tool connections (safety, predictable spend, least privilege). Use only what the
sources support: Cost alerts, per-Mission budget + pause/resume, the Mission plan-approval gate, the
RBAC matrix, tool permission scopes (from Module 03), and workspace isolation. Discuss where the line
sits for irreversible or external-side-effect actions. Land on a starter governance policy a new team
can adopt. Ground strictly in the provided sources.
```

## 🛠 Try it now (on the free platform)
Put guardrails on your workspace:
1. **Settings → General → Features → enable Cost alerts** and set a budget threshold.
2. **Analytics → LLM & Costs.** Read the four cost cards and the Cost by Model Over Time chart; find
   your **Top Spender** agent.
3. **Team Management → + Invite Member** and add someone (or a test address) as a **Viewer**. Compare
   against the roles matrix — confirm a Viewer can chat and view but not create agents or connect
   tools.
4. Open a running or past **Mission** and read its **cost breakdown by task** — that's per-objective
   spend visibility. If one is live and pricey, try **Pause**.

## ✅ Do
- [ ] Load `team/README.md`+`team/roles.md`, `analytics/README.md`+`analytics/llm-costs.md`, `settings/general.md`, `activity/missions.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive + the Debate audio
- [ ] Complete the 🛠 set-a-budget + invite-a-Viewer + read-the-cost-tab task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

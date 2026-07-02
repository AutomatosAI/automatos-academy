# Automatos · Module 00 — What is Automatos?

**Type:** Free training (no exam)  ·  **Goal:** the mental model, the vocabulary, and a tour of the
Command Centre so everything else clicks.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/README.md` — Welcome + the "What can you do?" map + Quick Start
- `automatos-gitbook/about.md` — core ideas, architecture diagram, the Key concepts table
- `automatos-gitbook/activity/README.md` — the Command Centre (Dashboard / Feed / Reports / Memory / Missions)
- Repo for grounding: `automatos-ai` (the platform) — README + `docs/`

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a brand-new Automatos user — technical enough, but they have never opened the product.
Teach them the mental model, not marketing. This is a "here's what Automatos is and how to think
about it" orientation, grounded strictly in the provided sources.

Cover ONLY, in this order:
1. The one big idea: "agents are workers, not chatbots." Each agent has a role (Code Reviewer,
   Sentinel, Scribe), its own model, persona, tools, and skills — it does work, it doesn't just chat.
2. "The platform routes, you don't have to." Every message goes to a Universal Router that picks the
   best agent automatically; you can override it. (Preview only — Module 01 goes deep.)
3. "Knowledge powers everything." Upload documents, sync folders, index code → agents get RAG access.
4. "Visibility is built in." Every action, tool call, and LLM request is tracked and costed.
5. The vocabulary the learner MUST internalise now — read these straight off the Key concepts table:
   Agent, Workspace, Playbook, Skill, Tool, Knowledge Base, Universal Router, Mission, Channel,
   Knowledge Graph, Memory. One crisp sentence each.
6. The tour: walk the Command Centre (Activity) — the four status cards (Working Now, Channels Live,
   Completed Today, Needs Attention) and the five tabs (Dashboard, Feed, Reports, Memory, Missions).
   Point out where the learner will spend their time.

~8 minutes. Open with the "workers not chatbots" idea, do a quick Quick-Start walkthrough (sign in →
create an agent → give it tools → add knowledge → chat), and close with a one-line map: "Agents do
the work, the Router directs it, Knowledge feeds it, the Command Centre shows it." Do not invent
features or screens that aren't in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, friendly and concrete, teaching a first-time Automatos user how the platform is put
together. Walk the architecture diagram from about.md (You → Chat → Universal Router → Agents →
Tools / Knowledge Base / Workspace → Reports). Define every term in the Key concepts table with a
real example ("a Workspace is your team's isolated sandbox — agents, docs, and settings live inside
it and never leak to another team"). Explain the difference between the surfaces they'll use:
Chat (talk to agents), Agents (build the workforce), Activity/Command Centre (watch it run),
Knowledge Bases (feed it), Tools (connect apps). End with the Quick Start as a checklist. Ground
strictly in README.md, about.md, and activity/README.md — no speculation about internals.
```

## 🛠 Try it now (on the free platform)
Sign in (a personal workspace is created automatically on first login) and take the tour:
1. Open **Activity** (the Command Centre). Read the four status cards and click one to drill in.
2. Click through the five tabs: **Dashboard**, **Feed**, **Reports**, **Memory**, **Missions** — just
   to see what lives where.
3. Open **Agents** and look at the starter roster that ships with a new workspace (Code Reviewer, QA
   Engineer, Sentinel, Scribe, Scout, Comms…). Don't create anything yet — Module 01 does that.
4. Open **Chat** and send one message: *"What can you help me with?"* Watch which agent the Router
   picks (shown in the response header). That's the whole platform in one gesture.

You now have the map. Everything from here is "how do I do X" — one module at a time.

## ✅ Do
- [ ] Load `README.md`, `about.md`, `activity/README.md` into a new NotebookLM notebook
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 Command Centre tour on the free platform
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

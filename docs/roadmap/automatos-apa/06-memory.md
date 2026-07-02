# Automatos · Module 06 — Memory: what agents remember (+ the deeper architecture)

**Type:** Free training (no exam)  ·  **Goal:** understand how agents remember, browse/search/manage
stored memories, and know what the deeper memory architecture buys you.

> **Currency note (2026-07-02):** the user docs document a **two-tier** model (short-term /
> long-term) plus scope + consolidation — teach that as live. The five-layer L0–L4 model and field
> memory are **architecture direction** from the design docs — teach them labelled as such, never
> as UI features.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/activity/memory.md` — the Memory tab: how agent memory works, browsing, searching, managing, per-agent scope, the tiers, consolidation, augmentation
- `automatos-gitbook/api-reference.md` — the Memory endpoint group (store/retrieve/augment/consolidate/stats)
- Repo for grounding (deeper model): `automatos-ai/docs/memory-system/five-layer-memory-architecture.md` (L0–L4) + `automatos-ai/docs/PRDS/PRD-166-FIELD-MEMORY-CORE.md` (workspace-persistent field memory)

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who has noticed agents "remember" things and wants to understand and
manage it. Teach the memory system, grounded in the sources. This is a "here's what your agents
remember and how to control it" walkthrough.

Cover ONLY, in order:
1. What agent memory does: agents automatically store important information from conversations and
   tasks — key facts and decisions, task results, user preferences and corrections, and cross-agent
   shared knowledge. Memory persists across conversations, so agents build context over time.
2. The Memory tab (activity/memory.md): browse memory entries (source agent, timestamp, relevance =
   how often recalled); search across all memories with natural-language vector search ("What do we
   know about the auth system?"); manage them — Delete (permanent), Edit (fix factual errors), Pin
   (protect from pruning).
3. Per-agent scope: each agent has its own memory scope PLUS access to workspace-level shared
   memories — so Sentinel's security findings don't clutter Code Reviewer's memory, but shared
   project context is available to all.
4. The tiers — label the two sources honestly. WHAT THE USER DOCS DOCUMENT (teach as live): TWO
   tiers — short-term memory (session-scoped) and long-term memory (persistent) — plus per-agent
   scope, workspace-shared memory, and periodic CONSOLIDATION (merging related facts, removing
   duplicates, strengthening frequently-recalled ones). WHAT THE ARCHITECTURE DOCS ADD (label
   explicitly as "the deeper architecture direction"): the five-layer model — L0 context window →
   L1 working (Redis, ~24h) → L2 short-term → L3 long-term → L4 organisational knowledge
   (RAG/NL2SQL from Module 03).
5. Field memory (PRD-166) — architecture direction, same labelling: a workspace-persistent "field"
   that compounds across Missions (patterns carry provenance, scored by similarity × stability ×
   recency). Frame it as where the platform's long-horizon memory is headed — not a UI surface the
   learner will find today.

~8 minutes: open with "your agents build context over time," show browse + search + pin on the Memory
tab, then explain the tiers as retention windows and close on consolidation + field memory. Stay
strictly in the sources; be clear which details come from the gitbook Memory tab vs the deeper
architecture doc.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching a user how memory actually behaves. Go deep on: how memories are
created (automatic extraction of decisions, preferences, outcomes, shared knowledge); per-agent vs
workspace-shared scope; searching by vector similarity; and managing memory (delete/edit/pin) with
the "delete is permanent" warning. Teach the DOCUMENTED model as live: short-term + long-term tiers,
per-agent vs workspace-shared scope, consolidation. THEN, clearly labelled "the deeper architecture
direction" (design docs, not the user manual): the five-layer model — L0 focus (context window) →
L1 working (Redis, ~24h TTL) → L2 short-term (Postgres, Ebbinghaus-style decay) → L3 long-term
(fact extraction, indefinite) → L4 org knowledge (RAG/NL2SQL tools) — the consolidation/promotion
flow, and field memory (PRD-166): workspace-persistent memory that merges across Missions with
provenance and honest scoring (similarity × stability × recency) and compaction to stay bounded.
Distinguish clearly what a user manages in the UI (the Memory tab) from what the platform manages
automatically — and never present an architecture-doc layer as a UI feature. Ground strictly in
activity/memory.md, the five-layer doc, and PRD-166.
```

## 🛠 Try it now (on the free platform)
Explore and shape what your agents remember:
1. **Activity → Memory.** Browse the entries and note the **source agent**, **timestamp**, and
   **relevance** on each.
2. Run a **natural-language search** across memory, e.g. *"What do we know about the documents I
   uploaded?"* — confirm vector search returns relevant memories.
3. **Pin** one memory you want to keep (protects it from pruning), **Edit** one to correct a fact, and
   note that **Delete** is permanent.
4. Have a short conversation with an agent that states a clear preference (e.g. *"Always format
   findings as HIGH/MEDIUM/LOW."*), then start a **new** chat and check whether it recalls that
   preference — memory working across sessions.

## ✅ Do
- [ ] Load `activity/memory.md`, the Memory section of `api-reference.md`, and the deeper `automatos-ai` memory docs
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 browse-search-pin-memory task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

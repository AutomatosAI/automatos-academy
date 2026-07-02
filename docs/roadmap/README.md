# Automatos Academy — Roadmap (follow this)

A **free** academy: help people learn AI (self-learning) and pull awareness to Automatos AI (marketing).
Every track teaches a skill **and** shows how to do it in Automatos. External-exam tracks prep you (via
the academy's mock exams) for a *real external* exam; the academy itself issues no exams.

**Never touched AI? Start here → [`ai-explained/`](./ai-explained/) (AIX)** — the beginner on-ramp
below both lanes: what an agent is, why so many models, OpenAI vs Claude, context windows, knowledge
graphs, MCP — plain English, then pick a door. ([PRD-B0](../prds/PRD-B0-AI-EXPLAINED.md).)

**Two lanes, one academy** ([strategy review](../STRATEGY-REVIEW-2026-07-02.md)):
- **Operator lane** — *"Run your business with AI."* For owners, team leads, non-technical
  professionals. Start: [`ai-business/`](./ai-business/) (ABF) → want a credential to show for it?
  [`gen-ai-leader/`](./gen-ai-leader/) (Google's business-leader exam — the natural bridge).
- **Practitioner lane** — *"Get certified in AI."* Start by persona:
  developer/architect → [`cca-f/`](./cca-f/) then [`gh-300/`](./gh-300/)/[`gh-500/`](./gh-500/) ·
  security → [`ai-security/`](./ai-security/) · risk/compliance → [`aigp/`](./aigp/) ·
  business leadership → [`gen-ai-leader/`](./gen-ai-leader/) ·
  platform-agnostic → [`cross-vendor/`](./cross-vendor/) · Automatos mastery → [`automatos-apa/`](./automatos-apa/).

**Dogfood principle:** every academy operation is an Automatos showcase where sensible — the
tutor **is** a workspace agent (say so in the UI), fact freshness becomes the *cert-watch*
scheduled mission ([PRD-OPS-FRESHNESS](../prds/PRD-OPS-FRESHNESS.md) §6), and each such system
doubles as APA/ABF teaching material.

## How this folder works

```
docs/roadmap/
  README.md                 ← you are here: the index + the workflow
  <track>/
    README.md               ← that track's module checklist + the "dos"
    00-overview.md          ← blueprint / exam-strategy prompts
    01-<module>.md          ← ONE file per module: paste-ready NotebookLM prompts
    02-<module>.md
    ...
```

One file per module. Open it, copy the prompt block you need, paste it into NotebookLM. Nothing is
buried in a combined document.

## Tracks (by vendor)

| # | Vendor | Track folder | Type | Status | Modules |
|---|---|---|---|---|---|
| **B0** | Automatos | [`ai-explained/`](./ai-explained/) | **free training (Foundations on-ramp)** | **prompts authored** | 11 |
| — | Anthropic | [`cca-f/`](./cca-f/) | external exam | **LIVE** (videos in) | 5 |
| — | GitHub | [`gh-300/`](./gh-300/) | external exam | **LIVE** (videos in) | 6 |
| S0 | GitHub | [`gh-500/`](./gh-500/) | external exam | **DONE** | 6 |
| S1 | Automatos | [`automatos-apa/`](./automatos-apa/) | **free training** | **DONE** | 11 |
| S2 | (cross) | [`ai-security/`](./ai-security/) | skills | **DONE** | 6 |
| S3 | IAPP | [`aigp/`](./aigp/) | external exam | **DONE** | 4 |
| S4 | (cross) | [`cross-vendor/`](./cross-vendor/) | skills | **DONE** | 4 |
| S4b | Google | [`gen-ai-leader/`](./gen-ai-leader/) | external exam | **DONE** | 4 |
| **B1** | Automatos | [`ai-business/`](./ai-business/) | **free training (Operator lane)** | **DONE** | 9 |
| S5 | Cloud | _deferred_ | external exam | later | — |

> **All planned tracks are BUILT** (2026-07-02). "DONE" = track content live on the engine; videos
> flow per module via the NotebookLM prompts in each folder (name files by slot id → CDN →
> `register-videos.mjs --publish`). S4's Gen-AI-Leader exam sub-track ships as its own track
> (`google/gen-ai-leader`); cross-vendor's comparison+portability folded into m4.

PRDs (the "why + blueprint" behind each track) live in [`../prds/`](../prds/). The reusable prompt
framework is [`../NOTEBOOKLM_PROMPTS.md`](../NOTEBOOKLM_PROMPTS.md).

## The workflow — do this per module

1. Open the module file (e.g. `gh-500/02-secret-protection.md`).
2. In NotebookLM, create a notebook and **add the sources** the file lists.
3. **Video:** paste the *Video Overview* prompt → Customize → generate → tune to **~8 min**.
4. **Audio:** paste the *Deep Dive* prompt (and *Brief* for exam tracks, *Debate* for security/governance).
5. Download → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the track's `videos[]`.
6. Tick the module off in the track's `README.md`.

## Media per module (always)

- **1 × Video** (~8 min, one per weighted objective — heavy domains get 2–3).
- **Audio:** **Deep Dive** (learn) + **Brief** (revise, exam tracks) + **Debate** (trade-off topics: security, governance).

## Every module also has "Apply it in Automatos"

Each module ends by showing how to do the thing in Automatos (e.g. "run this GHAS check with a SENTINEL
agent"). That's the awareness thread — teach the skill, then show Automatos doing it.

---

## Module file format (the template every module file follows)

> Worked example — `gh-300/01-copilot-features.md`:

```markdown
# GH-300 · Module 01 — Use GitHub Copilot Features

**Exam tie-in:** D1 Use Copilot Features (30%)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD)
- https://docs.github.com/en/copilot/get-started/features
- https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- The GH-300 study-guide task statements for this domain

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
​```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: choosing the right Copilot surface — completions,
chat, and the Ask / Edit / Agent modes plus Plan Mode — and when to use each. Map every point to what a
candidate must DECIDE on the exam. ~8 minutes: open with why it matters on the exam, one worked example,
the top 2–3 distractors candidates get wrong, and a one-line "on the exam, remember…". Stay strictly
grounded in the provided sources; do not invent feature names.
​```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
​```
Two hosts, expert level, no basics. Teach the D1 "Use Copilot Features" domain for the GH-300 exam:
Ask/Edit/Agent modes, Plan Mode, the coding agent (opens a PR, not a push), CLI, MCP, Spaces, Spark,
code review, and org policies. For each, make the exam decision explicit. Ground strictly in the sources.
​```

## 🎧 Audio — Brief (revise, ~8–12 min)
​```
Tight recap of the must-know D1 distinctions and the top distractors (e.g. Edit vs Agent; agent output
is a reviewable PR). Grounded in the sources. For the week before the exam.
​```

## 🤖 Apply it in Automatos
Show the learner how they'd use these ideas in Automatos — e.g. compose an agent + skills to review a PR,
mirroring Copilot's review flow.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
```

(Real `​```` fences are used in the actual files; the zero-width marks above are only to show the
structure inside this code block.)

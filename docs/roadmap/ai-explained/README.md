# AI Explained (AIX) — the beginner on-ramp

**Never touched AI? Start here.** Vendor-neutral AI literacy in plain English — what an agent is, why
there are so many models, OpenAI vs Claude, what a context window is and why its size matters,
knowledge graphs, MCP — each lesson finishing with a light *"…and in Automatos, here's how you'd see
this."* No exam, no jargon, no experience needed. Blueprint: [PRD-B0-AI-EXPLAINED.md](../../prds/PRD-B0-AI-EXPLAINED.md).

> **Two rules.** (1) **Plain English first, term second** — always ("the AI's short-term memory —
> this is called the *context window*"). No acronym before its plain-language job. (2) **The peek,
> not the pitch** — concepts are taught fully vendor-neutral (OpenAI, Claude, Gemini, Llama all named
> honestly); Automatos appears only as a one-paragraph *"here's how you'd see this"* at the end. The
> promise is *understanding*, not selling.

## Modules (one file each — open it, copy the prompt, paste into NotebookLM)

| # | Module | The confusion it kills |
|---|---|---|
| 00 | [What is AI, really?](./00-what-is-ai.md) | "What even is this thing?" |
| 01 | [What is an agent?](./01-what-is-an-agent.md) | "Agent, chatbot, assistant — same thing?" |
| 02 | [Why so many models?](./02-so-many-models.md) | "GPT, Claude, Gemini, Llama — I'm lost" |
| 03 | [Open vs closed models](./03-open-vs-closed.md) | "Open source vs not — does it matter to me?" |
| 04 | [OpenAI vs Claude vs the rest](./04-which-model.md) | "Which is best? Which should *I* use?" |
| 05 | [The knobs: temperature, tokens & parameters](./05-the-knobs.md) | "What do all these settings mean?" |
| 06 | [Context: the AI's desk](./06-context.md) | "What's a context window and why does size matter?" |
| 07 | [Teaching AI your stuff (RAG)](./07-rag.md) | "How does it know about *my* things?" |
| 08 | [Knowledge graphs](./08-knowledge-graphs.md) | "Everyone says knowledge graph — what is it?" |
| 09 | [MCP, for beginners](./09-mcp.md) | "MCP keeps coming up — what is it?" |
| 10 | [You get it now — where next?](./10-where-next.md) | "OK, I understand AI. Now what?" |

## What makes this track different

- **The bottom rung.** It sits *below* both lanes — after AIX a learner picks a door: **Operator**
  ([AI Business Foundations](../ai-business/) — run your business with AI) or **Practitioner**
  (get certified). Module 10 is the router.
- **Understanding, not homework.** No exam, no capstone build. Completion = "AI-literate": you can
  explain agent / model / open-vs-closed / context / RAG / knowledge graph / MCP in your own words.
- **Honest about the field.** Module 04 refuses to crown a "best" model — the true answer ("it
  depends; and Automatos lets you use any of them with your own key") is also the most disarming
  possible introduction to the platform.

## The workflow — do this per module

1. Open the module file, create a NotebookLM notebook, **add the sources** listed.
2. **Video:** paste the *Video* prompt → Customize → generate → tune to **~6–8 min** (beginners
   won't sit twelve minutes).
3. **Audio:** paste the *Deep Dive* prompt. (No exam Briefs — there's no exam.)
4. Download → upload to the CDN (name the file after its slot id, e.g. `v-m06-1.mp4` — see
   [VIDEO_HOSTING.md](../../VIDEO_HOSTING.md)) → `node scripts/register-videos.mjs --publish`.
5. Tick the module off below.

## Media per module

- **1 × Video** (~6–8 min) — one everyday analogy, plain voice, zero hype.
- **Audio:** **Deep Dive** every module. No exam Briefs.

## The "dos" — per module

- [ ] **00 · What is AI** — Video + Deep Dive
- [ ] **01 · What is an agent** — Video + Deep Dive
- [ ] **02 · So many models** — Video + Deep Dive
- [ ] **03 · Open vs closed** — Video + Deep Dive
- [ ] **04 · Which model** — Video + Deep Dive
- [ ] **05 · The knobs** — Video + Deep Dive
- [ ] **06 · Context** — Video + Deep Dive
- [ ] **07 · RAG** — Video + Deep Dive
- [ ] **08 · Knowledge graphs** — Video + Deep Dive
- [ ] **09 · MCP** — Video + Deep Dive
- [ ] **10 · Where next** — Video + Deep Dive
- [ ] Every video registered in the track `videos[]` with its `sourceNotebook`

---

_AIX is free. It exists so nobody bounces off Automatos because the words scared them. Teach AI
plainly, let the platform be the quiet worked example, and let the learner walk through whichever
door is theirs._

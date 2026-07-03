# PRD — B0: AI Explained (AIX) — the beginner on-ramp

**Status:** proposed (roadmap prompts authored 2026-07-02; content-JSON via swarm after) · **Owner:** Academy · **Last updated:** 2026-07-02
**Shape modelled on:** [PRD-B1-AI-BUSINESS.md](./PRD-B1-AI-BUSINESS.md) (first-party skills track)
**Sits below both lanes** — see [STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md) §3.

## 1. Why

The academy was built top-down: first the **Practitioner** lane (Gerard's own certs), then the
**Operator** lane (ABF — business owners running their business with AI). Both assume the learner
already knows what an *agent*, a *model*, a *context window* or *RAG* is. The real top of the funnel
is the person who **doesn't know the words yet** — "what even is an agent? so many models, I'm
confused; OpenAI or Claude, which is better for me? what's a context window and why does its size
matter? knowledge graphs? MCP?"

AIX is that person's front door: **vendor-neutral AI literacy in plain English**, each lesson
finishing with a light *"…and in Automatos, here's how you'd see this"* peek. They arrive confused
about AI, leave fluent in the vocabulary **and** already oriented in the platform — then choose a
door: [ABF](./PRD-B1-AI-BUSINESS.md) (run my business) or the Practitioner tracks (get certified).
This is the softest, widest-reach expression of "teach what AI can do, then offer the tool."

## 2. Shape — skills track, no exam, light Automatos peek

Same skills-track shape as ABF (no `exam{}`, no weights, no readiness gate). Two rules specific to AIX:

- **Vendor-neutral first.** Every concept is taught as it exists in the world (OpenAI, Claude,
  Gemini, Llama all named honestly; no "Automatos is best" anywhere). The concept is the lesson;
  Automatos is a *worked example at the end*, never the argument.
- **The peek, not the pitch** (owner decision: *light peek*). Each module ends with a short
  **🤝 The Automatos peek** — "here's how this idea shows up in Automatos" — curiosity, one
  paragraph, no homework and no selling. (ABF has the hands-on "Do it now"; AIX deliberately stays
  lighter — the promise is *understanding*, not *shipping*.)
- **Tone (hard rule, inherited from ABF §2):** plain English *before* any term of art
  ("the AI's short-term memory — this is called the context window"). No acronym before its job.
  Assume zero background and zero patience for being talked down to.

**Completion = "AI-literate":** the learner can define agent / model / open-vs-closed / context /
RAG / knowledge graph / MCP in their own words, and knows which door to walk through next. Badge per
[PRD-CREDENTIALS](./PRD-CREDENTIALS.md).

## 3. Curriculum (13 modules — each kills one confusion; memory + text-images-video added 2026-07-02 per owner)

| m | Module | The confusion it kills | slug |
|---|---|---|---|
| 00 | What is AI, really? | "What even is this thing?" | `m00-what-is-ai` |
| 01 | What is an agent? | "Agent, chatbot, assistant — same thing?" | `m01-what-is-an-agent` |
| 02 | Why are there so many models? | "GPT, Claude, Gemini, Llama — I'm lost" | `m02-so-many-models` |
| 03 | Open vs closed models | "Open source vs not — does it matter to me?" | `m03-open-vs-closed` |
| 04 | OpenAI vs Claude vs the rest | "Which is best? Which should *I* use?" | `m04-which-model` |
| 05 | Text, images, video | "Some AIs write, some paint, some film — same thing?" | `m05-text-images-video` |
| 06 | The knobs: temperature, tokens & parameters | "What do all these settings mean?" | `m06-the-knobs` |
| 07 | Context: the AI's desk | "What's a context window and why does size matter?" | `m07-context` |
| 08 | Memory: does it remember me? | "I told it last week — why doesn't it remember?" | `m08-memory` |
| 09 | Teaching AI your stuff (RAG) | "How does it know about *my* things?" | `m09-rag` |
| 10 | Knowledge graphs | "Everyone says knowledge graph — what is it?" | `m10-knowledge-graphs` |
| 11 | MCP, for beginners | "MCP keeps coming up — what is it?" | `m11-mcp` |
| 12 | You get it now — where next? | "OK, I understand AI. Now what?" | `m12-where-next` |

## 4. Content plan (per module — shallow by design)

2 short lessons per module (6–10 min each), one everyday analogy carried through (the AI as a
brilliant new hire; context as a desk; MCP as USB-C), an optional ungated knowledge check, and the
**🤝 Automatos peek**. Signature move: **module 04 stays honest** — there is no single "best"
model; the answer is "it depends, and Automatos lets you use any of them via your own key," which is
both true and the most disarming possible pitch. Module 12 is the router: recap the vocabulary, then
point at the two doors (and name Gen-AI-Leader for anyone who wants a first credential).

## 5. Sources (vendor-neutral explainers + the gitbook for the peek)

No exam → no blueprint. Seeds (verify reachable at authoring/recording time):
- Plain-language vendor intros — Anthropic, OpenAI, Google's **Gen-AI-Leader guide** (already in the
  repo; genuinely beginner-toned), Hugging Face "what is" pages, Ollama (open models),
  `modelcontextprotocol.io` (MCP).
- **`automatos-gitbook`** for every 🤝 peek (about / agents / knowledge / knowledge-graph / tools).
- Honesty rule holds: name real products, don't assert a "best," and mark anything unverifiable.

## 6. Positioning (small growth follow-up, not this pass)

AIX is **lane-neutral** — it feeds *both* doors. On the two-door home
([PRD-GROWTH](./PRD-GROWTH.md) §5), add a thin strip *above* the doors: **"Never touched AI?
Start here → AI Explained."** Manifest lane = `foundations`; it renders in the track grid now and
gets the on-ramp strip when the home is next touched. The path-finder quiz should route
"not technical / just curious" → AIX.

## 7. Build note

Roadmap prompt files (this pass, hand-authored) are ready for Gerard's NotebookLM pipeline
immediately. The content JSON (`public/content/automatos/ai-explained/`) is a **swarm job after the
token reset** — same pipeline as ABF/APA: gitbook-grounded, tone-linted, 3-lens review. Manifest
ships the track **coming-soon** (with notify-me demand capture) until that lands.

## 8. Acceptance (Ready gate)

`npm run validate` green (skills-track shape, no weights) · renders on the surfaces (minus
exam/readiness) · tone rule holds (no unexplained acronym anywhere — spot-check) · every module has
its 🤝 peek grounded in a real gitbook surface · module 04 asserts no single "best" model · module 12
links both doors + Gen-AI-Leader · manifest entry under `automatos` (`trackId: ai-explained`, code
**AIX**, lane `foundations`, `coming-soon` until authored).

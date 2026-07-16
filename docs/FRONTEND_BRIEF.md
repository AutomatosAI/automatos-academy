# Automatos Academy — Frontend Build Brief

> **For:** a design-focused Claude (or any frontend builder). **Paired with:** the backend (Content + authoritative scoring API) being built to the contract in §9 of this doc.
> **Goal:** the most beautiful, interactive, intuitive eLearning experience a person has seen. Premium. Alive. *Science explained to children — but for smart, non-technical adults.*

---

## 1. The bar

This is **A+ prep for A+ people**. The audience is **bankers and executives** — sharp, time-poor, and *not* technical. They will not read a wall of text about "the agentic loop." They need to **see it move and poke it**. Every hard idea should land the way a great museum exhibit lands: a clear picture, one sentence, one interaction.

Three words to hold: **Calm. Confident. Alive.** Not flashy, not gamified-childish — *expensive and effortless*. Think editorial magazine meets a precision instrument, with motion that feels physical and earned.

If a banker opens this and thinks *"this is the most beautiful learning thing I've ever used, and I finally get it"* — you've hit it.

## 2. Stack

- **Next.js (App Router) + TypeScript**, deploy to Vercel.
- **Tailwind v4 + shadcn/ui** for the component system.
- **Framer Motion** for the motion language (§7). **Respect `prefers-reduced-motion`.**
- Data comes from the **Academy API** (§9) — do not hardcode content. Same-origin `/api`, or `NEXT_PUBLIC_ACADEMY_API` base.
- Progress is **local-first** (localStorage) — read/write it through one `useProgress()` hook so the synced backend (the Spine + optional Clerk sign-in, PRD-U1/U2 — already live on the vanilla SPA) drops in without touching components.

## 3. Audience translation — "in plain terms"

Every technical concept gets a one-line **banker analogy** rendered as a styled aside. Examples (extend per lesson):

| Concept | In plain terms |
|---|---|
| Single call vs workflow vs agent | A clerk answering one question · a fixed process · a junior you delegate judgement to |
| Agent → Session | A signed **master agreement** (set up once) vs each individual **trade** under it |
| Prompt caching | **KYC once**, reuse it — re-checking identity every transaction is wasteful |
| Context window | The **briefing pack** has a page limit; past it, things fall out |
| Compaction | Summarising the file so the essentials survive when the pack is full |
| The A+ gate | Like a **fit-and-proper** bar: not "attended the course" — *demonstrably competent* |

The frontend should make these first-class, not footnotes.

## 4. Brand tokens (use exactly — this is the Automatos house style)

```
--serif: "Instrument Serif", serif;        /* display, used italic */
--sans:  "Geist", sans-serif;              /* body */
--mono:  "Geist Mono", monospace;          /* labels, uppercase, letterspaced */

Bone (light, default):  bg #F2EDE4 · panel #ECE6D9 · fg #0F1411 · muted #6E6960
                        rule rgba(15,20,17,.14) · accent oklch(0.45 0.06 155) [muted green]
Pitch (dark):           bg #0E1311 · panel #161C19 · fg #EFE9DD · muted #8A857C
                        accent oklch(0.80 0.11 95) [warm gold]
```

Hairline rules, square corners, generous whitespace, serif-italic display headings, mono uppercase kickers. Theme toggles bone/pitch and **persists to the shared `automatos-mood` localStorage key** (so it matches the main automatos.app site). The signature object is the **grade seal** — a circular, wax-seal-like badge that shows the letter grade (A+ … F); make it gorgeous and let it **stamp** into place.

Fonts load from Google Fonts (Instrument Serif ital, Geist 300–700, Geist Mono).

## 5. Surfaces & routes (the IA is proven — keep it)

| Surface | Route | Notes |
|---|---|---|
| Catalog + the model | `/` | Hero + the **Learn → Build → Decide → Prove → Ready** spine + track cards |
| The model (explainer) | `/method` | What the pedagogy is + what A+ means |
| Track / curriculum | `/t/[vendor]/[track]` | Weighted domain map (domain card size/share ∝ exam weight) |
| Domain | `…/domain/[id]` | Lessons, scenarios, labs, sources, videos for the domain |
| Lesson | `…/lesson/[domain]/[lesson]` | Reader + **interactive figure** + plain-terms aside + inline knowledge check |
| Domain quiz | `…/quiz/[domain]` | Prioritised practice, immediate feedback |
| Scenario sim | `…/scenario/[id]` | Branching decisions, graded rationale, debrief |
| Mock exam | `…/exam` | 60 Q · 120 min · /1000 · pass 720 · 4-of-6 scenarios |
| Readiness | `…/readiness` | Grade seal, per-domain mastery, A+ verdict, review queue |
| Library / Videos | `…/library`, `…/videos` | Annotated sources · NotebookLM hub (YouTube embeds + placeholders) |

Use real URLs (history routing) for SEO — bankers will share lesson links. The current prototype uses hash routing; the React build should use proper routes.

## 6. The signature — interactive explainer figures ("science for bankers")

This is what makes it *amazing*. Build a small library of **poke-able SVG/canvas figures**, each with a one-line caption and a plain-terms aside. Minimum six:

1. **The tier ladder** — a slider/stepper from *Single call → Workflow → Agent*; as you move it, cost/latency/flexibility bars respond and a worked example morphs. Teaches "pick the cheapest tier that works."
2. **The agentic loop** — step through *send → tool_use → execute → tool_result → repeat → end_turn*; each click advances the cycle and lights the active edge. A "refusal/​pause" branch you can trigger.
3. **Agent → Session press** — drag a "Session" onto an "Agent"; show that model/system/tools live on the Agent (the master agreement), the Session just references it. Try to put tools on the Session → it bounces back with the rule.
4. **Cache-prefix track** — a row of blocks (tools · system · messages). **Click any block to edit it** and watch everything *after* it flash "invalidated." Teaches the prefix-match rule viscerally. Toggle a `datetime.now()` in the system block → cache never hits.
5. **Context vessel** — a filling beaker of tokens; as it nears the top, hit **Compact** and watch it condense (essentials kept, detail summarised) vs **Truncate** (oldest silently dropped — show what was lost).
6. **Fan-out race** — *serial vs parallel* sub-agents racing across N files; a stopwatch shows wall-clock. Teaches when delegation pays.

Each figure is reusable, self-contained, keyboard-operable, and reduced-motion-aware. These are the "exhibits." Lean into them.

## 7. Motion language

Restrained and physical. Suggested:

- **Route/section entrances:** content fades + rises 8–12px, staggered for lists (~40ms).
- **Progress rings:** animate the arc fill on mount/update.
- **Grade seal:** scales in with a slight overshoot + a soft "stamp" settle; A+ gets a subtle shimmer.
- **Numbers:** count up (scores, mastery %, token counts).
- **Exam timer:** calm until <5:00, then a gentle pulse (never anxiety-inducing).
- **Option select:** spring; correct = soft green wash, wrong = brief shake.
- **Interactive figures:** spring-based, draggable where noted.

Everything behind `prefers-reduced-motion: reduce` collapses to instant.

## 8. The A+ readiness model (render this faithfully)

The product's spine. The backend computes it (§9) — you render it:
- One **grade seal** (A+ … F). **A+ is the only qualifying grade** = ≥90% weighted mastery **and** a full mock passed at ≥800/1000.
- Per-domain **mastery bars** (blueprint-weighted), each with its own sub-grade.
- An **honest verdict**: a headline + exactly what's missing to reach A+ + the weakest domain + review-due count. Never flatter — "B+ — not yet qualified" is the right tone.

## 9. API contract (FROZEN — both halves build to this)

Same-origin REST/JSON under `/api`. The backend wraps the proven engine. Shapes mirror the content model already in the repo.

```
GET  /api/catalog
  → { title, tagline, vendors:[ { id, name, tracks:[ {
        trackId, name, code, status:"live"|"coming-soon", flagship?, domains, summary,
        exam:{ questionCount, durationMinutes, passingScore, scoreScale } } ] } ] }

GET  /api/tracks/:vendor/:track
  → full tree for rendering curriculum/lessons/library/videos:
    { vendorId, trackId, vendorName, name, code, summary,
      exam:{ questionCount, durationMinutes, passingScore, scoreScale, proctored, closedBook,
             scenarioPool, scenariosPresented, recommendedPrep },
      officialResources:[ Resource ],
      domains:[ { id, order, code, name, weight, tagline, overview, objectives:[String],
        lessons:[ { id, title, estMinutes, objective, body /*markdown*/,
                    knowledgeCheck:[ Question ] } ],
        questions:[ Question ],            // practice bank (includes correct flags — for instant feedback)
        scenarios:[ Scenario ], labs:[ Lab ], resources:[ Resource ], videos:[ VideoRef ] } ] }

POST /api/tracks/:vendor/:track/exam/build      // server assembles the weighted mock
  → { examId, total, durationSec, scenarioIds:[String],
      items:[ { id, domainId, type, difficulty, stem, scenarioContext?,
                options:[ { id, text } ] } ] }   // NOTE: no `correct` flags — integrity

POST /api/tracks/:vendor/:track/exam/score
  body { examId, responses:{ [itemId]: [optionId,...] } }
  → { scaled /*0–1000*/, passed, correct, total,
      perDomain:{ [domainId]:{ name, correct, total } },
      review:[ { id, stem, options, your:[optionId], correctOptionIds:[optionId],
                 isCorrect, explanation } ] }

POST /api/tracks/:vendor/:track/readiness        // stateless: client posts its local progress
  body { progress:{ lessonsDone:[lessonId], questionStats:{ [qid]:{ seen, correct } },
                    bestMock?:{ scaled, passed } } }
  → { grade, qualified, overallMastery /*0–1*/,
      perDomain:[ { id, name, weight, mastery, grade } ],
      verdict:{ headline, next, reasons:[String] }, dueCount }

Types:
  Question  = { id, domainId, type:"single"|"multi", difficulty:1|2|3, stem /*md*/,
                options:[ {id, text, correct?} ], explanation /*md*/, sourceRefs:[String] }
  Scenario  = { id, title, tagline?, context /*md*/,
                steps:[ { id, prompt, choices:[ {id, text, verdict:"best"|"viable"|"wrong",
                          rationale /*md*/, next?} ] } ] }
  Resource  = { id, title, url, kind, annotation /*md*/, domainIds:[String], official? }
  Lab       = { id, title, goal, steps /*md*/, checklist:[String] }
  VideoRef  = { id, title, provider:"youtube", url, status:"published"|"placeholder", domainIds:[String] }
```

Notes for the frontend:
- **Markdown** fields (`body`, `explanation`, `rationale`, `context`, `annotation`) are GitHub-flavoured-ish; render with a sanitising renderer (e.g. `react-markdown` + `rehype-sanitize`).
- **Scenario** scoring (best=1 / viable=0.5 / wrong=0) and the **debrief** can be computed client-side from the `verdict`s, or post to a future `scenario/score` — client-side is fine for this phase.
- **Exam integrity:** the exam endpoints don't ship `correct` flags and score server-side. (The practice bank does include answers for instant feedback; fully sealing the bank is a later step that needs accounts.)

## 10. Reuse vs discard

**Reuse** (the lasting value of the prototype):
- The **brand tokens** (§4), the **IA/surfaces** (§5), and the **A+ model** (§8).
- The **content** — it's served by the API; never re-author it in the frontend.
- The **engine logic** is already proven (`public/js/engine/*.js`, 22 passing tests) and is being reused by the backend — so scoring/readiness/exam-assembly behaviour is authoritative and identical to what's tested.

**Discard:** the vanilla-JS DOM rendering (`public/js/views/*`, `app.js`, `academy.css`) — it was the Phase-1 prototype that proved the model. The React build replaces the *presentation layer* entirely; keep its IA and brand, not its markup.

## 11. Definition of done

- All surfaces in §5, rendered from the API, beautiful in both bone and pitch.
- The six interactive figures (§6) live and embedded in the relevant lessons.
- Mock exam: real countdown, jump-grid, server-scored, /1000 result + full explained review.
- Readiness: animated grade seal + honest A+ verdict.
- Motion language (§7) throughout; reduced-motion clean; Lighthouse a11y + perf strong; keyboard-operable (A–D to answer, etc.).
- A banker can go from `/` to "I get it and I know if I'm ready" without confusion.

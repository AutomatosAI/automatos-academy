# GAL — Generative AI Leader (Google Cloud)

**A real, self-enrollable proctored exam — business-leader audience. Status: track authored (swarm),
videos pending.** $99 · 90 minutes · 50–60 MCQ · no prerequisites · valid 3 years. Four official
sections weighted **D1 30% · D2 35% · D3 20% · D4 15%** (verified from the official exam guide PDF).
Google does **not** publish a passing score — the Academy mock uses its own 70% training bar and says
so. The academy preps you; Google issues the credential.

> Audience note for every prompt: **business leaders, not engineers** — strategic, plain, precise.
> The natural bridge track after [ABF](../ai-business/) for anyone who wants a real credential.

## Modules

- [ ] 00 — Overview: blueprint, format & exam strategy → [prompts](./00-overview.md)
- [ ] 01 — Fundamentals of gen AI (D1, 30%) → [prompts](./01-fundamentals.md)
- [ ] 02 — Google Cloud's gen AI offerings (D2, 35%) → [prompts](./02-google-offerings.md)
- [ ] 03 — Techniques to improve gen AI output (D3, 20%) → [prompts](./03-improve-output.md)
- [ ] 04 — Business strategies for gen AI (D4, 15%) → [prompts](./04-business-strategy.md)

The track content — lesson bodies, task statements, resources — lives in
[`../../../public/content/google/gen-ai-leader/`](../../../public/content/google/gen-ai-leader/).
The original planning file is [`../cross-vendor/05-gen-ai-leader-exam.md`](../cross-vendor/05-gen-ai-leader-exam.md);
this folder supersedes it for media production.

## The workflow — do this per module

1. Open the module file, create a NotebookLM notebook, **add the sources** listed.
2. **Video:** paste the *Video Overview* prompt → Customize → generate → tune to **~8 min**
   (D2 is the heavy domain — it gets 2 videos).
3. **Audio:** paste the *Deep Dive* prompt to learn and the *Brief* prompt to revise (exam track).
4. Download → upload to the CDN (name the file after its slot id, e.g. `v-d2-1.mp4` —
   see [VIDEO_HOSTING.md](../../VIDEO_HOSTING.md)) → `node scripts/register-videos.mjs --publish`.
5. Tick the module off here.

## Media per module (always)

- **1 × Video** (~8 min; D2 gets 2 — one per major product family).
- **Audio:** **Deep Dive** (learn) + **Brief** (revise, the week before the exam).

## Every module also has "Apply it in Automatos"

Leader-level: each module ends by connecting the exam concept to something the learner can *see* in
Automatos (grounding → upload a doc and watch cited answers; agents → run a mission with approval).
Teach the Google exam skill, then show the concept living in the platform they already use.

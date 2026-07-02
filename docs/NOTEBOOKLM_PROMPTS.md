# NotebookLM prompt framework — exam-focused video overviews

This is the missing companion to [VIDEO_PIPELINE.md](./VIDEO_PIPELINE.md). The pipeline says
*"create a Video Overview and iterate the focus/prompt until the narrative matches the objective"* —
this doc gives you the **reusable prompt** so every video lands exam-focused, ~8 minutes, and on a
single objective. Per-track filled packs live in [`video-prompts/`](./video-prompts/).

## Principles

- **One objective per video.** Short and sharp beats comprehensive (per VIDEO_PIPELINE).
- **Exam-focused, not a lecture.** Every video ties back to a domain and its exam task statements.
- **~8 minutes.** Achieved by scoping tightly *and* steering with the customization prompt — not by
  cramming a whole domain in.
- **Grounded.** Sources are the lesson `body` text + the domain's official docs (`resources[]`).
  No outside claims.

## Step 1 — Assemble the notebook (one notebook per video, or per domain)

Add exactly these sources to a NotebookLM notebook, nothing extra:

1. The **lesson `body`** markdown for the objective (paste as text, or the domain's lesson bundle).
2. The **official docs** the lesson cites — pull the URLs from that domain's `resources[]`
   (`kind: official-doc | spec | learning-path`). Add the pages, not the whole site.
3. The **exam task statements** for the domain (from the track's blueprint / exam guide).
4. Optional: your own **teaching notes** (analogies, gotchas) as a short text source.

> Keeping the notebook to one objective's sources is what keeps the Video Overview from rambling.

## Step 2 — Generate the Video Overview with this customization prompt

In NotebookLM → **Video Overview → Customize**, paste the prompt below with the four
`[[BRACKETS]]` filled. This is the reusable template:

```
Audience: a smart professional studying for the [[EXAM CODE + NAME]] certification —
capable but not necessarily an expert in this area. Explain plainly first, then precisely.

Objective of THIS video (cover only this): [[ONE LESSON OBJECTIVE, one sentence]].

Exam tie-in: this maps to domain [[Dn — DOMAIN NAME (weight%)]]. Frame the content around the
exam task statements: [[2–4 TASK STATEMENTS]]. For each key point, make clear what a candidate
must be able to DECIDE or DO on the exam — not just define.

Shape: ~8 minutes. Open with why this matters on the exam, walk through the objective with one
concrete worked example, call out the top 2–3 distractors/mistakes candidates get wrong, and
close with a one-line "on the exam, remember…" takeaway.

Stay strictly grounded in the provided sources. Do not introduce APIs, parameters, feature
names, or facts that aren't in the sources. If the sources conflict, prefer the official docs.
```

Iterate the prompt (regenerate) until the narrative matches the objective and lands near 8 minutes.
If it drifts long, tighten the objective or split into two videos.

## Step 3 — Export, publish, register

Download the MP4, then either **self-host** it (the established CCA-F choice — drop it under
`public/content/<vendor>/videos/` and use `provider: "file"`) **or** upload to YouTube **Unlisted**
and use `provider: "youtube"`. The library player keys off `provider`/URL, so it's a content-only
swap. Fill the placeholder slot in the domain file's `videos[]`:

```jsonc
{
  "id": "v-d1-1",
  "title": "D1 · <topic>",                 // naming: "D<n> · <topic>" so they sort
  "provider": "youtube",                    // or "file" for a hosted mp4
  "url": "https://youtu.be/XXXXXXXXXXX",
  "domainIds": ["d1-<slug>"],              // list every domain it serves
  "sourceNotebook": "<track> / domain <n> / <objective>",  // so you can re-generate
  "status": "published"                     // flip from "placeholder"
}
```

## Audio overviews — Deep Dive / Brief / Debate (gym-listen + revision layer)

NotebookLM also generates **Audio Overviews** — the on-the-go + revision layer. Same
one-notebook-per-objective sourcing as video. Three formats per the roadmap's audio pipeline:

- **Deep Dive** — to *learn* a domain. Load 15–20 substantial sources (source volume drives length,
  not a toggle) for a 30–60 min listen. Customization prompt: the same `[[BRACKETS]]` as the video,
  but ask for a two-host conversational walkthrough that teaches the domain's objectives and exam task
  statements at expert level (skip basics).
- **Brief** — to *revise* before the exam. A tight 8–12 min recap of the must-know distinctions and
  the top distractors. Regenerate one per domain in the week before the exam.
- **Debate / Critique** — for *trade-off* topics (security, governance). Ask the hosts to argue a real
  tension ("is prompt-injection defense solvable?", "which EU AI Act tier applies?") so the listener
  hears both sides.

Keep the persona/customization prompt under ~1,500 chars; expertise = expert. Register audio alongside
the video in the domain's media list (or offer as a downloadable MP3 supplement).

**Per-track media pack = video (~8 min, one per weighted objective) + audio (Deep Dive per domain,
Brief per domain pre-exam, Debate for trade-off domains).** Free-training tracks (APA, skills tracks)
use the same media but frame audio as "Deep Dive to learn / Debate for the judgment calls" — no exam Brief.

## Coverage math — how many videos, where

Target **10–12 videos per track**, allocated by **exam weight** (heaviest domains get the most).
Always include **one Overview / exam-strategy** video (blueprint + how the exam is scored + how to
sit it). Rule of thumb per domain: `ceil(weight × 10)` videos, min 1, then trim/round to land at
10–12 total. Worked allocations are in each track's video-prompt pack.

## Reuse checklist

- [ ] Notebook contains only this objective's sources (lesson body + official docs + task statements).
- [ ] Customization prompt has all four `[[BRACKETS]]` filled and names the exam + domain + weight.
- [ ] Narrative ties every point to an exam decision/action, not just a definition.
- [ ] Runtime ~8 min; one objective; distractors called out.
- [ ] Registered in `videos[]` with `sourceNotebook` for re-generation.

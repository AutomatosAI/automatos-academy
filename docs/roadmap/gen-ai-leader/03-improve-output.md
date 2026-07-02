# GAL · Module 03 — Techniques to improve gen AI model output

**Exam tie-in:** D3 Techniques to improve gen AI model output (20%)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The d3 lesson bodies (from `public/content/google/gen-ai-leader/d3-improve-output.json`)
- Official exam guide PDF — the "Techniques to improve gen AI model output" section:
  https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- The Google Cloud docs pages the d3 resources[] cite (prompting, grounding, tuning)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a business leader studying for the Generative AI Leader exam. Explain plainly first, then
precisely. Cover ONLY D3 (20%): the improvement ladder the exam tests, in order of cost —
(1) better PROMPTING (clear instructions, context, examples — the free lever, always first);
(2) GROUNDING/RAG (connect the model to your own current data so answers cite truth — fixes
"it doesn't know my business", not tone); (3) FINE-TUNING (teach lasting style/format on many
examples — expensive, last resort, doesn't add current facts); plus evaluation and human feedback
as the loop that tells you whether any of it worked, and responsible-AI guardrails as part of
output quality. The exam skill: given a quality problem, pick the CHEAPEST technique that fixes it.
~8 minutes: three problem→technique drills, the classic distractors (reaching for fine-tuning when
grounding is the answer; thinking grounding improves writing style; skipping prompting entirely),
close with the one-line ladder to memorise. Strictly grounded in the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, advisor tone, business-leader listener. Teach D3 as the improvement ladder: prompting
techniques a leader should recognise (instructions, context, examples, decomposition) without
becoming a prompt engineer; grounding/RAG — what it fixes (currency, your-data answers,
verifiability via citations) and what it doesn't (style); fine-tuning — what it fixes (consistent
style/format/domain voice) and its costs; how the three combine; evaluation and human feedback as
the quality loop; and where responsible-AI controls sit in output quality. Drill problem→cheapest-
fix judgment throughout — that's the D3 exam skill. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of D3: the ladder (prompt → ground → tune), what each rung fixes and costs, the
grounding-vs-fine-tuning contrast stated twice, evaluation as the loop, and the top distractors.
For the week before the exam.
```

## 🤖 Apply it in Automatos
The ladder is live in the learner's workspace: ABF m2's five-part brief IS prompting; m3's knowledge
base IS grounding (with citations to check); and the honest note that they never needed fine-tuning
is itself the D3 lesson — most business problems die on the first two rungs.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

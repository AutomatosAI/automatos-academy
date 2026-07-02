# CCA-F · Module 04 — Prompt Engineering & Structured Output

**Exam tie-in:** D4 Prompt Engineering & Structured Output (**20%**)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The D4 lesson bodies (`public/content/anthropic/cca-f/d4-prompt-engineering.json`): roles &
  structured outputs, prompt caching as a prefix match, adaptive thinking/effort/no-prefill,
  instruction-following calibration & eval-driven iteration
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs (`output_config.format` with `json_schema`, `strict:true`; the deprecated top-level `output_format`)
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching (the prefix-match invariant, breakpoint placement, the 4-breakpoint limit, verifying with `usage`)
- https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking (`thinking:{type:'adaptive'}`; why fixed `budget_tokens` is gone on modern models)
- https://platform.claude.com/docs/en/build-with-claude/effort (`low | medium | high | xhigh | max`; why xhigh is the coding/agentic default)
- The CCA-F Exam Guide task statements for **D4** (split system vs user; guarantee output shape without prefill; reason about caching; control reasoning with thinking/effort; calibrate literal instruction-following; iterate on evals)

## 🎬 Video Overview prompt (~8 min) — video 1 of 2: **System vs user, structured output & calibration**
```
Audience: a professional studying for the Anthropic CCA-F architect exam whose prompting habits were
formed on older models. Explain plainly first, then precisely. Cover ONLY: role placement, guaranteed
output shape, and calibrating language for a literal model. First the split, which is load-bearing:
the SYSTEM turn carries the durable stuff — who the model is, the standing rules and context, the
tools' usage policy — and the USER turn carries the clean task for THIS turn only; interleaving
per-turn context into the system prompt both confuses the role boundary and (next video) invalidates
the cache. Second, structured outputs REPLACE the old prefill tricks: don't beg for JSON in prose and
don't prefill an opening brace — constrain the response with output_config.format carrying a
json_schema so the API guarantees it parses, and use strict:true on a tool to validate its arguments
the same way; note two retirements — the top-level output_format parameter is DEPRECATED (use
output_config.format), and assistant PREFILL (a trailing assistant turn to force the shape) returns
400 on modern models. Third, calibration: modern Claude follows the system prompt CLOSELY and
LITERALLY, so aggressive language written to drag reluctant older models ("CRITICAL: YOU MUST always
call search") now OVER-triggers — dial it back to a plain conditional ("Use search when the answer
needs current info"); the flip side is that modern models reach for tools/subagents/memory more
CONSERVATIVELY, so when you WANT that behaviour add explicit "when to use this" triggers in the system
prompt AND in each tool's description. ~8 minutes: open with why precision beats coaxing on this exam,
work one example (a JSON-extraction endpoint moved from prefill to output_config.format), then the top
distractors — prefilling an assistant turn (400) or using the deprecated output_format; leaving
"YOU MUST" language that now over-fires; putting per-turn context in the system prompt. Close with
"on the exam, remember: durable in system, clean task in user, structured outputs not prefill, and
soften literal-following language." Stay strictly grounded in the sources; do not invent parameters.
```

## 🎬 Video Overview prompt (~8 min) — video 2 of 2: **Prompt caching, adaptive thinking, effort & eval-driven iteration**
```
Audience: a CCA-F candidate optimising a real endpoint for cost and quality. Explain plainly first,
then precisely. Cover ONLY: prompt caching as a prefix match, controlling reasoning depth, and
iterating empirically. First the one invariant: PROMPT CACHING IS A PREFIX MATCH — any byte change
anywhere in the prefix invalidates everything after it; the cache key is the exact rendered bytes up
to each cache_control breakpoint, and render order is fixed tools → system → messages (a breakpoint on
the last system block caches tools and system together). Design around it: put STABLE content first
(frozen system prompt, deterministically-ordered tool list) and VOLATILE content last (timestamps,
request ids, the varying question) AFTER the final breakpoint. Teach the silent invalidator: verify
with usage.cache_read_input_tokens — if it reads 0 across requests that should share a prefix,
something non-deterministic is in the prefix (datetime.now(), an early uuid4(), or json.dumps without
sort_keys) — and remember input_tokens is only the UNCACHED remainder, so total prompt =
input_tokens + cache_creation_input_tokens + cache_read_input_tokens; there's a max of 4 breakpoints.
Second, reasoning depth on modern models: use adaptive thinking (thinking:{type:'adaptive'}) plus the
effort dial (output_config.effort: low|medium|high|xhigh|max, default high) — the fixed-budget form
thinking:{type:'enabled', budget_tokens:N} is REMOVED and returns 400, xhigh (added on Opus 4.7) is
the sweet spot for coding/agentic work, low suits subagents/simple jobs, max when correctness
outweighs cost; sampling params temperature/top_p/top_k are likewise removed and 400 — steer with
prompting and effort. Third, iterate empirically: change ONE thing, measure it on a small eval set
before rolling out, and use a mid-conversation system message to steer mid-run WITHOUT breaking the
cache. ~8 minutes: open with why caching and effort are the highest-leverage cost/quality levers,
work one example (a high-volume RAG endpoint: order the prompt, place the breakpoint at the end of the
shared context, verify cache_read>0), then the top distractors — a datetime/uuid silently busting the
cache; trying to set budget_tokens or temperature (400) instead of adaptive thinking + effort; editing
five instructions at once so you can't tell what moved the metric. Close with "on the exam, remember:
stable prefix first + verify cache_read; adaptive thinking + effort not budget_tokens; change one
thing and measure." Stay strictly grounded in the sources; do not invent parameters or limits.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the whole D4 "Prompt Engineering & Structured Output" domain
for the Anthropic CCA-F exam. Cover: the system/user split (durable instructions and standing context
in system, the clean task in user) and why it also protects the cache; structured outputs via
output_config.format with json_schema and strict:true on tools as the replacement for prefill, with
the deprecated top-level output_format and the fact that assistant prefill now returns 400; prompt
caching as a prefix match — fixed render order tools → system → messages, stable-first/volatile-last,
the 4-breakpoint limit, verifying with usage.cache_read_input_tokens, and the silent invalidators
(datetime.now, early uuid4, json.dumps without sort_keys); adaptive thinking (thinking:{type:'adaptive'})
plus the effort dial (low|medium|high|xhigh|max, xhigh the coding/agentic default) and that fixed
budget_tokens and sampling params are removed and 400 on modern models; and instruction-following
calibration for a literal model — dial back "YOU MUST" language that over-fires, dial UP explicit
"when to use" triggers for capabilities you want exercised — plus eval-driven iteration (change one
thing, measure on a small eval set) and steering mid-run with a system message without breaking the
cache. For each, make the exam decision explicit. Ground strictly in the sources; when they conflict,
prefer the official docs.
```

## 🎧 Brief (revise, ~8–12 min)
```
Tight pre-exam recap of the must-know D4 distinctions and top distractors: durable-in-system /
clean-task-in-user; structured outputs (output_config.format + strict:true) not prefill, and prefill
= 400; caching is a prefix match, render order tools → system → messages, stable-first/volatile-last,
verify with cache_read_input_tokens, watch for datetime/uuid/unsorted-json invalidators, max 4
breakpoints; adaptive thinking + effort (xhigh default for agentic) not budget_tokens (400) and not
temperature (400); and change ONE thing, measure on a small eval set. Grounded in the sources. For the
week before the exam.
```

## 🤖 Apply it in Automatos
Ground D4 in how the platform composes prompts. Automatos already follows the exam's rule: the user
message is ALWAYS clean text and durable context lives in SYSTEM messages — the recipe executor
(`_execute_step()` in `api/recipe_executor.py`) puts the task instruction in the user turn and pushes
previous-step data and hints into system messages. Have the learner build a **recipe step that
returns structured output** (a fixed JSON shape via a schema, not a prefill hack), and set an agent's
**effort** for the workload (xhigh for the hard reasoning step, low for cheap subagents). Then show
the **caching win**: keep the frozen system prompt and tool list first, the varying input last, and
confirm cache reads. The exam's "precision over coaxing" is exactly why the platform never crams
per-turn context into the system prompt.

## ✅ Do
- [ ] Load the D4 sources into a new NotebookLM notebook (one per video block)
- [ ] Generate both Video Overviews (roles/structured output/calibration · caching/thinking/effort/evals), each ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio for the domain
- [ ] Download → host → register each in the D4 `videos[]` with its `sourceNotebook`
- [ ] Tick this module off in the track README

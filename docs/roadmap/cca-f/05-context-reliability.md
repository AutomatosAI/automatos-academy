# CCA-F · Module 05 — Context Management & Reliability

**Exam tie-in:** D5 Context Management & Reliability (**15%** — the smallest domain, but what separates
a demo from a production agent)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The D5 lesson bodies (`public/content/anthropic/cca-f/d5-context-reliability.json`): token budgeting
  & the context window, compaction/context-editing/memory, reliability (refusals, retries, provenance,
  honest status)
- https://platform.claude.com/docs/en/build-with-claude/context-windows (window vs `max_tokens` — the output cap is separate from the window)
- https://platform.claude.com/docs/en/build-with-claude/token-counting (use the `count_tokens` endpoint with the target model; never tiktoken)
- https://platform.claude.com/docs/en/build-with-claude/compaction (the trigger threshold and the rule: append the compaction block back every turn)
- https://platform.claude.com/docs/en/build-with-claude/context-editing (prunes stale tool results / old thinking — it does not summarise)
- https://platform.claude.com/docs/en/api/errors (retryable set, SDK auto-backoff for 429/5xx, respect `retry-after`)
- The CCA-F Exam Guide task statements for **D5** (budget the window; pick compaction vs editing vs memory; handle every stop reason incl. refusal; lean on SDK backoff; build provenance & honest status)

## 🎬 Video Overview prompt (~8 min) — video 1 of 2: **Token budgeting, compaction, context editing & memory**
```
Audience: a professional studying for the Anthropic CCA-F architect exam who runs long agents and
conflates the window with the output cap. Explain plainly first, then precisely. Cover ONLY: budgeting
the context window and the three context-lifecycle tools. First, two SEPARATE budgets: the context
window is the total the model can see (tools + system + every message + reserved reply space) — large
on current models (1M tokens) but finite and shared — while max_tokens caps the OUTPUT only and carves
room WITHIN the window; set it too low and the reply truncates (stop_reason "max_tokens"), and running
out of window is a DIFFERENT signal (model_context_window_exceeded). Count tokens the right way: call
the count_tokens endpoint with the SAME model id you'll run (counts are model-specific) and NEVER use
tiktoken — it's OpenAI's tokenizer and undercounts Claude by ~15–20% on prose and more on code, always
erring toward headroom you don't have; leave headroom for output, unpredictable tool results, and
thinking. Second, the three tools and the exam's favourite question — which does what: COMPACTION
summarises earlier context server-side when you near the window (within a session); CONTEXT EDITING
prunes stale tool results / old thinking past a threshold (within a session — it removes, it does not
summarise); MEMORY persists facts the agent reads and writes ACROSS sessions. Then the #1 gotcha:
compaction returns a compaction block in response.content, and you must append the FULL response.content
back — not just response.content[0].text — or you silently throw away the summarised state and re-send
the full uncompacted history. ~8 minutes: open with why this is what keeps a 6-hour agent coherent,
work one example (a hundreds-of-turns support conversation: enable compaction, append the block back,
budget with count_tokens), then the top distractors — confusing max_tokens with the window; estimating
with tiktoken; appending only the compaction text; reaching for compaction when the need is cross-session
memory. Close with "on the exam, remember: window ≠ max_tokens; count with count_tokens; compaction
summarises / editing prunes / memory persists — and append the compaction block back." Stay strictly
grounded in the sources; do not invent thresholds.
```

## 🎬 Video Overview prompt (~8 min) — video 2 of 2: **Reliability — refusals, retries, provenance & honest status**
```
Audience: a CCA-F candidate hardening a high-volume agent for production. Explain plainly first, then
precisely. Cover ONLY: making an agent reliable and truthful, and handling every way a request can end.
First, refusals: a safety refusal is NOT an error — it's a successful HTTP 200 with stop_reason
"refusal", and a PRE-OUTPUT refusal can return an EMPTY content array, so code that reads
response.content[0] unconditionally throws on exactly those responses; always branch on stop_reason
FIRST, and know the full set you must handle: end_turn, tool_use, pause_turn, max_tokens, refusal, and
model_context_window_exceeded. Second, don't hand-roll retries: the SDK automatically retries 429 and
5xx with exponential backoff (default ~2 retries, configurable via max_retries) and RESPECTS the
retry-after header — a custom retry loop usually just fights the built-in one and ignores retry-after,
so configure max_retries rather than disabling it; only hand-roll for genuinely custom behaviour like a
circuit breaker. Third, caching as a reliability lever (not just cost): prompt caching is a prefix
match, render order tools → system → messages, so keep the STABLE prefix first (frozen system prompt,
deterministic tool list) and VOLATILE content last (timestamps, per-request ids, the varying question)
— a datetime.now() in the system prompt silently busts it. Fourth, reliability engineering: information
PROVENANCE (keep sources traceable so claims are verifiable), ESCALATION gates for actions that need a
human, HONEST STATUS reporting (progress claims grounded in evidence, not optimistic narration), and
defending against error propagation so one bad result doesn't cascade. ~8 minutes: open with why the
smallest domain is where demos die in production, work one example (a flaky high-volume endpoint under
rate limits: branch on stop_reason, lean on SDK backoff, keep the cache warm), then the top distractors
— reading content before checking stop_reason on a refusal; writing a retry loop that ignores
retry-after; a per-request timestamp in the cached prefix; reporting success the agent can't evidence.
Close with "on the exam, remember: branch on stop_reason first, trust SDK backoff and retry-after,
stable prefix for the cache, and ground every status claim." Stay strictly grounded in the sources; do
not invent error codes.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the whole D5 "Context Management & Reliability" domain for
the Anthropic CCA-F exam. Cover: the context window vs max_tokens (total visible budget vs the output
cap), model_context_window_exceeded vs max_tokens as distinct signals, counting with the count_tokens
endpoint at the target model and never tiktoken, and leaving headroom; the three context-lifecycle
tools and exactly what each does — compaction summarises near the limit (within a session), context
editing prunes stale tool results/old thinking (within a session), memory persists across sessions —
plus the critical compaction gotcha of appending the full response.content (with the compaction block)
back every turn; and reliability — handling every stop reason (end_turn, tool_use, pause_turn,
max_tokens, refusal, model_context_window_exceeded) with the refusal-before-content rule, leaning on
the SDK's automatic 429/5xx backoff and retry-after instead of hand-rolled retries, using caching as a
reliability lever (stable prefix first), and building in provenance, escalation gates, honest
evidence-grounded status, and defence against error propagation. For each, make the exam decision
explicit. Ground strictly in the sources; when they conflict, prefer the official docs.
```

## 🎧 Brief (revise, ~8–12 min)
```
Tight pre-exam recap of the must-know D5 distinctions and top distractors: window ≠ max_tokens and
model_context_window_exceeded ≠ max_tokens; count with count_tokens (never tiktoken, it undercounts);
compaction summarises / context editing prunes / memory persists, and append the full compaction block
back; branch on stop_reason FIRST (refusal is a 200 with possibly-empty content); trust the SDK's
429/5xx backoff and retry-after; keep the cache's stable prefix first; and ground status claims in
evidence. Grounded in the sources. For the week before the exam.
```

## 🤖 Apply it in Automatos
D5 is the platform's memory-and-honesty layer — much of it was purpose-built. Show the learner
Automatos **compaction and memory** keeping a long mission coherent (the memory-quality work distills
typed outcomes and consolidates contradictions; recall carries facts across sessions — the exam's
memory-vs-compaction distinction, shipped). Point at **honest status**: the platform deliberately
reports real state over optimistic narration (the mission SSE was made honest — no fake "healthy"),
which is CCA-F's provenance/honest-status objective in production. Have them run a long mission and
watch it budget context, persist across sessions, and gate an escalation for a human — then contrast
with a naive agent that truncates blindly and over-reports. The exam's "reliability separates a demo
from production" is precisely why these systems exist.

## ✅ Do
- [ ] Load the D5 sources into a new NotebookLM notebook (one per video block)
- [ ] Generate both Video Overviews (budgeting/compaction/editing/memory · reliability & stop reasons), each ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio for the domain
- [ ] Download → host → register each in the D5 `videos[]` with its `sourceNotebook`
- [ ] Tick this module off in the track README

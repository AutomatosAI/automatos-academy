# PRD-MT-09 — Voice Tutor (SC3) — Stage-2 STUB

**Status:** STUB — full PRD written at Stage-2 scoping (07 §1: entry = Stage-1 exit met). Not buildable from this file.
**Repo:** app + academy (server-side KG retrieval + rate ceiling) · **Wave:** 3

## What is already locked (do not re-litigate at scoping)

- **KG retrieval contract** (04 §6.5 / gap #13): server-side graph over published items + allowlisted source passages; spoken question → concept-node match → answer grounded in already-verified content + citation; no close match → "I don't know". **Online-only; never shipped into content_cache.**
- **F13:** voice-in default with always-available "type instead"; offline → degrade state + queued-text that sends on reconnect (never answered locally); **server-side per-user daily query cap / cost ceiling** at the Spine (MT-02's middleware point), honest degrade on cap.
- Provenance on every answer ("verify against official docs ↗"); Socratic quiz-back mode; wrong-answer→"Explain this" entry from Feed (MT-05 built the affordance).
- Scope boundary surfaced at onboarding (MT-04 copy): exam-domain questions, not general chat.

## Inputs the scoping pass must resolve

- Voice stack (on-device STT vs API; TTS choice) + latency budget (06 risk register names voice latency).
- Whether the tutor rides the existing academy tutor lane (`api.automatos.app` widgets/chat SSE — already proven by the web SPA) with a KG-grounding layer in front, or a dedicated Spine endpoint; cost model per D-level.
- Rate-ceiling numbers (the *mechanism* is locked, the numbers are Stage-2 tuning).
- Stage-1 signal review: what the pilot's "Explain this" tap-through says about demand.

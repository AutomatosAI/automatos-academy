# AI Security · Module 05 — Red-teaming & hardening an LLM gateway *(capstone lab)*

**Type:** Skills track (no exam)  ·  Frame: GAIPS d6/d8 — **LLM10 Unbounded Consumption** + the gateway that enforces defenses across LLM01–09 · **flagship lab**

## 📥 Sources to load into NotebookLM
- The d6/d8 lesson bodies — LLM gateway hardening + red-teaming (from the S2 track content / PRD)
- OWASP LLM Top 10 (2025) — **LLM10 Unbounded Consumption** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — the overview, as the gateway control checklist across LLM01–09: https://genai.owasp.org/llm-top-10/
- MITRE ATLAS — as the red-team technique library: https://atlas.mitre.org/
- GAIPS objectives page (d6 Infrastructure/Gateway, d8 Red-Teaming): https://www.giac.org/certifications/ai-security-platform-security-gaips

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: an engineer ready to put a defensive CHOKE POINT in front of an LLM and then attack it. Explain
plainly first, then precisely. Cover ONLY two things and how they meet: (1) LLM10 Unbounded Consumption —
the risk that unbounded queries, huge inputs, or expensive tool loops cause denial-of-service, runaway
COST, or model theft (be explicit the 2025 title absorbed the old "Model Denial of Service" and now
centres cost/resource exhaustion); and (2) the LLM GATEWAY as the single place to enforce defenses in
depth. Present ONE reference architecture — a proxy every request and response passes through — and layer
controls on it: INPUT filtering + injection detection (LLM01), an allow-listed tool broker (LLM06),
rate/quota/cost limits and input-size caps and loop breakers (LLM10), secret isolation and egress control,
structured OUTPUT validation (LLM05), and logging/observability. Then flip to offense: RED-TEAM the gateway
using MITRE ATLAS as the technique language — direct and indirect prompt-injection attempts, jailbreaks,
system-prompt-leak probes (LLM07), and data-exfiltration attempts — to prove each control fires. ~8 minutes:
open with why a gateway beats scattering controls per-app, build the reference architecture control by
control, run 2–3 red-team probes against it live in narration, name the mistakes (no cost ceiling; logging
prompts with secrets in them; a gateway that filters input but not output; red-teaming once and calling it
done), and close with "the gateway is where the whole track becomes one enforceable thing." Use current
OWASP LLM 2025 titles. Stay grounded; do not invent product features or specific payloads.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the capstone for a skills-track audience: hardening an LLM
gateway and red-teaming it. Walk the reference architecture as a request/response choke point and cover
each control and WHY it's there, mapping to OWASP LLM (2025): input filtering + injection detection (LLM01),
allow-listed tool broker + least privilege (LLM06), rate/quota/cost limits, input-size caps, and loop
breakers for Unbounded Consumption (LLM10), secret isolation + egress control, structured output validation
(LLM05), and observability/logging that never records secrets. Then teach red-teaming as a discipline:
build an attack plan from MITRE ATLAS tactics/techniques (prompt injection direct + indirect, jailbreak,
system-prompt leakage, exfiltration, resource exhaustion), run it, and turn findings into fixes and
regression tests. Emphasise this is the module's PROVE artifact — the gateway-hardening lab is the
capstone, in place of an exam. Ground strictly in the sources; current 2025 titles only.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue: "Does a central LLM gateway make you safer, or is it a single point of failure and
a false sense of security?" One host argues centralisation is the only sane way to enforce injection
filtering, cost limits, tool allow-lists, and output validation consistently — defense in depth at one
auditable choke point. The other argues a gateway becomes a bypassable, over-trusted bottleneck: teams
route around it, it can't understand app-specific context, and "we have a gateway" breeds complacency. Have
them reason over the specific controls (LLM10 cost limits, LLM05 output validation, LLM06 tool broker) and
land on gateway-PLUS-app-controls rather than gateway-instead-of. Ground in the sources; current titles only.
```

## 🤖 Apply it in Automatos — the capstone lab
Harden an Automatos agent/gateway end to end, then red-team it. **LLM10:** set a cost/budget ceiling and
rate limits on the agent (the platform's mission $ budget ceiling and cost controls are this lever) plus
input-size caps and a loop breaker so a runaway plan can't burn spend. **LLM06:** front it with an
allow-listed tool broker — only the blueprint's tools, tightly scoped. **LLM01/LLM05:** injection detection
on input, structured output validation on anything that feeds another system. **LLM07/LLM02:** secrets out
of the blueprint, egress controlled, logs scrubbed of secrets. Then **red-team it** with an ATLAS-derived
plan — indirect injection via a planted RAG doc, a jailbreak, a system-prompt-leak probe, a cost-blowout
attempt — and file each finding as a fix + regression scenario. The hardened-and-red-teamed agent is the
track's capstone "prove" artifact (there is no exam).

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (LLM10 + the overview as a control checklist + ATLAS)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the "does a central gateway make you safer?" Debate (skills track — **no exam Brief**)
- [ ] **Capstone:** harden one Automatos agent (cost ceiling, tool allow-list, output validation, secret isolation) **and** red-team it with an ATLAS plan
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

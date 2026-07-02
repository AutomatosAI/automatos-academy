# AI Security · Module 02 — Prompt injection & improper output handling

**Type:** Skills track (no exam)  ·  Frame: GAIPS d2 — **LLM01 Prompt Injection** (direct + indirect) · **LLM05 Improper Output Handling**

## 📥 Sources to load into NotebookLM
- The d2 lesson body — the LLM01 and LLM05 clusters (from the S2 track content / PRD)
- OWASP LLM Top 10 (2025) — the **LLM01 Prompt Injection** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — the **LLM05 Improper Output Handling** page: https://genai.owasp.org/llm-top-10/
- MITRE ATLAS — LLM Prompt Injection / LLM Prompt Crafting techniques: https://atlas.mitre.org/
- GAIPS objectives page (d2): https://www.giac.org/certifications/ai-security-platform-security-gaips

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: an engineer who has heard "prompt injection" but can't yet cleanly separate the two shapes of it
from the separate downstream problem of trusting model output. Explain plainly first, then precisely. Cover
ONLY two OWASP LLM (2025) risks and the crucial distinction between them: LLM01 Prompt Injection and LLM05
Improper Output Handling. For LLM01, make the direct-vs-indirect split explicit: DIRECT injection is the
user typing "ignore your instructions" straight into the prompt; INDIRECT injection is attacker text hidden
in content the model later ingests — a web page, a PDF, a retrieved RAG document, an email, a tool result —
so the model reads instructions from data. Show why indirect is the scarier one (the attacker never talks
to the app). For LLM05, flip to the OTHER side of the model: even a perfectly-behaved model produces text
that is UNTRUSTED downstream — feed it to a browser and get XSS, to a shell and get command injection, to a
DB and get SQL injection, to an HTTP client and get SSRF. Hammer the framing: LLM01 is "don't trust what
goes IN," LLM05 is "don't trust what comes OUT." ~8 minutes: open with the classic support-bot story where
a poisoned document (indirect LLM01) makes the model emit a malicious link that a downstream renderer runs
(LLM05) — one incident spanning both — then the 2–3 things people get wrong (thinking a blocklist of "bad
phrases" solves injection; using the OLD name "Insecure Output Handling"; treating model output as
trusted because "our model is safe"), and close with the two-line "in your head, remember…" (in = LLM01,
out = LLM05; injection is mitigable, not solved). Use current OWASP LLM 2025 titles. Stay grounded in the
sources; do not invent attack strings or claim any defense is complete.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach LLM01 Prompt Injection (direct AND indirect) and LLM05 Improper
Output Handling as a matched pair for a skills-track audience. For LLM01: the mechanism (the model can't
reliably tell instructions from data), direct vs indirect with concrete carriers (RAG docs, web pages,
tool results, emails), and the layered mitigations that reduce but don't eliminate it — input/output
filtering, privilege separation, marking untrusted content, human-in-the-loop for high-impact actions,
and constraining what the model can DO so a successful injection has a small blast radius. For LLM05: treat
every model output as untrusted input to the next system — context-aware output encoding, parameterised
queries, sandboxed rendering, strict egress, and schema/structured-output validation. Be honest that LLM01
has no complete fix; that's why LLM05, LLM06, and the gateway (Module 05) matter. Ground strictly in the
sources; use current 2025 titles; do not claim any single control is sufficient.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue the track's tentpole tension: "Is prompt-injection defense solvable, or only
mitigable?" One host argues it is fundamentally UNSOLVABLE in the general case — as long as instructions
and data share one channel, a determined attacker gets through, so the only real answer is to assume
injection succeeds and contain the blast radius (least privilege, output validation, human gates). The
other argues it is increasingly TRACTABLE — structured/segmented prompts, classifier guardrails, provenance
tagging, and defense-in-depth push the success rate low enough to be an acceptable engineering risk like
XSS. Make them engage on indirect injection specifically, and land on the honest, unsettled state of the
art. Ground in the sources; current titles only.
```

## 🤖 Apply it in Automatos
Harden one Automatos chatbot agent against LLM01 and LLM05. **Input (LLM01):** confirm the user message is
clean text and that retrieved-context and tool-result data land in SYSTEM messages, not fused into the
user turn — the platform's recipe/chatbot message structure already separates task instruction from
"DATA FROM PREVIOUS STEPS," which is exactly the segmentation injection defenses want; treat retrieved RAG
docs and Composio tool outputs as untrusted carriers. **Output (LLM05):** put structured-output validation
on any agent reply that feeds another system, and never let raw model text reach a shell, SQL, or an HTTP
client without encoding/parameterisation. Shrink the blast radius via tool allow-lists and blueprints
(that's Module 04) so a successful injection can't do much.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (LLM01 + LLM05 pages + ATLAS injection techniques)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the "is prompt-injection defense solvable?" Debate (skills track — **no exam Brief**)
- [ ] On a real Automatos agent: verify input segmentation + add output validation on any downstream-feeding reply
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

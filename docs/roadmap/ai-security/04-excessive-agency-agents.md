# AI Security · Module 04 — Excessive agency, agents & sensitive-info disclosure

**Type:** Skills track (no exam)  ·  Frame: GAIPS d5 — **LLM06 Excessive Agency** · **LLM02 Sensitive Information Disclosure** · **LLM07 System Prompt Leakage** · **LLM09 Misinformation**

## 📥 Sources to load into NotebookLM
- The d5 lesson body — agentic systems & AI integrations (from the S2 track content / PRD)
- OWASP LLM Top 10 (2025) — **LLM06 Excessive Agency** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — **LLM02 Sensitive Information Disclosure** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — **LLM07 System Prompt Leakage** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — **LLM09 Misinformation** page: https://genai.owasp.org/llm-top-10/
- MITRE ATLAS — for tool-abuse / exfiltration techniques: https://atlas.mitre.org/
- GAIPS objectives page (d5): https://www.giac.org/certifications/ai-security-platform-security-gaips

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: an engineer building AGENTS — models that call tools and take actions — who needs to see the
risks that emerge when the model can DO things, plus the disclosure risks that ride along. Explain plainly
first, then precisely. Cover ONLY four OWASP LLM (2025) risks that cluster around agency and leakage:
LLM06 Excessive Agency (the headliner), LLM02 Sensitive Information Disclosure, LLM07 System Prompt
Leakage, and LLM09 Misinformation. LLM06 = the model has too much functionality, too many permissions, or
too much autonomy, so when it's tricked (e.g. by an injection from Module 02) it can act — delete records,
send money, email data. Break LLM06 into its three sub-shapes: excessive FUNCTIONALITY (tools it doesn't
need), excessive PERMISSIONS (a tool's own scopes too broad), excessive AUTONOMY (high-impact actions with
no human approval). This is the "confused deputy": the agent is trusted, the instruction isn't. LLM02 =
the model reveals secrets, PII, or proprietary data in its output. LLM07 = the SYSTEM PROMPT leaks — and
the key lesson is that the fix is NOT hiding the prompt (assume it leaks); it's never putting secrets or
sole security controls in it. LLM09 = the model states false things confidently (including insecure code
or fake API calls), so downstream systems and users act on fiction. ~8 minutes: open with an agent tricked
into a destructive tool call (LLM06), show how least privilege would have contained it, cover the three
leakage/misinfo risks briskly, name the 2–3 mistakes (giving an agent broad tools "to be helpful";
treating the system prompt as a secret store; trusting a tool result the agent read without validation;
shipping model-written code unreviewed), and close with "least privilege for agents is the whole game."
Use current OWASP LLM 2025 titles. Stay grounded; do not invent tool names or capabilities.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the agency-and-leakage cluster — LLM06 Excessive Agency, LLM02
Sensitive Information Disclosure, LLM07 System Prompt Leakage, LLM09 Misinformation — for a skills-track
audience. Centre on LLM06 and its three axes (functionality, permissions, autonomy) and the mitigations:
minimal tool sets, tightly scoped tool permissions, human-in-the-loop approval for high-impact actions,
and tool-OUTPUT validation (a tool result is untrusted input — the confused-deputy trap across MCP and
tool protocols). Then LLM02: output filtering, data minimisation, and not feeding secrets into a context
the model can echo. LLM07: assume the system prompt leaks — keep secrets and authorisation OUT of it and
enforce controls in code, not in the prompt. LLM09: ground responses, cite sources, and never ship model-
generated code or facts unreviewed. Thread these back to Module 02 — excessive agency is what turns a
successful injection into real damage. Ground strictly in the sources; current 2025 titles only.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue the second tentpole: "Is autonomous agency worth the excessive-agency risk?" One
host argues autonomy is the whole point — gate every action behind a human and you've built a slow chatbot,
not an agent; the value is in acting unattended, and least-privilege plus good tooling makes that safe
enough. The other argues unattended high-impact autonomy is indefensible today — one injection plus one
over-scoped tool equals a breach, and the honest posture is human-in-the-loop for anything irreversible.
Have them reason over LLM06's three axes and land on where the approval line belongs. Ground in the
sources; current titles only.
```

## 🤖 Apply it in Automatos
This is where Automatos's controls map most directly. Harden one agent for least privilege: **LLM06
functionality** → trim its tool allow-list to only what the task needs (don't register the world);
**permissions** → scope each tool/Composio action tightly; **autonomy** → require a human-in-the-loop
approval gate for high-impact or irreversible actions (the platform's mission plan-mode / approval-policy
engine is exactly this control). Validate tool OUTPUT before the agent acts on it (confused-deputy defense).
**LLM07** → keep secrets and authorisation out of the blueprint/system prompt; enforce access in code.
**LLM02** → filter what the agent can echo. Produce the before/after tool allow-list and the approval
policy for one agent as the module's proof.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (LLM06 + LLM02 + LLM07 + LLM09 pages)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the "is autonomous agency worth the risk?" Debate (skills track — **no exam Brief**)
- [ ] On a real Automatos agent: trim the tool allow-list + add a human approval gate for high-impact actions
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

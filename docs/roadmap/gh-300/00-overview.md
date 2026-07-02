# GH-300 · Module 00 — Overview & Exam Strategy

**Exam tie-in:** all six domains (blueprint + how it's scored)  ·  **Format:** external exam (mock-exam prep)

## 📥 Sources to load into NotebookLM
- The GH-300 study-guide task statements (all six domains)
- https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-300
- https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/
- The exam sandbox demo (https://aka.ms/GHExamDemo-enu) + the official practice assessment (linked from the cert page)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional about to sit the GH-300 GitHub Copilot exam — capable, but new to how THIS
exam is built. Explain plainly first, then precisely. Cover ONLY the blueprint and how to sit it: the
six skills-measured domains and their weights (Use Copilot Features 30%; Use Copilot Responsibly 18%;
Data & Architecture, Prompt Engineering, Developer Productivity, and Privacy/Safeguards 13% each), the
format (100 minutes, ~60 scored questions, 700/1000 to pass, $99, proctored via Pearson VUE), and how
to allocate study time by weight. ~8 minutes: open with why Features is where the marks are, show how
to read a task statement and turn it into a study action, flag the top 2–3 prep mistakes (ignoring the
low-weight domains that are easy points; assuming pre-Jan-2026 feature knowledge is enough; treating
community braindumps as truth), and close with a one-line "on the exam, remember…". Make clear the
Jan-2026 refresh (Agent/Plan Mode, MCP, Sub-Agents, Copilot CLI, Spaces, Spark, Code Review) is in
scope. Stay strictly grounded in the provided sources; do not state unverified format claims (e.g. a
two-section / no-back-navigation structure is NOT confirmed — leave it out).
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Walk the whole GH-300 blueprint as a study plan: each of the six
domains, its weight, and the kind of decision each tests. Explain how the exam is scored (700/1000)
and how to budget the 100 minutes across ~60 questions. Emphasize the Jan-2026 refresh feature set as
in-scope, and the Edit Mode caveat (still on the blueprint, folded into Agent in the product). Turn
every domain into "here's what to study and why it's worth these marks." Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap for the week before the exam: the six domains and their weights (Features 30%, Responsible
18%, the other four 13% each), the format (100 min / ~60 scored / 700 to pass / Pearson VUE), and the
three prep traps. One line per domain on what it tests. Grounded in the sources.
```

## 🤖 Apply it in Automatos
Frame the exam as a delegation problem: show the learner how, in Automatos, you'd hand a bounded goal
to an agent with the right skills and review its output — the same "pick the right surface, then verify"
judgment the exam rewards. Use it to motivate the Features and Responsible-AI modules that follow.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

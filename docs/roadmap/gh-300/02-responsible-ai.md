# GH-300 · Module 02 — Use GitHub Copilot Responsibly

**Exam tie-in:** D2 Use Copilot Responsibly (18%)  ·  **Format:** external exam (mock-exam prep)

The second-heaviest domain, so it gets **two videos** — the principles + why validation is mandatory,
then risks + mitigations. A trade-off domain, so add a **Debate** audio.

## 📥 Sources to load into NotebookLM
- The domain lesson body (from the built track content / PRD)
- https://docs.github.com/en/copilot/responsible-use
- https://learn.microsoft.com/en-us/training/modules/responsible-ai-with-github-copilot/
- The GH-300 study-guide task statements for this domain

## 🎬 Video Overview prompt 1 of 2 (~8 min) — Responsible-AI principles & validating output
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: the responsible-AI principles Copilot is built on
and why validating AI output is mandatory — Copilot suggests, the developer is accountable. Include
the per-feature application of these principles (how "validate the output" looks for a completion vs a
chat answer vs an agent's PR). Map every point to what a candidate must DECIDE on the exam. ~8 minutes:
open with why responsible use is 18% of the marks, one worked example (a plausible-but-wrong suggestion
caught by validation), the top 2–3 distractors (assuming accepted code is correct or license-clean;
treating Copilot as the accountable party), and a one-line "on the exam, remember…". Stay strictly
grounded in the provided sources; do not invent principles.
```

## 🎬 Video Overview prompt 2 of 2 (~8 min) — Risks, mitigation & ethical use
```
Audience: a professional studying for the GH-300 GitHub Copilot exam — capable but not an expert here.
Explain plainly first, then precisely. Cover ONLY: the risks of using Copilot and the right mitigations
— over-reliance, bias in suggestions, insecure or vulnerable code, and matching each to a concrete
mitigation practice (review, test, security scan, human judgment). Map every risk to an exam decision:
given a scenario, which mitigation applies. ~8 minutes: open with why this is tested, one worked
example (an insecure suggestion and the mitigation that catches it), the top 2–3 distractors (picking a
policy control when the fix is developer review; conflating bias with security), and a one-line "on the
exam, remember…". Stay strictly grounded in the provided sources; do not invent risks or mitigations.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the D2 "Use Copilot Responsibly" domain for GH-300: the
responsible-AI principles, why output validation is non-negotiable, the risks (over-reliance, bias,
insecure suggestions), and the mitigations mapped to each. Use the per-feature application cards to
make it concrete. For every point, make the exam decision explicit. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min)
```
Tight recap of the must-know D2 points: the principles, "always validate the output," the three risk
families and their mitigations, and who is accountable (the developer, not the tool). Call out the top
distractors. Grounded in the sources. For the week before the exam.
```

## 🎧 Audio — Debate (trade-off topic) — NotebookLM → Audio → Customize
```
Two hosts, expert level, argue a real tension in responsible Copilot use: "can you trust AI-generated
code enough to ship it, and where is the line?" One host presses productivity and the developer's
accountability; the other presses over-reliance, bias, and insecure suggestions. Keep it grounded in
the sources so the listener hears both sides of the validation-vs-velocity trade-off the exam frames.
```

## 🤖 Apply it in Automatos
Show the learner how they'd bake responsible use into Automatos — e.g. compose an agent + skills whose
flow requires a validation/review step (tests or a security check) before output is accepted, mirroring
Copilot's "validate the output" discipline. The point lands: the human stays accountable in both.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate both Video Overviews (tune each to ~8 min)
- [ ] Generate the Deep Dive (+ Brief) audio, plus the Debate
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

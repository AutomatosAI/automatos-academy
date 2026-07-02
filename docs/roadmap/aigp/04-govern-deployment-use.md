# AIGP · Module 04 — Governing AI Deployment & Use

**Exam tie-in:** Domain IV — *Understanding how to govern AI deployment and use* (blueprint **21–25 questions**, weight **0.27**; sub-domains **IV.A–IV.C**)  ·  **Format:** external exam (mock-exam prep)

The other heaviest domain (0.27). It governs the model **in the world**: **selecting a model** (own vs
third-party) and **deploying responsibly**; ongoing **monitoring, maintenance and incident/issue
management**; **public transparency disclosures** and **notification obligations**; and the
**accountability structures** plus **procurement / vendor governance** that keep a live system
answerable. Because it's heavy and splits cleanly, it warrants **two videos**: one on model selection +
responsible deployment + monitoring, one on transparency/notification + accountability + vendor
governance.

## 📥 Sources to load into NotebookLM
- The Domain IV lesson body (from the built track content / PRD-S3-AIGP §4, "d4 Govern AI deployment & use IV.A–IV.C")
- IAPP AIGP Body of Knowledge & Exam Blueprint v2.0.1 — https://iapp.org/media/pdf/certification/AIGP_Cert_BOK_FINAL_012925_2.0.1.pdf  (sub-domains **IV.A–IV.C**)
- EU AI Act official text, Regulation (EU) 2024/1689 (deployer duties, post-market monitoring, transparency & notification) — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- NIST AI RMF 1.0 (Manage — monitoring, incident response, continual risk management) — https://www.nist.gov/itl/ai-risk-management-framework
- ISO/IEC 42001 overview (operational controls, monitoring, supplier management) — https://www.iso.org/standard/81230.html

## 🎬 Video Overview A — model selection, responsible deployment & monitoring (~8 min)
```
Audience: a smart professional studying for the IAPP AIGP exam — capable, new to governing AI in
production. Explain plainly first, then precisely.

Objective of THIS video (cover only this): choosing a model (own vs third-party) and deploying it
responsibly, then running it — ongoing monitoring, maintenance, and incident/issue management.

Exam tie-in: this maps to Domain IV "Understanding how to govern AI deployment and use" (blueprint 21–25
questions, ~0.27 weight — one of the two heaviest; sub-domains IV.A–IV.C). Frame around the task
statements: weigh building vs procuring a model and the governance implications of each; deploy with the
right controls in place; and set up monitoring and incident management so drift, failures and harms are
caught and handled. For each point, make explicit what the candidate must DECIDE or DO — e.g. given a
scenario, whether to build or buy, what monitoring signal was missing, or how an incident should be
triaged and escalated.

Shape: ~8 minutes. Open with why deployment/use is heavily weighted and scenario-tested. Use ONE worked
example: a deployed model that drifts or misfires, caught (or missed) by monitoring and run through
incident management. Call out the top 2–3 distractors (thinking third-party procurement offloads your
deployer accountability; treating monitoring as a one-time launch check rather than continuous;
confusing incident management with model retraining). Close with a one-line "on the exam, remember…".

Stay strictly grounded in the provided sources. Do not invent monitoring metrics, incident stages, or
deployer obligations beyond the sources.
```

## 🎬 Video Overview B — transparency, notification, accountability & vendor governance (~8 min)
```
Audience: a smart professional studying for the IAPP AIGP exam — capable, new to disclosure and
accountability duties in production. Explain plainly first, then precisely.

Objective of THIS video (cover only this): public transparency disclosures and notification
obligations, plus the accountability structures and procurement/vendor governance that keep a live AI
system answerable.

Exam tie-in: maps to Domain IV (blueprint 21–25 questions, ~0.27 weight; IV.A–IV.C). Frame around the
task statements: identify when users/affected people must be told they're interacting with AI or subject
to an AI decision; meet notification obligations (e.g. reporting serious incidents); define who is
accountable across the org; and govern third-party AI through procurement and vendor management. For
each, make explicit what the candidate must DECIDE — which disclosure is owed to whom, and where
accountability sits when a vendor's model is in your product.

Shape: ~8 minutes. Open with the split between transparency (proactive disclosure) and notification
(reporting duties) because the exam tests both. One worked example: a deployment that owes user-facing
disclosure AND a serious-incident notification, plus a vendor whose contract must carry governance
terms. Call out the top 2–3 distractors (transparency disclosure ≠ incident notification; a vendor
contract doesn't transfer away deployer accountability; assuming "internal AI" needs no disclosure).
Close with a one-line "on the exam, remember…".

Stay strictly grounded in the provided sources. Do not invent disclosure triggers, notification
timelines, or contractual terms beyond the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach Domain IV "Understanding how to govern AI deployment and use"
(IV.A–IV.C) for the AIGP exam: selecting a model (own vs third-party) and its governance trade-offs;
deploying responsibly; ongoing monitoring, maintenance and incident/issue management; public
transparency disclosures and notification obligations; and accountability structures plus
procurement/vendor governance. For each, make the exam decision explicit — build vs buy, what to monitor
and how to escalate an incident, which disclosure is owed to whom, and where accountability lands when a
third party supplies the model. Tie duties to the EU AI Act deployer obligations and post-market
monitoring, and to NIST "Manage", where the sources support it. Ground strictly in the sources.
```

## 🎧 Audio — Brief (revise, ~8–12 min) — exam track
```
Tight recap of Domain IV must-knows: own vs third-party model selection and its accountability
consequences; responsible deployment controls; continuous monitoring, maintenance and incident/issue
management; transparency disclosure vs notification obligations; accountability structures;
procurement/vendor governance. Hit the top distractors (procurement doesn't offload deployer
accountability; monitoring is continuous, not a launch gate; transparency ≠ notification; internal AI
can still owe disclosure). Grounded in the sources. For the week before the exam.
```

## 🎧 Audio — Debate / Critique (judgment call) — NotebookLM → Audio → Customize
```
Two hosts, expert level. Debate the exam's core Domain-IV accountability tension: "When you deploy a
third-party model, how much governance responsibility can you actually transfer to the vendor?" One host
argues a strong vendor contract + the provider's own conformity shifts most duties; the other argues the
DEPLOYER remains accountable for use, monitoring, transparency and incidents no matter whose model it
is. Have them surface exactly which duties are transferable and which are not, then reconcile into a
rule. Second round: "Transparency disclosure vs serious-incident notification — when does a deployment
owe each, and to whom?" Keep it strictly grounded in the EU AI Act deployer provisions and the lesson
body; invent no obligations or timelines.
```

## 🤖 Apply it in Automatos
Map deployment-and-use governance onto running agents in Automatos. **Model selection**: choosing a
provider model behind an Automatos agent is a build-vs-buy decision — and either way the org operating
the agent is the accountable **deployer**. **Monitoring & incident management**: Automatos **audit
logging** plus run history is your post-market monitoring trail, and approval/escalation flows are where
an issue gets triaged. **Transparency**: the deployment should disclose to end-users that an AI agent is
in the loop. **Accountability & vendor governance**: **RBAC / super-admin tiers** define who owns the
live system, and procurement terms for any third-party model sit alongside the blueprint. Close the
track: have the learner take one Automatos deployment, classify it under the EU AI Act (Module 02),
point to the platform control that meets each deployment-phase obligation here, and note which
vendor/model duties they can and cannot transfer.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate **both** Video Overviews (selection/deploy/monitor; transparency/accountability/vendor) — tune each to ~8 min
- [ ] Generate the Deep Dive (+ Brief) audio; add the "vendor accountability transfer" Debate
- [ ] Download → host → register in the domain `videos[]` (`d4-govern-deployment`)
- [ ] Tick this module off in the track README

# Automatos · Module 07 — Deliverables & templates: consistent, templated documents

**Type:** Free training (no exam)  ·  **Goal:** get agents to produce consistent documents —
reports, audits, summaries — from templates, and find them in your workspace.

> **Vocabulary:** the file an agent produces is a **Deliverable** (not "output" / "artifact" in
> user-facing terms). Agents build deliverables via the `generate_document` tool, usually from a
> **Template**.

> **Currency note (updated 19 Oct 2026):** the user docs describe **markdown templates**
> ({{placeholder}} variables) and markdown reports. The product ships the **Template Studio**
> (Deliverables → Templates: Brand Kit, New template from a layout, blocks and variable chips) and
> `generate_document` renders **branded PDF, DOCX and XLSX** saved to Deliverables (PRD-167). Teach
> the product. Agent reports live on **Agent Details → Reports** (status, title, time, 1–5 star
> grade; average grade and ungraded count), not on an Activity → Reports page.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/knowledge/templates.md` — what templates are, example templates, using them, creating them (structure + placeholder variables)
- `automatos-gitbook/activity/reports.md` — how agents generate reports, report contents, the viewer, grading, where reports are stored
- `automatos-gitbook/knowledge/documents.md` — supported file types (DOCX, XLSX, PDF, MD) the platform handles
- Repo for grounding: `automatos-ai` — the `generate_document` deliverable tool

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who wants agents to hand back a proper document, not just a chat reply.
Teach deliverables + templates, grounded in the sources. This is a "make an agent produce a branded
report" walkthrough.

Cover ONLY, in order:
1. Why templates: a template defines the structure, sections, and formatting for a type of document,
   so an agent's reports/summaries/analyses come out consistent every time. Show the Template Studio's
   starters (Basic Report, Invoice, Executive Summary, Meeting Notes, Data Export) and the docs' ideas
   for your own (Daily Standup, Security Audit, Code Review, Research Summary).
2. Using a template from chat: you can just ask — "Write a security audit report for the auth module
   using the Security Audit template." Templates are automatically available to agents; when a task or
   Playbook calls for a specific format, the agent references the matching template.
3. Creating a template (the Template Studio, Deliverables → Templates): set the Brand Kit once → New
   template → start from a layout → edit the blocks → place variable chips ({{date.long}}, {{brand.*}},
   and data.* fields the agent supplies) that get filled at generation time → Save template.
4. Deliverables: agents build the actual document with the generate_document tool — a branded PDF,
   DOCX or XLSX from your template and Brand Kit, saved to Deliverables. Frame this as "template = the
   shape, generate_document = produces the file." The docs' file-format list (DOCX/XLSX/PDF/MD)
   describes what you can UPLOAD; what agents generate is decided by their tools.
5. Where the work lands: generated documents on the Deliverables page; agent reports on Agent
   Details → Reports (status, title, time, grade); open one in the viewer and grade it 1–5 stars,
   which moves the agent's average grade.

~8 minutes: open with "agents should hand you a document," create a small template on screen, ask an
agent to generate from it, open the branded file on Deliverables, then grade a report on the agent's
Reports tab. Stay strictly in the sources; do not invent template fields, and do not promise generated
formats beyond what generate_document makes (PDF, DOCX, XLSX).
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching a user to standardise agent output. Go deep on: designing a good
template (sections, tables, placeholder variables filled at generation time); the difference between
a template (structure) and a generated deliverable (the document the agent produces via
generate_document — a branded PDF, DOCX or XLSX saved to Deliverables); requesting a specific
template from chat; and how agent reports land on Agent Details → Reports — the row fields, the
viewer, grading for quality, and where they're stored (workspace filesystem + database). Connect to earlier modules: a Playbook or Mission can end by generating a
templated deliverable. Ground strictly in knowledge/templates.md, activity/reports.md, and the
supported file types in knowledge/documents.md.
```

## 🛠 Try it now (on Automatos)
Produce your first branded deliverable:
1. **Deliverables → Templates → New template** (start from a layout). Name it *"Weekly Review,"*
   shape the blocks (Summary / Findings / Actions), and add variables like `{{date.long}}` and a
   `data.*` field. Save template.
2. In **Chat**, ask an agent: *"Write this week's review using the Weekly Review template, based on my
   uploaded documents,"* — let it generate the deliverable.
3. Open the deliverable from the agent's reply (or the **Deliverables** page) and check it.
4. On the agent's **Agent Details → Reports** tab, open a report in the **viewer** and **grade it**
   1–5 stars. Iterate the template until the shape is exactly what you want.

## ✅ Do
- [ ] Load `knowledge/templates.md`, `activity/reports.md`, and the file-types part of `knowledge/documents.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 create-template + generate-branded-report task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

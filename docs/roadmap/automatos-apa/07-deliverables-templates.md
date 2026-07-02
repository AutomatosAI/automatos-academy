# Automatos · Module 07 — Deliverables & templates: consistent, templated documents

**Type:** Free training (no exam)  ·  **Goal:** get agents to produce consistent documents —
reports, audits, summaries — from templates, and find them in your workspace.

> **Vocabulary:** the file an agent produces is a **Deliverable** (not "output" / "artifact" in
> user-facing terms). Agents build deliverables via the `generate_document` tool, usually from a
> **Template**.

> **Currency note (2026-07-02):** the user docs document **markdown templates** ({{placeholder}}
> variables) and markdown reports; DOCX/XLSX/PDF appear in the docs as *upload* formats. The
> **branded rich-format generation** (block templates, brand kit, PDF/DOCX output — PRD-167) is
> recent build work with no gitbook page yet — **verify it in the product before demoing**, and
> teach markdown templates as the live baseline.

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
   so an agent's reports/summaries/analyses come out consistent every time. Show the example templates
   from templates.md — Daily Standup, Security Audit, Code Review, Research Summary.
2. Using a template from chat: you can just ask — "Write a security audit report for the auth module
   using the Security Audit template." Templates are automatically available to agents; when a task or
   Playbook calls for a specific format, the agent references the matching template.
3. Creating a template (templates.md): + New Template → name + description → write the structure in
   markdown (headings, tables) → set placeholder variables like {{agent_name}} and {{date}} that get
   filled at generation time → Save.
4. Deliverables: agents build the actual document with the generate_document tool — markdown
   deliverables from your templates are the documented baseline. Frame this as "template = the shape,
   generate_document = produces the file." If richer branded formats (PDF/DOCX) appear in your
   product build, show them — but only claim what you can see working; the docs' file-format list
   (DOCX/XLSX/PDF/MD) describes what you can UPLOAD, not what generation promises.
5. Where deliverables live: agent reports show up in Activity → Reports as cards (agent, title,
   timestamp, status, preview); open one in the viewer (full markdown render + linked artifacts) and
   grade it 1–5 stars, which feeds Analytics → Agents. Reports are stored in the workspace filesystem
   and the database.

~8 minutes: open with "agents should hand you a document," create a small template on screen, ask an
agent to generate from it, then find and grade the result in Reports. Stay strictly in the sources;
do not invent template fields, and do not promise generated file formats beyond what you verified
in the product (markdown is the documented baseline).
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching a user to standardise agent output. Go deep on: designing a good
template (sections, tables, placeholder variables filled at generation time); the difference between
a template (structure) and a generated deliverable (the document the agent produces via
generate_document — markdown per the docs; richer branded formats only as verified in-product);
requesting a specific template from chat; and how reports flow into Activity →
Reports — the card fields, the viewer, grading for quality, and where they're stored (workspace
filesystem + database). Connect to earlier modules: a Playbook or Mission can end by generating a
templated deliverable. Ground strictly in knowledge/templates.md, activity/reports.md, and the
supported file types in knowledge/documents.md.
```

## 🛠 Try it now (on the free platform)
Produce your first branded deliverable:
1. **Knowledge Bases → Templates → + New Template.** Name it *"Weekly Review,"* write a markdown
   structure (Summary / Findings / Actions), and add placeholders like `{{agent_name}}` and
   `{{date}}`. Save.
2. In **Chat**, ask an agent: *"Write this week's review using the Weekly Review template, based on my
   uploaded documents,"* — let it generate the deliverable.
3. Open **Activity → Reports**, find the report card, open it in the **viewer**, and read the rendered
   output.
4. **Grade it** 1–5 stars (this feeds agent quality analytics). Iterate the template until the shape
   is exactly what you want.

## ✅ Do
- [ ] Load `knowledge/templates.md`, `activity/reports.md`, and the file-types part of `knowledge/documents.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 create-template + generate-branded-report task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

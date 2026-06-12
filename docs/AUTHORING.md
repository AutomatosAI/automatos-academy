# Authoring content

The engine is vendor-agnostic. Everything you see is data under `public/content/`. Adding a track or a vendor is content work — no engine changes.

```
public/content/
  manifest.json                 # the catalog (vendors → tracks, status, summary)
  <vendor>/<track>/
    track.json                  # exam spec + domainFiles[] + officialResources[]
    <domain>.json               # one file per domain (lessons, questions, scenarios, labs, resources, videos)
```

Run `npm run validate` after any edit — it checks the schema, that domain weights sum to 1.0, that ids are unique, and that every question is answerable.

## Add a domain

A domain file:

```jsonc
{
  "id": "d2-tools-mcp",          // unique; questions reference it as domainId
  "order": 2,
  "code": "D2",
  "name": "Tool Design & MCP Integration",
  "weight": 0.18,                // domain weights across a track MUST sum to 1.0
  "tagline": "…",
  "overview": "…",
  "objectives": ["…"],
  "lessons":   [ /* see below */ ],
  "questions": [ /* standalone bank, drawn into quizzes + the mock exam */ ],
  "scenarios": [ /* branching drills; the exam draws scenariosPresented of these */ ],
  "labs":      [ { "id","title","goal","steps" (markdown), "checklist": [] } ],
  "resources": [ { "id","title","url","kind","annotation","domainIds":[] } ],
  "videos":    [ { "id","title","provider":"youtube","url","status":"placeholder","domainIds":[],"sourceNotebook" } ]
}
```

Register the file in the track's `domainFiles[]`.

### Lesson

```jsonc
{
  "id": "l1-…", "title": "…", "estMinutes": 12,
  "objective": "After this you can …",
  "body": "## Heading\n\nMarkdown. Use \\n for newlines. In code blocks use single quotes to avoid escaping.",
  "knowledgeCheck": [ /* 2–3 questions, same shape as below */ ]
}
```

Markdown supported: `##`/`###` headings (become the on-page TOC), `**bold**`, `*italic*`, `` `code` ``, fenced ```code blocks```, `-`/`1.` lists, `>` quotes, `[links](url)`.

### Question

```jsonc
{
  "id": "q-d2-1",
  "domainId": "d2-tools-mcp",      // MUST match the domain file id
  "type": "single",                 // or "multi" (2+ correct → renders "select all")
  "difficulty": 2,                  // 1 | 2 | 3
  "stem": "… (markdown ok, incl. a ```code``` block)",
  "options": [ { "id":"a","text":"…","correct":true }, { "id":"b","text":"…" } ],
  "explanation": "Why the right answer is right AND why the others are wrong — this is the teaching.",
  "sourceRefs": ["r-docs"]          // resource ids that ground the answer (provenance)
}
```

### Scenario (the signature drill)

```jsonc
{
  "id": "s-d2-…", "title": "…", "tagline": "…",
  "domainIds": ["d2-tools-mcp"],
  "context": "The real-world brief (markdown).",
  "steps": [
    {
      "id": "st1",
      "prompt": "The architectural decision.",
      "choices": [
        { "id":"a", "text":"…", "verdict":"best",   "rationale":"…", "next":"st2" },
        { "id":"b", "text":"…", "verdict":"viable", "rationale":"…" },
        { "id":"c", "text":"…", "verdict":"wrong",  "rationale":"…" }
      ]
    }
  ]
}
```

`verdict` ∈ `best` (full credit) · `viable` (half) · `wrong` (none). `next` branches to a step id; omit it to fall through to the next step in order. In the mock exam, each step becomes a question (the `best` choice is the correct option).

## Add a track / vendor

1. Add the vendor + track to `manifest.json` (set `status: "coming-soon"` until authored, `"live"` when ready; `flagship: true` for the hero).
2. Create `public/content/<vendor>/<track>/track.json` with the `exam` spec and `domainFiles[]`.
3. Author the domain files. Done — the engine renders it; routes are `#/t/<vendor>/<track>/…`.

## Quality bar (non-negotiable)

- **Original questions only.** Write to the blueprint, ground every answer in a `sourceRefs` doc, explain every option. Never reproduce real proctored-exam items — it's against the exam terms and produces brittle prep.
- **Current, verified facts.** Re-check API shapes and model IDs against the live docs at authoring time; the platform moves fast.
- **Weights sum to 1.0.** The mock exam and readiness math depend on it (`npm run validate` enforces it).

## Security note

Lesson/question/explanation bodies are rendered as HTML from our **first-party** markdown (the renderer HTML-escapes all text before formatting, and link URLs are author-controlled). This is safe for first-party content. **If content ever becomes user-generated, add HTML sanitisation (e.g. DOMPurify) before rendering** — the `html`-setting code paths are in `js/ui.js`, `js/markdown.js`, and `js/views/parts.js`.

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

## Track shapes: exam vs skills

The engine renders **two shapes**, decided by one thing — whether `track.json` has a real `exam{}`:

| | Exam track (CCA-F, GH-300, GH-500, AIGP) | Skills track (APA, ABF, AI-Security, Cross-Vendor) |
|---|---|---|
| `track.exam{}` | required, with `questionCount` | **omit entirely** (a partial `exam{}` fails validation) |
| Domain `weight` | required, sums to 1.0 | omit (if any weight is present, all must sum to 1.0) |
| Mock exam / A+ gate | rendered | hidden — the exam tab disappears, `/exam` shows a "no exam, on purpose" page |
| Readiness tab | A+ verdict | **Progress** — lessons done per module group |
| Completion | A+ (≥90% mastery + mock ≥800 passed) | every lesson done |
| Badge claim | unlocks at A+ | unlocks at full completion |

Everything else (lessons, knowledge checks, quizzes, scenarios, labs, resources, videos) works identically in both shapes.

### `badge{}` (optional, both shapes — PRD-CREDENTIALS)

```json
"badge": {
  "completionLabel": "Prep completed — GH-500 (GitHub Advanced Security)",
  "definition": "One-sentence honest statement of what completion means."
}
```

Rendered on the claim panel and certificate pages. **Honesty rule:** exam-track copy must say it certifies *preparation* completion, never the vendor credential. Omitting `badge{}` falls back to safe generated copy.

### `verification{}` (exam tracks — PRD-OPS-FRESHNESS)

```json
"verification": {
  "verifiedAt": "2026-07-01",
  "sourceOfTruth": ["https://learn.microsoft.com/..."],
  "notes": "What was checked and any traps found."
}
```

Rendered as a chip on the track header ("Facts verified <date> …"). Bump `verifiedAt` only after actually re-fetching the official source and diffing the load-bearing facts (count, duration, pass score, domain names/weights, feature names). An overdue date showing publicly is intentional — visible staleness keeps us honest.

### Landing shells

`scripts/generate-shells.mjs` runs at server boot and emits a static SEO page per **live** track (`/tracks/<trackId>/`) plus `sitemap.xml`/`robots.txt` from the manifest + track.json — no authoring step needed; just keep `summary`, `exam{}`, and `verification{}` accurate.

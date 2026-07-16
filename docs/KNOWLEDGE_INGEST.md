# Academy tutor knowledge base — ingest manifest

Goal: build the **Academy workspace's knowledge base** that the tutor agent
retrieves from. It has **two layers**:

1. **The tutor corpus (highest authority)** — `npm run tutor-corpus` exports
   every **live** track's lessons, Q&A (with why-explanations), scenarios and
   labs as KB-ready markdown. This is what makes the tutor track-correct
   across the whole catalog — see §5 for the regen + upload runbook.
2. **The everything-Claude doc graph (depth layer)** — a graphify knowledge
   graph over the Anthropic/MCP documentation set, for Anthropic-stack depth
   beyond the lessons. Pipeline:

```
Firecrawl (scrape → markdown)  →  graphify (entities + communities)  →  ingest into the Academy workspace KB  →  tutor agent retrieves
```

Re-run the scrape monthly — the Claude platform docs change fast. Re-run the
corpus export **after every content release** (§5).

---

## 1. Sources to scrape (priority order)

### Official Anthropic (authoritative — scrape all)
| Source | Crawl root | Include |
|---|---|---|
| Claude platform docs (API, models, tool use, MCP, managed agents, prompt caching, thinking/effort, context editing, compaction, batches, files, vision, PDF, structured outputs, citations, rate limits, errors) | `https://platform.claude.com/docs/en` | `^/docs/en/.*` |
| Claude Code docs | `https://docs.claude.com/en/docs/claude-code` | `^/en/docs/claude-code/.*` |
| Agent SDK docs | `https://platform.claude.com/docs/en/agent-sdk` (+ the agent-sdk section) | `^/docs/en/agent-sdk/.*` |
| MCP — spec + guides | `https://modelcontextprotocol.io` | whole site |
| Anthropic engineering blog (building effective agents, etc.) | `https://www.anthropic.com/engineering` | `^/engineering/.*` |
| Anthropic news/research (optional breadth) | `https://www.anthropic.com/news`, `/research` | recent only |

### Repos (clone, or Firecrawl the GitHub markdown)
- `github.com/anthropics/anthropic-cookbook` — recipes/patterns
- `github.com/anthropics/claude-code` — Claude Code docs/examples
- `github.com/anthropics/anthropic-sdk-python` · `-typescript` · `-go` · `-java` · `-ruby` · `-php` · `-csharp` — READMEs + `examples/`
- `github.com/modelcontextprotocol/servers` + the spec repo

### Already in this repo (highest authority — ingest directly, no scrape)
- **The tutor corpus** — `npm run tutor-corpus` walks `public/content/manifest.json`
  and exports every **live** track (currently 10 of 11 — `openai/foundations`
  is coming-soon and excluded until live):
  - Practitioner lane: `anthropic/cca-f` (CCA-F), `github-copilot/gh-300`
    (GH-300), `github/gh-500` (GH-500), `google/gen-ai-leader` (GAL),
    `iapp/aigp` (AIGP), `automatos/platform-architect` (APA),
    `cross/ai-security` (AIS), `cross/cross-vendor` (CVF)
  - Operator/foundations lane: `automatos/ai-business` (ABF),
    `automatos/ai-explained` (AIX)

  The exporter derives the set from the manifest, so this list never needs
  hand-maintenance — a track flipped to `live` is picked up on the next run.
- `public/content/anthropic/docs/cca-f-exam-guide.pdf` — the CCA-F exam blueprint
- `public/content/anthropic/docs/anthropic-academy-course-catalog.pdf`
- The 14 NotebookLM videos (add transcripts if you have them — great KG fuel)

Per-track official sources (vendor exam guides, docs) are already cited inside
each track's content and ride along in the corpus export; scrape more vendor
docs only if the tutor's depth on a non-Anthropic track proves thin.

---

## 2. Firecrawl

Per source (v1 crawl API — adjust limits to taste):

```bash
curl -X POST https://api.firecrawl.dev/v1/crawl \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://platform.claude.com/docs/en",
    "limit": 2000,
    "includePaths": ["^/docs/en/.*"],
    "scrapeOptions": { "formats": ["markdown"], "onlyMainContent": true }
  }'
```

- `onlyMainContent: true` strips nav/footers so the graph isn't polluted with chrome.
- Save each crawl's markdown into one corpus dir, namespaced by source (e.g. `corpus/platform-docs/…`, `corpus/mcp/…`, `corpus/cookbook/…`) so provenance survives.
- Respect robots/ToS — these are public docs; keep a sane rate.

---

## 3. graphify

Point graphify at the whole corpus dir:

```
/graphify corpus/        # → graph.json + clustered communities + audit + HTML
```

This yields the entity/relationship graph + community structure the tutor uses
for graph-aware retrieval (concepts → related concepts → source chunks).

---

## 4. Ingest into the Academy workspace

1. Create the **Academy workspace** on Automatos.
2. Add both layers as the workspace **knowledge base** — the tutor corpus
   (§5) + the scraped markdown + the two PDFs — the platform indexes it for
   RAG; attach the graphify graph for graph retrieval.
3. Create the **tutor agent** in that workspace with the system prompt in
   [ACADEMY_TUTOR_PROMPT.md](./ACADEMY_TUTOR_PROMPT.md), pointed at this KB.
4. Mint an `ak_pub_*` key (allowed_domains = `academy.automatos.app` + the
   Railway URL + `localhost:4321`).
5. Set the deploy env vars and redeploy:
   ```
   ACADEMY_CHAT_PUBLIC_KEY = ak_pub_…
   ACADEMY_CHAT_AGENT_ID   = <tutor agent uuid>   # optional
   ```

The Academy widget reads those at container start (`chat-config.js`), and the
tutor goes live — corner panel on every page, full study page at `#/tutor`,
drawing flows/charts from the graph.

---

## 5. Tutor-corpus regen + upload (operator step — not automated)

This step is **run by a human with workspace access** (Gerard) — CI never
executes the exporter or touches the platform KB. After any content release
(new track live, lessons/questions changed):

```bash
# 1. Regenerate the corpus (validator should be green first):
npm run tutor-corpus
# → writes ./tutor-corpus/ (gitignored): one directory per live track
#   (<vendor>--<trackId>/), one markdown doc per domain/module, plus
#   INDEX.md — the upload checklist.

# 2. Upload every file INDEX.md lists to the Academy workspace KB
#    (the platform auto-extracts the knowledge graph on ingest).
```

Then **verify and record**:

1. **Probe per track:** ask the live agent one question per live track that is
   answerable only from that track's content (e.g. the GH-500 blueprint
   split, an ABF module artifact). A miss on any track ⇒ re-export →
   re-upload per `INDEX.md` → re-probe.
2. **Record "knowledge as of <date>"** in the agent's notes/prompt area so the
   tutor can say how current it is (see §6).

## 6. Refresh cadence

- **Tutor corpus:** after every content release (§5) — the agent quietly
  falls behind each release otherwise.
- **Doc scrape:** monthly — re-crawl → re-graphify → re-ingest (or
  incremental if the platform supports it).
- Bump the "knowledge as of <date>" note on every refresh.

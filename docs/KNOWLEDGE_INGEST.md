# Everything-Claude knowledge graph — ingest manifest

Goal: build the **Academy workspace's knowledge base** — a graphify knowledge
graph over "everything Claude" — that the tutor agent retrieves from. Pipeline:

```
Firecrawl (scrape → markdown)  →  graphify (entities + communities)  →  ingest into the Academy workspace KB  →  tutor agent retrieves
```

Re-run monthly — the Claude platform docs change fast.

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
- `public/content/anthropic/docs/cca-f-exam-guide.pdf` — the exam blueprint
- `public/content/anthropic/docs/anthropic-academy-course-catalog.pdf`
- `public/content/anthropic/cca-f/*.json` — the Academy's lessons, questions, scenarios, labs
- The 14 NotebookLM videos (add transcripts if you have them — great KG fuel)

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
2. Add the corpus (markdown + the two PDFs + the Academy content) as the
   workspace **knowledge base** — the platform indexes it for RAG; attach the
   graphify graph for graph retrieval.
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

## 5. Refresh

Monthly: re-crawl → re-graphify → re-ingest (or incremental if the platform
supports it). Bump a "knowledge as of <date>" note so the tutor can say how
current it is.

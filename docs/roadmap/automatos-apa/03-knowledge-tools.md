# Automatos · Module 03 — Knowledge & tools: RAG, Knowledge Graph, CodeGraph, NL2SQL, Composio

**Type:** Free training (no exam)  ·  **Goal:** feed your agents knowledge (documents, code, data)
and connect the external tools they act with.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/knowledge/README.md` — the Knowledge Bases page (Documents / Database / Templates / CodeGraph tabs + stats)
- `automatos-gitbook/knowledge/documents.md` — upload → parse → chunk → embed → index; Search, RAG settings, Multimodal
- `automatos-gitbook/knowledge/cloud-sync.md` — syncing sources *(currency: Dropbox + S3 "Available"; Google Drive / OneDrive "Coming soon" — teach only the available ones as live)*
- `automatos-gitbook/knowledge/knowledge-graph.md` — auto-extracted entities/relationships; graph-enhanced RAG
- `automatos-gitbook/knowledge/codegraph.md` — indexing repos as a symbol graph; how agents use it
- `automatos-gitbook/knowledge/database.md` — SQL Explorer, Semantic Layer, NL2SQL Training, benchmarks, audit
- `automatos-gitbook/tools/README.md` + `tools/connecting-apps.md` + `tools/assigning.md` — Composio integrations, connecting, assigning, permission scopes
- Repo for grounding: `automatos-ai` — the platform

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user whose agent needs to know THEIR stuff and act on THEIR systems. Teach
knowledge + tools together, grounded in the sources. This is a "load your knowledge, connect your
apps" walkthrough.

Cover ONLY, in order:
1. Documents / RAG: upload files (PDF, MD, DOCX, XLSX, code, HTML) → the pipeline runs automatically
   (parse → chunk → embed → index). Show the Search sub-tab (semantic search with relevance scores)
   and note that this is exactly what agents see when they search during chat. Mention RAG settings
   (Top K, similarity threshold, reranking, context window) and that large files process async.
2. Knowledge Graph: uploading also extracts entities and relationships; graph-enhanced RAG combines
   vector search with graph traversal so agents answer questions that span multiple documents. Note
   entity visibility respects team access control.
3. CodeGraph: connect a repo → it's parsed into a graph of symbols (classes, functions) and their
   relationships (calls, imports, inheritance) so agents can answer "where is X defined?" / "what
   calls Y?" It re-indexes automatically on new commits (with GitHub connected).
4. NL2SQL (Database tab): SQL Explorer for direct queries, the Semantic Layer mapping business terms
   to columns, Query Templates, and Training (teach it question→SQL pairs; benchmark against Golden
   SQL). Note queries are read-only by default.
5. Tools (Composio): connect an app (GitHub, Slack, Jira) via OAuth or API key → ASSIGN it to agents
   → the tool router calls it automatically when relevant. Mention permission scopes (full / read-only
   / custom) and to start read-only for new agents.

~8 minutes: open with "agents are only as good as what they can read and touch," do one upload + one
search + one app connection on screen, and close with the picture: Documents/KG/CodeGraph/NL2SQL feed
the agent; Composio tools let it act. Stay strictly in the sources; do not invent settings or apps.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching a builder to ground an agent in their own knowledge and wire up tools
safely. Go deep on: the ingestion pipeline and why semantic chunking + embeddings make search work;
how graph-enhanced RAG differs from plain vector search (entities + relationships + multi-doc
reasoning); when CodeGraph earns its keep (large codebases, "what calls this?"); and NL2SQL as a
teachable system — Semantic Layer mappings, Training examples, Golden SQL benchmarking, the read-only
default and the query audit trail. Then tools: OAuth vs API-key connection, assigning per agent,
permission scopes (full/read-only/custom), and tool validation (active connection, scope, rate
limits) with failures showing in the Activity Feed. Ground strictly in the knowledge/* and tools/*
sources.
```

## 🛠 Try it now (on the free platform)
Ground an agent and give it a tool:
1. **Knowledge Bases → Documents → Upload.** Drop in 2–3 real files (a README, a spec, a CSV). Wait
   for processing (chunked + embedded).
2. Go to the **Search** sub-tab and run a natural-language query against them — confirm you get ranked
   results. That's your agent's view.
3. **(Optional, for code)** **Knowledge Bases → CodeGraph → + Add Repository**, point it at a public
   GitHub repo, and index a branch.
4. **Tools & Integrations → connect GitHub** (OAuth), then **assign** it to your Code Reviewer with a
   **read-only** scope to start.
5. In **Chat**, ask a question that forces both: *"Using our uploaded docs, summarise the auth flow,
   then check the linked GitHub file for issues."* Watch it search knowledge and call the tool.

## ✅ Do
- [ ] Load the `knowledge/*` docs + `tools/README.md`, `connecting-apps.md`, `assigning.md`
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 upload-docs + connect-GitHub + grounded-question task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

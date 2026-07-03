# AIX · Module 03 — Open vs closed models

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"'Open source' vs not — does that even matter to me?"*

## 📥 Sources to load into NotebookLM
- The m03 lesson body (from the AIX track content / PRD)
- Ollama — running open models locally: https://ollama.com/ *(verify reachable)*
- A neutral open-vs-hosted overview (e.g. Hugging Face on open models) *(verify reachable)*
- `automatos-gitbook/settings/models.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who keeps hearing "open source AI" vs "closed" and doesn't know why anyone
cares. No technical background. Explain plainly first, then name the term. Cover ONLY: the two
families of model and what the choice actually means for a normal person. Plain framing: a CLOSED
(or "hosted") model — like the ones behind ChatGPT or Claude — lives on the company's computers; you
send your question over the internet and get an answer back, easy and always the latest, but you're
renting it and your text leaves your building. An OPEN (or "open-weight") model — like Meta's Llama —
is one you can download and run on your OWN computer or server: more control, it can work offline,
your data never leaves, but YOU have to run it and it takes some setup. The everyday trade-off:
closed = convenient, powerful, rented, data-leaves; open = private, controllable, free-to-run, but
your job to host. Analogy: eating at a great restaurant (closed — effortless, someone else's
kitchen) vs cooking the same dish at home (open — your kitchen, your ingredients, your effort). ~7
minutes: open with "it's really just rent-vs-own," the trade-offs via the restaurant analogy, the
2–3 confusions (thinking "open source" means free-of-all-cost — running it still costs compute;
thinking open always means more private if you use someone else's hosting of it; thinking you must
choose one forever), close with "Rent for convenience, own for control. Most people start by
renting." Ground strictly in the sources; name Llama/Ollama honestly, assert no universal winner.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner. Teach closed/hosted vs open/open-weight models: where
each runs (their computers vs yours), the honest trade-offs (convenience and frontier capability vs
control, privacy, offline use and cost-at-scale), and who the beginner-recognisable names are
(hosted: the GPT/Claude/Gemini services; open: Llama run via Ollama). Use the restaurant-vs-home-
cooking analogy. Bust the common myths — "open source" isn't cost-free (you pay to run it), and
privacy depends on WHERE a model runs, not just whether it's open. Land on practical advice for a
beginner: almost everyone starts with hosted models because they're effortless; open weights matter
when control, data residency or cost-at-scale become real needs. Ground strictly in the sources.
```

## 🤝 The Automatos peek
Automatos doesn't force the choice: it can talk to hosted models (OpenAI, Anthropic, Google) with
your own key, and it can also point at open models. So "rent vs own" stays your decision per job,
not a lock-in — the platform is the neutral place where both live side by side.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

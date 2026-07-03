# AIX · Module 11 — MCP, for beginners

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"MCP keeps coming up — what is it, in normal words?"*

## 📥 Sources to load into NotebookLM
- The m09 lesson body (from the AIX track content / PRD)
- Model Context Protocol — the official site, intro sections only: https://modelcontextprotocol.io/ *(verify reachable)*
- `automatos-gitbook/tools/README.md` + `automatos-gitbook/tools/connecting-apps.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who's seen "MCP" and "tools" and "integrations" and glazed over. No technical
background. Explain plainly first, then name the term. Cover ONLY: what MCP is and why it exists,
without a scrap of code. Start from the need: an AI on its own can only talk; to be USEFUL it often
needs to reach real things — your calendar, your email, a spreadsheet, a company system. Historically
every AI-to-app connection was custom-built, a different plug for every socket — a mess. MCP (the
Model Context Protocol) is simply an AGREED STANDARD way for AIs to connect to tools and data — so
any AI that "speaks MCP" can plug into any tool that "speaks MCP," no custom wiring. The analogy that
does all the work: USB-C. Before USB-C, every device had its own charger and cable; USB-C is one
shape everything agreed on, so a single cable works across your laptop, phone and headphones. MCP is
USB-C for AI tools — one standard so the AI can plug into things. Why a beginner should care: it's
why modern AI can suddenly DO things (check your calendar, file a ticket) instead of just chatting —
and why that's getting easier and safer, because everyone's using the same well-understood plug. ~7
minutes: open with "AI that can only talk is limited; MCP is how it plugs into the real world," the
USB-C analogy throughout, one before/after example (a custom one-off connection vs a standard plug),
the 2–3 confusions (thinking MCP is an app you install — it's a standard, like a plug shape;
thinking it's only for programmers — you benefit without ever seeing it; thinking 'tool' means a
gadget — here it means any app or data the AI can use), close with "MCP is USB-C for AI: one standard
plug so your AI can reach your real tools." Ground strictly in the sources; no code, no invented
product names.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner, no code at all. Teach MCP by the need it fills: an AI is
just words until it can reach real tools and data (calendar, email, files, business systems); wiring
each connection by hand was chaos; MCP is an agreed standard so any MCP-speaking AI can plug into any
MCP-speaking tool. Ride the USB-C analogy the whole way — one shape everyone agreed on, so a single
cable works everywhere. Give the beginner the "why it matters to me": this standard is why AI is
shifting from chatting to DOING, and why connecting AI to your tools is getting simpler and safer.
Clear up the confusions — MCP is a standard not an app, you benefit without touching it, and "tool"
means any capability/app/data source the AI is allowed to use. Keep it concrete and calm. Ground
strictly in the sources.
```

## 🤝 The Automatos peek
When Automatos connects your agents to outside apps — a calendar, a store, a thousand other tools —
this standard plug idea is what's under the hood. You just pick the app and grant permission (the
docs' advice: start read-only, widen as you trust it); the platform handles the "plug." You now know
what the "MCP" and "tools" language actually means when you see it.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README

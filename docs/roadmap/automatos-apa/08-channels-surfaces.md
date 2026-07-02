# Automatos · Module 08 — Channels & surfaces: Slack/Telegram, the widget SDK, Shopify, IDE

**Type:** Free training (no exam)  ·  **Goal:** reach your agents from where you already are — chat
platforms, your website, your store, your editor — all routed through the same brain.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/tools/channels.md` — supported channels, setup, how channel messages route, credentials, monitoring
- `automatos-gitbook/chat/routing.md` — the "Channel routing" section (all channels use the same Universal Router)
- `automatos-gitbook/api-reference.md` — the Widgets (Embedded SDK) endpoint group
- Repos for grounding: `automatos-widget-sdk` (embeddable chat widget) · `automatos-shopify` (commerce surface) · `automatos-ide` (editor surface) · `automatos-skills/shopify/` (21 commerce skills)

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a new Automatos user who wants their agents reachable outside the Automatos chat page.
Teach channels + surfaces, grounded in the sources. This is a "connect a channel, embed the widget"
walkthrough.

Cover ONLY, in order:
1. The key idea: every surface uses the SAME Universal Router. A message from Telegram, Slack, the
   website widget, or the Automatos chat page all go through the same multi-tier routing (cache →
   rules → semantic → LLM), so agents respond with the same tools, knowledge, and capabilities, and
   the reply goes back out the originating channel. Internally everything is a uniform RequestEnvelope.
2. Channels (tools/channels.md): the supported list and connection method — Telegram (bot token,
   easiest), Slack (OAuth app), WhatsApp (webhook), Discord (bot token), Microsoft Teams (app
   registration), Google Chat (service account), iMessage (local adapter), Matrix, Signal. Setup =
   Tools & Integrations → find the platform → authenticate → save; it then shows "Live" on the
   Activity Dashboard. Channel-specific formatting (Slack blocks, Telegram markdown) is automatic.
3. Monitoring channels: Activity → Dashboard "Channels Live" card, Activity → Feed for messages
   flowing in, Analytics → Tools for usage. Credentials live in Settings → Credentials (view status,
   rotate, test).
4. The widget SDK (api-reference Widgets group + the widget-sdk repo): an embeddable, Shadow-DOM-
   isolated chat widget you drop on any website with a public API key — a script tag or the React/
   Next package. It talks to the /api/widgets/chat SSE endpoint (plus widget document + memory
   endpoints). Frame it as "put an Automatos agent on your own site."
5. Other surfaces (brief, grounding repos): Shopify — a commerce surface with storefront and admin
   agents (the 21 shopify skills: support, product expert, merchandiser, order triage, inventory,
   pricing…); and an IDE surface for the editor. Mention these exist as first-party surfaces; keep it
   short.

~8 minutes: open with "same brain, many front doors," connect Telegram on screen, show the widget
embed snippet, and close with the surfaces map (channels, widget, Shopify, IDE). Stay strictly in the
sources; do not invent channels, endpoints, or SDK options.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching a user to extend their agents beyond the Automatos UI. Go deep on:
connecting a channel end to end (Telegram bot token is the easiest starting point), the connection
methods per platform, and the crucial point that ALL channels share the Universal Router so behaviour
is consistent everywhere; automatic per-platform formatting; and monitoring (Channels Live card, Feed,
Analytics → Tools) plus credential rotation in Settings. Then the widget SDK: what "Shadow-DOM
isolated, zero-dependency, ~9KB" means for embedding on any site, the script-tag vs React install, and
the /api/widgets/* endpoints (chat SSE, documents, memory). Close with the other first-party surfaces
— Shopify (storefront + admin commerce agents, the shopify skills) and the IDE — as places the same
agents show up. Ground strictly in tools/channels.md, chat/routing.md's channel section, the Widgets
API group, and the widget-sdk/shopify/ide repos.
```

## 🛠 Try it now (on the free platform)
Reach your agents from your phone:
1. **Create a Telegram bot** via @BotFather and copy the bot token.
2. **Tools & Integrations → search Telegram →** paste the token and save. Confirm it shows **"Live"**
   on the **Activity Dashboard** ("Channels Live" card).
3. Message your bot from the Telegram app — e.g. *"What did my agents do today?"* — and watch the reply
   come back. Check **Activity → Feed** to see the message flow through the same Router.
4. Bonus (website surface): grab the widget embed snippet from the `automatos-widget-sdk` quick start
   and drop it into any test HTML page with a public API key to see an Automatos agent on your own site.

## ✅ Do
- [ ] Load `tools/channels.md`, the channel section of `chat/routing.md`, the Widgets group of `api-reference.md` (+ the widget-sdk/shopify/ide repos)
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 connect-Telegram-and-chat-from-your-phone task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

# Automatos · Module 08 — Channels & surfaces: Slack/Telegram, the widget SDK, Shopify, IDE

**Type:** Free training (no exam)  ·  **Goal:** reach your agents from where you already are — chat
platforms, your website, your store, your editor — all routed through the same brain. The headline:
**the widget turns any site into an AI-driven site** — the agent is the brain, the surface is just
the front door; Shopify is the flagship worked instance of that pattern, not a special case.

## 📥 Sources to load into NotebookLM
- `automatos-gitbook/tools/channels.md` — supported channels, setup, how channel messages route, credentials, monitoring
- `automatos-gitbook/chat/routing.md` — the "Channel routing" section (all channels use the same Universal Router)
- `automatos-gitbook/api-reference.md` — the Widgets (Embedded SDK) endpoint group *(the gitbook's only widget coverage — the SDK repo's `docs/EMBEDDING.md` is the canonical how-to)*
- `automatos-widget-sdk/README.md` + `automatos-widget-sdk/docs/EMBEDDING.md` — the universal-surface story: @automatos/core (auth + SSE contract), chat-widget (~8KB Shadow-DOM, zero deps), blog-widget, loader (CDN `widgets.automatos.app/v0`), React wrapper
- `automatos-shopify/docs/ARCHITECTURE.md` — the two flows: Flow W (storefront widget conversation) and Flow E (embedded admin via App Bridge) — both reach the SAME orchestrator agent runtime
- `automatos-shopify/docs/SHOPIFY/SHOPIFY-WIDGET-AGENTS.md` — the scoped agent instances (storefront + admin children of Operations Manager)
- Repos for grounding: `automatos-ide` (editor surface) · `automatos-skills/shopify/` (21 commerce skills)

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
4. The widget SDK (EMBEDDING.md + the api-reference Widgets group): an embeddable, Shadow-DOM-
   isolated chat widget you drop on any website with an origin-allow-listed public key (ak_pub_*) —
   a script tag from the CDN or the React package. Auth handshake then the /api/widgets/chat SSE
   stream, backed by an agent in YOUR workspace. Frame it BIG: "turn any site into an AI-driven
   site" — Shopify themes, static HTML, React/Next, WordPress, Webflow, all the same pattern. Name
   the live proof the learner has already touched: the Academy's own tutor is exactly this — an
   Automatos workspace agent embedded via the widget contract. Mention proactive engagement
   (time-on-page / scroll / exit-intent / idle triggers) as the widget acting first.
5. Shopify — the flagship worked instance of the same pattern (ARCHITECTURE.md +
   SHOPIFY-WIDGET-AGENTS.md): one parent Operations Manager agent with scoped children on BOTH
   sides of the store — storefront-facing via the widget (Support Agent, Product Expert,
   Merchandiser; Flow W) and back-office via Shopify Admin/App Bridge (Business Analyst daily
   brief, Inventory Watchdog; Flow E) — same orchestrator runtime, same workspace knowledge, same
   commerce toolset, differing only in auth tier. Say what's real plainly: storefront widget chat
   runs on a live production store today, with proactive engagement; the multi-agent seeding and
   admin agents are the documented architecture, in development. Then the IDE surface in one line.

~8 minutes: open with "same brain, many front doors — and the widget makes ANY site one of them,"
connect Telegram on screen, show the widget embed snippet, tell the Shopify two-sided-store story,
and close with the surfaces map (channels, widget→any site, Shopify, IDE). Stay strictly in the
sources; do not invent channels, endpoints, or SDK options; keep the live-vs-in-development line
exactly where the sources put it.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, practical, teaching a user to extend their agents beyond the Automatos UI. Go deep on:
connecting a channel end to end (Telegram bot token is the easiest starting point), the connection
methods per platform, and the crucial point that ALL channels share the Universal Router so behaviour
is consistent everywhere; automatic per-platform formatting; and monitoring (Channels Live card, Feed,
Analytics → Tools) plus credential rotation in Settings. Then the widget SDK as the universal surface:
what "Shadow-DOM isolated, zero-dependency, ~8KB" means for embedding on any site, the public-key →
JWT → SSE contract, script-tag vs React install, proactive engagement triggers — landing "any site
becomes an AI-driven site," with the Academy tutor named as the live production example. Then the
Shopify deep-cut: the two-sided store — one parent Operations Manager, storefront children reaching
shoppers through the widget (Flow W), admin children reaching the merchant through App Bridge
(Flow E), one shared brain — and why that beats bolt-on store bots (shared knowledge, shared
guardrails, one activity log); be precise that storefront chat is live on a production store while
admin agents/seeding are the in-development half of the documented architecture. Close with the IDE
surface in a sentence. Ground strictly in tools/channels.md, chat/routing.md's channel section, the
Widgets API group, EMBEDDING.md, and automatos-shopify's ARCHITECTURE.md + SHOPIFY-WIDGET-AGENTS.md.
```

## 🛠 Try it now (on the free platform)
Reach your agents from your phone:
1. **Create a Telegram bot** via @BotFather and copy the bot token.
2. **Tools & Integrations → search Telegram →** paste the token and save. Confirm it shows **"Live"**
   on the **Activity Dashboard** ("Channels Live" card).
3. Message your bot from the Telegram app — e.g. *"What did my agents do today?"* — and watch the reply
   come back. Check **Activity → Feed** to see the message flow through the same Router.
4. Bonus (website surface): grab the widget embed snippet from `automatos-widget-sdk/docs/EMBEDDING.md`
   and drop it into any test HTML page with a public API key to see an Automatos agent on your own site.
   (You've been using this pattern all along — the Academy tutor in the corner of this site is an
   Automatos workspace agent on the widget contract. Now it's yours to put anywhere.)

## ✅ Do
- [ ] Load `tools/channels.md`, the channel section of `chat/routing.md`, the Widgets group of `api-reference.md` (+ the widget-sdk/shopify/ide repos)
- [ ] Generate the Video (tune to ~8 min)
- [ ] Generate the Deep Dive audio
- [ ] Complete the 🛠 connect-Telegram-and-chat-from-your-phone task
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README

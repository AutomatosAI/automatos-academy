// Academy tutor — a streaming study tutor wired to the Automatos platform.
//
// One engine, two surfaces:
//   • a docked corner panel (FAB) on every page — quick questions
//   • a full study page (#/tutor) — expanded, with study actions + diagrams
//
// It talks to the SAME backend as the Automatos chat SDK
// (POST {apiBase}/api/widgets/chat, public key in Authorization, SSE stream),
// pointed at the Academy workspace's own agent. Rendering is custom so the
// tutor can draw flows/charts: markdown + Mermaid (lazy-loaded from CDN).
//
// Config: window.ACADEMY_CHAT = { publicKey, agentId, apiBase } (see
// chat-config.js, hydrated from env at container start). With no publicKey the
// tutor shows a friendly "coming online" state — the Academy runs fine before
// the workspace is connected.
import { el, clear } from "./ui.js";
import { loadCatalog } from "./content.js";
import { attachContext, consentCard, consentStrip, onContextChange, refreshOffer } from "./tutor-context.js";

const cfg = () => window.ACADEMY_CHAT || {};
const apiBase = () => (cfg().apiBase || "https://api.automatos.app").replace(/\/$/, "");
const enabled = () => !!cfg().publicKey;
const mood = () => (document.documentElement.getAttribute("data-mood") === "night" ? "night" : "mist");

// ── study-action chips: derived from the current route's track ───────────
// On a /t/:vendor/:track route the chips speak that track's language (exam
// blueprint vs hands-on modules vs plain-English operator lane); everywhere
// else they fall back to catalog-neutral study actions (PRD-TUTOR-LIVE §4.3).
const NEUTRAL_PROMPTS = [
  "Which Academy track fits my goals? Ask me a few questions first.",
  "Explain how an AI agent works — and draw the loop as a flowchart.",
  "Quiz me on the track I'm studying — 3 questions, one at a time.",
  "What does each Academy track cover, in one line each?",
  "Help me plan this week's study.",
];

function routeTrackRef() {
  const m = (location.hash || "").match(/^#\/t\/([^/]+)\/([^/]+)/);
  return m ? { vendorId: decodeURIComponent(m[1]), trackId: decodeURIComponent(m[2]) } : null;
}

async function currentTrack() {
  const ref = routeTrackRef();
  if (!ref) return null;
  try {
    const cat = await loadCatalog();
    const v = (cat.vendors || []).find((x) => x.id === ref.vendorId);
    const t = v && (v.tracks || []).find((x) => x.trackId === ref.trackId && x.status === "live");
    return t || null;
  } catch (_) { return null; }
}

function promptsForTrack(t) {
  if (!t) return NEUTRAL_PROMPTS;
  const ref = t.code || t.name;
  if (t.lane === "operator" || t.lane === "foundations") {
    return [
      `Explain a key ${t.name} idea in plain English — no jargon.`,
      "How would I use this in my own business? Give a real example.",
      `Quiz me gently on ${t.name} — one question at a time.`,
      `What should I study next in ${t.name}?`,
    ];
  }
  if (t.exam && t.exam.questionCount) {
    return [
      `What does the ${ref} exam cover? Summarise the blueprint.`,
      `Quiz me with 3 ${ref} questions — one at a time, then mark them.`,
      `Explain the trickiest ${ref} topic — and draw it as a flowchart.`,
      `Give me a ${ref} scenario and grade my answer.`,
    ];
  }
  return [
    `What does the ${t.name} track cover?`,
    `Quiz me with 3 questions from ${t.name}.`,
    `Explain a core ${t.name} concept — and draw it as a flowchart.`,
    `Set me a hands-on exercise from ${t.name}.`,
  ];
}

// ── shared session (history persists across docked ⇆ full surfaces) ──────
const session = { messages: [], conversationId: null, busy: false };
let uid = 0;

// Docked-panel handles, populated by mountTutor(), so askTutor() can drive the
// same panel + send path from anywhere (e.g. a "why?" deep-link on a revealed
// question). Kept in module scope rather than closed over so the deep-link and
// the FAB share one panel.
const dock = { list: null, setOpen: null, fab: null };

// ── minimal markdown → HTML, with ```mermaid fences pulled out ───────────
// XSS-safe by construction: every text path runs through esc() FIRST, then we
// add only a fixed tag whitelist (code/strong/em/a/h*/li/ul/ol/blockquote/p/pre)
// and http(s)-only hrefs — no raw model HTML ever reaches innerHTML, and code
// + mermaid source are escaped or set via textContent. Mermaid itself runs with
// securityLevel:"strict". If richer HTML is ever needed, swap in DOMPurify.
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function renderMarkdown(md) {
  const mermaids = [];
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  let html = "", i = 0, list = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      closeList();
      const lang = (fence[1] || "").toLowerCase();
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // closing fence
      const code = buf.join("\n");
      if (lang === "mermaid") {
        const id = "mmd-" + (++uid);
        mermaids.push({ id, code });
        html += `<div class="tut-mermaid" id="${id}"></div>`;
      } else {
        html += `<pre class="tut-code"><code>${esc(code)}</code></pre>`;
      }
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { closeList(); html += `<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`; i++; continue; }
    if (/^\s*[-*]\s+/.test(line)) { if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; } html += `<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`; i++; continue; }
    if (/^\s*\d+\.\s+/.test(line)) { if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; } html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`; i++; continue; }
    if (/^\s*>\s?/.test(line)) { closeList(); html += `<blockquote>${inline(line.replace(/^\s*>\s?/, ""))}</blockquote>`; i++; continue; }
    if (!line.trim()) { closeList(); i++; continue; }
    closeList(); html += `<p>${inline(line)}</p>`; i++;
  }
  closeList();
  return { html, mermaids };
}

// ── Mermaid (lazy CDN import; renders flows/charts the tutor emits) ──────
let mermaidPromise = null;
function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
      .then((m) => {
        const mer = m.default;
        mer.initialize({ startOnLoad: false, securityLevel: "strict", theme: mood() === "night" ? "dark" : "neutral", fontFamily: "Funnel Sans, system-ui, sans-serif" });
        return mer;
      });
  }
  return mermaidPromise;
}
async function drawMermaid(container, blocks) {
  if (!blocks || !blocks.length) return;
  blocks.forEach((b) => { const n = container.querySelector("#" + b.id); if (n) n.textContent = b.code; });
  try {
    const mer = await getMermaid();
    await mer.run({ nodes: blocks.map((b) => container.querySelector("#" + b.id)).filter(Boolean) });
  } catch (_) {
    // mermaid unavailable / parse error — show the source so nothing is lost
    blocks.forEach((b) => { const n = container.querySelector("#" + b.id); if (n && !n.firstChild) { n.className = "tut-code"; n.textContent = b.code; } });
  }
}

// ── streaming engine (mirrors @automatos/core's /api/widgets/chat contract) ──
// Failures are TYPED, not worded, so the send path can render truthful state
// rows (PRD-TUTOR-LIVE §4.3). Kinds: "offline" (navigator.onLine === false —
// the ONLY case that blames the learner's connection) · "unreachable" (fetch
// rejected: platform down, CORS preflight refused, DNS…) · "auth" (401/403) ·
// "http" (other non-OK status) · "agent" (server-sent error event) ·
// "stream" (connection dropped mid-answer).
async function streamChat(text, { onChunk, onDone, onError, onAccepted }) {
  const c = cfg();
  let res;
  try {
    res = await fetch(`${apiBase()}/api/widgets/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.publicKey}` },
      body: JSON.stringify({ message: text, conversation_id: session.conversationId || undefined, agent_id: c.agentId || undefined }),
    });
  } catch (e) { onError({ kind: navigator.onLine === false ? "offline" : "unreachable" }); return; }
  if (!res.ok || !res.body) { onError(res.status === 401 || res.status === 403 ? { kind: "auth", status: res.status } : { kind: "http", status: res.status }); return; }
  if (onAccepted) onAccepted(); // the platform took the request — any learner_context has landed
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n"); buf = parts.pop() || "";
      for (const part of parts) {
        if (!part.trim()) continue;
        let ev = "message", data = null;
        for (const ln of part.split("\n")) {
          if (ln.startsWith("event:")) ev = ln.slice(6).trim();
          else if (ln.startsWith("data:")) { const raw = ln.slice(5).trim(); if (raw) { try { data = JSON.parse(raw); } catch { data = { content: raw }; } } }
        }
        if (!data) continue;
        if (ev === "message") onChunk(String(data.content || ""));
        else if (ev === "done") session.conversationId = data.conversation_id || session.conversationId;
        else if (ev === "error") { onError({ kind: "agent", message: data.message }); return; }
      }
    }
    onDone();
  } catch (e) { onError({ kind: "stream" }); }
}

// Truthful copy per failure kind. Only "offline" ever mentions the learner's
// connection — everything else owns the fault ("on our side, not yours").
function failureCopy(f) {
  if (f.kind === "offline") return "You're offline — the tutor needs an internet connection. Reconnect, then retry.";
  if (f.kind === "unreachable") return "The Academy tutor can't be reached right now — this is on our side, not yours.";
  if (f.kind === "auth") return "The tutor's link to the Academy workspace isn't accepting its key right now — a configuration problem on our side, not your account. Please try again later.";
  if (f.kind === "http") return `The tutor hit an error on our side (HTTP ${f.status}). A retry usually clears it.`;
  if (f.kind === "agent") return "The tutor reported a problem" + (f.message ? `: ${f.message}` : ".");
  return "The answer was cut off — the connection to the tutor dropped mid-stream.";
}

// ── message list rendering (re-rendered into whichever surface is active) ──
function bubble(msg) {
  const b = el("div", { class: "tut-msg " + (msg.role === "user" ? "is-user" : "is-bot") });
  const body = el("div", { class: "tut-body" });
  if (msg.role === "user" || !msg.done) {
    body.textContent = msg.text || (msg.role === "assistant" ? "" : "");
    if (msg.role === "assistant" && !msg.text) body.appendChild(el("span", { class: "tut-typing" }, [el("i"), el("i"), el("i")]));
  } else {
    const { html, mermaids } = renderMarkdown(msg.text);
    body.innerHTML = html;
    drawMermaid(body, mermaids);
  }
  b.appendChild(body);
  return { b, body };
}

// Failure state row — a distinct system row (role: "status"), never a fake
// assistant bubble. The optional action ("Retry"/"Continue") removes the row
// and re-enters the send path against the surface it was clicked in.
function statusRow(msg, listEl) {
  const row = el("div", { class: "tut-status", role: "status" }, [
    el("span", { class: "tut-status-text", text: msg.text }),
  ]);
  if (msg.action) {
    row.appendChild(el("button", {
      class: "tut-retry", type: "button", text: msg.action.label,
      onclick: () => {
        if (session.busy) return;
        const i = session.messages.indexOf(msg);
        if (i >= 0) session.messages.splice(i, 1);
        msg.action.run(listEl);
      },
    }));
  }
  return row;
}

function renderList(listEl) {
  clear(listEl);
  // D-T1(c) ask-once consent card — first thing in the list while the choice
  // is unmade (deep-link opens included); null once answered or ineligible.
  const card = consentCard();
  if (card) listEl.appendChild(card);
  if (!session.messages.length) {
    listEl.appendChild(el("div", { class: "tut-empty" }, [
      el("p", { class: "tut-empty-title", text: "Your Academy tutor." }),
      el("p", { class: "muted", style: { marginTop: "6px", fontSize: "13.5px" }, text: enabled() ? "Ask about any Academy track — I can explain, quiz you, grade your reasoning, and draw the flows." : "The tutor comes online once the Academy workspace is connected." }),
    ]));
    return null;
  }
  let lastBody = null;
  for (const m of session.messages) {
    if (m.role === "status") { listEl.appendChild(statusRow(m, listEl)); continue; }
    const { b, body } = bubble(m); listEl.appendChild(b); lastBody = body;
  }
  listEl.scrollTop = listEl.scrollHeight;
  return lastBody;
}

// ── send flow (shared by both surfaces) ──────────────────────────────────
// Quiet FAB health signal: marked down after a failed send, cleared by a
// successful one. Send results are the only probe — no polling (§4.3).
function setHealth(ok) { if (dock.fab) dock.fab.setAttribute("data-health", ok ? "ok" : "down"); }

function send(text, listEl) {
  text = (text || "").trim();
  if (!text || session.busy) return;
  if (!enabled()) { return; }
  session.messages.push({ role: "user", text, done: true });
  stream(text, listEl);
}

// Stream the assistant reply to `text` (already in the transcript). Retry
// re-enters here with the same text, so retried sends never duplicate the
// learner's bubble — and re-decides the context attach, so a send the
// platform never accepted retries WITH its learner_context.
function stream(text, listEl) {
  session.busy = true; // set before the async attach — no double-send window
  const bot = { role: "assistant", text: "", done: false };
  session.messages.push(bot);
  let body = renderList(listEl);
  const repaint = () => { body = renderList(listEl); };
  // Consented learner context (PRD-TUTOR-LIVE §4.4/S3): the WIRE message may
  // carry a learner_context preamble; the transcript bubble never does. This
  // is the single attach point, so every send path — chips, input, retry,
  // askTutor() deep links — honours consent by construction. attachContext
  // never rejects and never stalls (bounded build; plain text on any failure).
  attachContext(text).catch(() => ({ wire: text, ctx: null, accepted: null })).then(({ wire, ctx, accepted }) => {
    // D-T4: context-presence ride-along on the existing event — counts only,
    // and only when the feature is offered (signed-out events stay identical)
    import("./analytics.js").then((a) => a.track("tutor_message", ctx ? { ctx } : {})).catch(() => {});
    streamChat(wire, {
      onAccepted: accepted || undefined,
      onChunk: (c) => { bot.text += c; if (body) { body.textContent = bot.text; listEl.scrollTop = listEl.scrollHeight; } },
      onDone: () => { bot.done = true; session.busy = false; setHealth(true); repaint(); },
      onError: (f) => {
        session.busy = false;
        setHealth(false);
        import("./analytics.js").then((a) => a.track("tutor_error", { kind: f.kind, status: f.status })).catch(() => {});
        if (bot.text) {
          // mid-answer failure — keep the partial text, offer to continue
          bot.done = true;
          session.messages.push({ role: "status", text: failureCopy(f), action: { label: "Continue", run: (le) => send("Continue from where you stopped.", le) } });
        } else {
          session.messages.pop(); // drop the empty typing bubble — no fake reply
          const retry = { label: "Retry", run: (le) => stream(text, le) };
          session.messages.push({ role: "status", text: failureCopy(f), action: f.kind === "auth" ? null : retry });
        }
        repaint();
      },
    });
  });
}

function inputRow(listEl, big) {
  const ta = el("textarea", { class: "tut-input", rows: big ? "2" : "1", placeholder: enabled() ? "Ask the tutor…" : "Tutor connecting soon…", "aria-label": "Message the tutor" });
  if (!enabled()) ta.disabled = true;
  const fire = () => { send(ta.value, listEl); ta.value = ""; ta.style.height = "auto"; };
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fire(); } });
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, big ? 160 : 96) + "px"; });
  const btn = el("button", { class: "tut-send", type: "button", "aria-label": "Send", onclick: fire, html: "&#8593;" });
  return el("div", { class: "tut-inputrow" }, [ta, btn]);
}

function chips(listEl) {
  const box = el("div", { class: "tut-chips" });
  fillChips(box, listEl);
  return box;
}

// (Re)compute the chips for the current route. Neutral prompts paint first
// (sync), then swap to track-specific ones when the catalog lookup lands —
// so the panel never waits on a fetch and a failed lookup costs nothing.
function fillChips(box, listEl) {
  const paint = (prompts) => {
    clear(box);
    for (const p of prompts) box.appendChild(el("button", { class: "tut-chip", type: "button", onclick: () => send(p, listEl) }, [p]));
  };
  paint(promptsForTrack(null));
  currentTrack().then((t) => { if (t) paint(promptsForTrack(t)); }).catch(() => {});
}

// ── full study page (#/tutor) ────────────────────────────────────────────
export function tutorPageView() {
  const list = el("div", { class: "tut-list tut-list-page" });
  const page = el("div", {}, [
    el("section", { class: "section" }, [el("div", { class: "wrap tut-page" }, [
      el("div", { class: "tut-page-head" }, [
        el("span", { class: "mono-label", text: "Academy tutor · powered by Automatos" }),
        el("h1", { class: "serif", style: { fontSize: "clamp(28px,4vw,44px)", marginTop: "8px" }, text: "Study with the tutor" }),
        el("p", { class: "lede muted", style: { maxWidth: "60ch", marginTop: "10px" }, text: "Grounded in every live Academy track — the lessons, the official docs, and each track's exam blueprint where it has one. Ask it to explain, quiz you, grade your reasoning, or draw a flow." }),
        el("p", { class: "mono-label", style: { marginTop: "12px" } }, [
          "Dogfood, live: this tutor is an ",
          el("a", { href: "https://automatos.app", target: "_blank", rel: "noopener", style: { color: "var(--accent)" }, text: "Automatos" }),
          " workspace agent — the same thing you can build there in an afternoon.",
        ]),
      ]),
      el("div", { class: "tut-page-grid" }, [
        el("aside", { class: "tut-aside" }, [
          consentStrip(),
          el("span", { class: "mono-label", text: "Try" }),
          chips(list),
        ]),
        el("div", { class: "tut-page-main" }, [list, inputRow(list, true)]),
      ]),
    ])]),
  ]);
  // defer initial render until mounted; consent/offer changes repaint this
  // surface's list (the strip syncs itself) until the view unmounts
  setTimeout(() => renderList(list), 0);
  onContextChange(list, () => renderList(list));
  refreshOffer();
  return page;
}

// ── docked corner panel + FAB (mounted once, global) ─────────────────────
export function mountTutor() {
  if (window.__academyTutor) return;
  window.__academyTutor = true;

  const list = el("div", { class: "tut-list" });
  const chipBox = chips(list);
  const panel = el("div", { class: "tut-panel", "data-open": "false", role: "dialog", "aria-label": "Academy tutor" }, [
    el("div", { class: "tut-head" }, [
      el("span", { class: "tut-title", text: "Tutor" }),
      el("span", { class: "mono-label tut-dogfood", text: "an Automatos agent, live" }),
      el("div", { class: "tut-head-actions" }, [
        el("button", { class: "tut-icon", type: "button", title: "Open full study mode", "aria-label": "Expand to full study page", html: "&#10530;", onclick: () => { setOpen(false); location.hash = "#/tutor"; } }),
        el("button", { class: "tut-icon", type: "button", title: "Close", "aria-label": "Close tutor", html: "&times;", onclick: () => setOpen(false) }),
      ]),
    ]),
    consentStrip(), // S3 — "let the tutor see my progress"; hidden until offered
    list,
    chipBox,
    inputRow(list, false),
  ]);
  const fab = el("button", { class: "tut-fab", type: "button", "aria-label": "Open the Academy tutor", html: "&#9632;" });
  const setOpen = (open) => {
    panel.setAttribute("data-open", open ? "true" : "false");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { refreshOffer(); renderList(list); fillChips(chipBox, list); const ta = panel.querySelector(".tut-input"); if (ta && !ta.disabled) setTimeout(() => ta.focus(), 60); }
  };
  fab.addEventListener("click", () => setOpen(panel.getAttribute("data-open") !== "true"));
  document.body.appendChild(panel);
  document.body.appendChild(fab);

  // expose the docked panel to askTutor() (deep-links, "explain this" buttons)
  dock.list = list;
  dock.setOpen = setOpen;
  dock.fab = fab;

  // S3: consent/offer changes repaint the open panel (card appears/retires);
  // the boot-time refreshOffer arms the auth watch, so signing in mid-session
  // surfaces the toggle without a reload. Signed out both are inert.
  onContextChange(list, () => { if (panel.getAttribute("data-open") === "true") renderList(list); });
  refreshOffer();

  // re-theme mermaid on mood flip (next render picks up the new theme)
  new MutationObserver(() => { mermaidPromise = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-mood"] });
}

// ── deep-link hook: open the docked tutor and send a message ──────────────
// Used by the "Ask the tutor why →" buttons on revealed questions. Opens the
// corner panel and pushes `text` through the existing send() path, so the ask
// shares the same session/history as the FAB. If the tutor is disabled (no
// publicKey) the panel still opens on its "coming online" state — send() is a
// no-op there — so the button explains itself rather than erroring. Mounts the
// panel on demand if it isn't up yet.
export function askTutor(text) {
  text = (text || "").trim();
  if (!dock.setOpen) mountTutor();
  if (!dock.setOpen || !dock.list) return;   // DOM not ready (e.g. no document)
  dock.setOpen(true);
  if (text) send(text, dock.list);
}

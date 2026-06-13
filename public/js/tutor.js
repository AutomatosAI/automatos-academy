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

const cfg = () => window.ACADEMY_CHAT || {};
const apiBase = () => (cfg().apiBase || "https://api.automatos.app").replace(/\/$/, "");
const enabled = () => !!cfg().publicKey;
const mood = () => (document.documentElement.getAttribute("data-mood") === "pitch" ? "pitch" : "bone");

const STUDY_PROMPTS = [
  "Explain the agentic loop — and draw it as a flowchart.",
  "Quiz me with 3 questions on Agentic Architecture (D1).",
  "Draw the Agent → Session relationship in Managed Agents.",
  "Why use tool_choice: \"any\"? Give a worked example.",
  "Diagram how prompt caching's prefix match works.",
  "What does the exam cover? Summarise the blueprint.",
];

// ── shared session (history persists across docked ⇆ full surfaces) ──────
const session = { messages: [], conversationId: null, busy: false };
let uid = 0;

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
        mer.initialize({ startOnLoad: false, securityLevel: "strict", theme: mood() === "pitch" ? "dark" : "neutral", fontFamily: "Geist, system-ui, sans-serif" });
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
async function streamChat(text, { onChunk, onDone, onError }) {
  const c = cfg();
  let res;
  try {
    res = await fetch(`${apiBase()}/api/widgets/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.publicKey}` },
      body: JSON.stringify({ message: text, conversation_id: session.conversationId || undefined, agent_id: c.agentId || undefined }),
    });
  } catch (e) { onError(new Error("Network error — check your connection.")); return; }
  if (!res.ok || !res.body) { onError(new Error(res.status === 401 || res.status === 403 ? "Tutor auth failed (check the workspace key)." : `Tutor error (${res.status}).`)); return; }
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
        else if (ev === "error") { onError(new Error(data.message || "Tutor error.")); return; }
      }
    }
    onDone();
  } catch (e) { onError(new Error("Stream interrupted.")); }
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

function renderList(listEl) {
  clear(listEl);
  if (!session.messages.length) {
    listEl.appendChild(el("div", { class: "tut-empty" }, [
      el("p", { class: "serif-i", style: { fontSize: "20px" }, text: "Your Academy tutor." }),
      el("p", { class: "muted", style: { marginTop: "6px", fontSize: "13.5px" }, text: enabled() ? "Ask anything about the exam or about Claude. I can explain, quiz you, grade your reasoning, and draw the flows." : "The tutor comes online once the Academy workspace is connected." }),
    ]));
    return null;
  }
  let lastBody = null;
  for (const m of session.messages) { const { b, body } = bubble(m); listEl.appendChild(b); lastBody = body; }
  listEl.scrollTop = listEl.scrollHeight;
  return lastBody;
}

// ── send flow (shared by both surfaces) ──────────────────────────────────
function send(text, listEl) {
  text = (text || "").trim();
  if (!text || session.busy) return;
  if (!enabled()) { return; }
  session.busy = true;
  session.messages.push({ role: "user", text, done: true });
  const bot = { role: "assistant", text: "", done: false };
  session.messages.push(bot);
  let body = renderList(listEl);
  const repaint = () => { body = renderList(listEl); };
  streamChat(text, {
    onChunk: (c) => { bot.text += c; if (body) { body.textContent = bot.text; listEl.scrollTop = listEl.scrollHeight; } },
    onDone: () => { bot.done = true; session.busy = false; repaint(); },
    onError: (e) => { bot.text = "⚠ " + e.message; bot.done = true; session.busy = false; repaint(); },
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
  return el("div", { class: "tut-chips" }, STUDY_PROMPTS.map((p) =>
    el("button", { class: "tut-chip", type: "button", onclick: () => send(p, listEl) }, [p])));
}

// ── full study page (#/tutor) ────────────────────────────────────────────
export function tutorPageView() {
  const list = el("div", { class: "tut-list tut-list-page" });
  const page = el("div", {}, [
    el("section", { class: "section" }, [el("div", { class: "wrap tut-page" }, [
      el("div", { class: "tut-page-head" }, [
        el("span", { class: "mono-label", text: "Academy tutor · powered by Automatos" }),
        el("h1", { class: "serif", style: { fontSize: "clamp(28px,4vw,44px)", marginTop: "8px" }, text: "Study with the tutor" }),
        el("p", { class: "lede muted", style: { maxWidth: "60ch", marginTop: "10px" }, text: "Grounded in everything Claude — the docs, the SDKs, MCP, and the exam blueprint. Ask it to explain, quiz you, grade your reasoning, or draw a flow." }),
      ]),
      el("div", { class: "tut-page-grid" }, [
        el("aside", { class: "tut-aside" }, [
          el("span", { class: "mono-label", text: "Try" }),
          chips(list),
        ]),
        el("div", { class: "tut-page-main" }, [list, inputRow(list, true)]),
      ]),
    ])]),
  ]);
  // defer initial render until mounted
  setTimeout(() => renderList(list), 0);
  return page;
}

// ── docked corner panel + FAB (mounted once, global) ─────────────────────
export function mountTutor() {
  if (window.__academyTutor) return;
  window.__academyTutor = true;

  const list = el("div", { class: "tut-list" });
  const panel = el("div", { class: "tut-panel", "data-open": "false", role: "dialog", "aria-label": "Academy tutor" }, [
    el("div", { class: "tut-head" }, [
      el("span", { class: "tut-title", text: "Tutor" }),
      el("div", { class: "tut-head-actions" }, [
        el("button", { class: "tut-icon", type: "button", title: "Open full study mode", "aria-label": "Expand to full study page", html: "&#10530;", onclick: () => { setOpen(false); location.hash = "#/tutor"; } }),
        el("button", { class: "tut-icon", type: "button", title: "Close", "aria-label": "Close tutor", html: "&times;", onclick: () => setOpen(false) }),
      ]),
    ]),
    list,
    chips(list),
    inputRow(list, false),
  ]);
  const fab = el("button", { class: "tut-fab", type: "button", "aria-label": "Open the Academy tutor", html: "&#9632;" });
  const setOpen = (open) => {
    panel.setAttribute("data-open", open ? "true" : "false");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { renderList(list); const ta = panel.querySelector(".tut-input"); if (ta && !ta.disabled) setTimeout(() => ta.focus(), 60); }
  };
  fab.addEventListener("click", () => setOpen(panel.getAttribute("data-open") !== "true"));
  document.body.appendChild(panel);
  document.body.appendChild(fab);

  // re-theme mermaid on mood flip (next render picks up the new theme)
  new MutationObserver(() => { mermaidPromise = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-mood"] });
}

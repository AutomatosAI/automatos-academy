// Minimal, dependency-free Markdown → HTML for authored lesson/explanation
// bodies AND Wire post bodies. Lessons are first-party (we author them), but
// Wire bodies arrive over the network from the ingest API (PRD-WIRE §7), so
// the render path is hardened for untrusted input: all text is HTML-escaped
// before inline formatting (no raw HTML, ever), link hrefs are
// attribute-escaped (quotes can't break out of href="…"), and URL schemes
// are allowlisted — http(s) plus in-app "#/…" hash links; anything else
// (javascript:, data:, …) renders as plain text, not a link.

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Attribute context needs quotes dead too (esc() has already handled & < >).
const attrEsc = (s) => String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Allowlist, checked against the RAW url text: absolute http(s), or an
// in-app hash route. Everything else is refused (the caller renders text).
const HREF_OK = /^(https?:\/\/|#)/i;

function link(text, url) {
  if (!HREF_OK.test(url)) return text;
  const external = /^https?:/i.test(url);
  return `<a href="${attrEsc(url)}"${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => link(t, u));
}

export function md(src) {
  if (!src) return "";
  const lines = String(src).replace(/\r\n/g, "\n").split("\n");
  let html = "", i = 0, inCode = false, codeBuf = [], list = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      if (!inCode) { inCode = true; codeBuf = []; }
      else { inCode = false; html += `<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`; }
      i++; continue;
    }
    if (inCode) { codeBuf.push(line); i++; continue; }
    if (/^\s*$/.test(line)) { closeList(); i++; continue; }
    let m;
    if ((m = line.match(/^(#{2,4})\s+(.*)/))) { closeList(); const lv = m[1].length; html += `<h${lv} id="${slug(m[2])}">${inline(m[2])}</h${lv}>`; i++; continue; }
    if ((m = line.match(/^>\s?(.*)/))) { closeList(); html += `<blockquote>${inline(m[1])}</blockquote>`; i++; continue; }
    if ((m = line.match(/^[-*]\s+(.*)/))) { if (list !== "ul") { closeList(); list = "ul"; html += "<ul>"; } html += `<li>${inline(m[1])}</li>`; i++; continue; }
    if ((m = line.match(/^\d+\.\s+(.*)/))) { if (list !== "ol") { closeList(); list = "ol"; html += "<ol>"; } html += `<li>${inline(m[1])}</li>`; i++; continue; }
    closeList();
    const para = [line]; i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{2,4}\s|>|[-*]\s|\d+\.\s|```)/.test(lines[i])) { para.push(lines[i]); i++; }
    html += `<p>${inline(para.join(" "))}</p>`;
  }
  closeList();
  return html;
}

// H2 headings → table of contents entries.
export function toc(src) {
  const out = [];
  String(src || "").split("\n").forEach((l) => {
    const m = l.match(/^##\s+(.*)/);
    if (m) out.push({ text: m[1], id: slug(m[1]) });
  });
  return out;
}

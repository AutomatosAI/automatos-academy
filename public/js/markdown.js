// Minimal, dependency-free Markdown → HTML for authored lesson/explanation
// bodies. Content is first-party (we author it), but we still HTML-escape
// before applying inline formatting so stray < > render correctly.

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
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
